"""
Ireland Pay CRM Synchronization Module

This module handles synchronization of data between Ireland Pay CRM API and our Supabase database.
It replaces the previous Excel upload functionality with automated API data fetching.

Enhanced with:
- Exponential backoff retries (tenacity)
- Circuit breaker pattern
- Error categorization (RetryableError vs FatalError)
- Request timeout handling
- Observability and logging
"""
import os
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, TypeVar, Callable
import tenacity
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, RetryError
from requests.exceptions import RequestException, Timeout, ConnectionError
from .supabase import createSupabaseServiceClient

# Set up logging
logger = logging.getLogger('irelandpay_crm_sync')
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# =========================================================================
# Resilient Ireland Pay CRM Sync Configuration
# =========================================================================
# These environment variables control the resilience features of the Ireland Pay CRM sync
# They can be adjusted based on the specific requirements and API stability

# Maximum number of retry attempts for failed operations
# - Increase for APIs with intermittent failures
# - Decrease for faster feedback in development
# Default: 3 (resulting in 1 initial attempt + 3 retries = 4 total attempts)
MAX_RETRIES = int(os.environ.get('IRELANDPAY_MAX_RETRIES', '3'))

# Base delay in milliseconds for exponential backoff
# - With default of 1000ms, retries will be delayed by approximately: 1s, 2s, 4s...
# - Increase for less aggressive retries or rate-limited APIs
# - Decrease for faster retries in development (but be cautious of rate limits)
# Default: 1000 (1 second)
BACKOFF_BASE_MS = int(os.environ.get('IRELANDPAY_BACKOFF_BASE_MS', '1000'))

# Timeout in seconds for HTTP requests
# - Increase for APIs with known slow response times
# - Decrease to fail faster when API is unresponsive
# - Should generally align with any gateway or load balancer timeouts
# Default: 30 seconds
TIMEOUT_SECONDS = int(os.environ.get('IRELANDPAY_TIMEOUT_SECONDS', '30'))

# Number of consecutive failures before opening the circuit breaker
# - Increase in high-traffic environments to prevent premature circuit opening
# - Decrease in critical systems to fail faster when API is unstable
# Default: 5 consecutive failures
CIRCUIT_MAX_FAILURES = int(os.environ.get('IRELANDPAY_CIRCUIT_MAX_FAILURES', '5'))

# Time in seconds after which to attempt to reset (close) the circuit
# - Increase for longer cool-down periods when API issues tend to persist
# - Decrease for faster recovery attempts in less critical systems
# Default: 60 seconds (1 minute)
CIRCUIT_RESET_SECONDS = int(os.environ.get('IRELANDPAY_CIRCUIT_RESET_SECONDS', '60'))

# Define custom error types for better error handling
class IrelandPayCRMError(Exception):
    """Base exception for Ireland Pay CRM errors.
    
    This serves as the parent class for more specific error types.
    """
    pass

class RetryableError(IrelandPayCRMError):
    """Exception for errors that should be retried.
    
    Use this for transient errors where a retry might succeed, such as:
    - Network connectivity issues
    - HTTP 5xx server errors
    - Gateway timeouts
    - Rate limiting (with appropriate backoff)
    
    The retry logic will automatically attempt to recover from these errors.
    """
    pass

class FatalError(IrelandPayCRMError):
    """Exception for errors that should not be retried.
    
    Use this for errors where retrying would not help, such as:
    - Authentication failures
    - HTTP 4xx client errors (invalid parameters, etc.)
    - Resource not found errors
    - Permission issues
    
    The system will fail fast for these errors without wasting retry attempts.
    """
    pass

# Import the client after error definitions to avoid circular imports
from .irelandpay_crm_client import IrelandPayCRMClient

# Type variable for generic function return type
T = TypeVar('T')

# Simple circuit breaker implementation
class CircuitBreaker:
    """Implements the Circuit Breaker pattern to prevent repeated calls to failing services.
    
    The Circuit Breaker pattern helps to prevent cascading failures and provides resilience
    when external services experience issues. This implementation:
    
    1. Tracks consecutive failures
    2. Opens circuit (fast-fails) after a configurable threshold
    3. Auto-resets after a configurable timeout period
    4. Provides logging for all state changes
    
    This is implemented as a singleton to maintain global state across API calls.
    """
    
    _instance = None  # Singleton instance
    _failures = 0  # Number of consecutive failures
    _is_open = False  # Circuit state (open = no calls allowed)
    _last_failure_time = None  # Time of last failure for reset timing
    
    @classmethod
    def getInstance(cls):
        """Get singleton instance of CircuitBreaker"""
        if cls._instance is None:
            cls._instance = CircuitBreaker()
        return cls._instance
    
    def record_failure(self):
        """Record a failure and open circuit if threshold reached.
        
        Call this method whenever an API call fails. Once the number of failures
        reaches CIRCUIT_MAX_FAILURES, the circuit will open and prevent further calls.
        """
        self._failures += 1
        self._last_failure_time = time.time()
        
        if self._failures >= CIRCUIT_MAX_FAILURES:
            if not self._is_open:
                self._is_open = True
                logger.warning(f"Circuit breaker opened after {CIRCUIT_MAX_FAILURES} failures")
    
    def record_success(self):
        """Reset failure count after a successful operation.
        
        Call this method after each successful API call to reset the failure counter.
        This prevents the circuit from opening unnecessarily due to occasional failures.
        """
        if self._failures > 0:
            logger.info(f"Circuit breaker failure count reset after success")
            self._failures = 0
    
    def is_open(self):
        """Check if circuit is open and should reset if timeout has passed."""
        if not self._is_open:
            return False
        
        # Check if enough time has passed to attempt reset
        if self._last_failure_time and (time.time() - self._last_failure_time) > CIRCUIT_RESET_SECONDS:
            logger.info("Circuit breaker attempting reset after timeout")
            self._is_open = False
            self._failures = 0
            return False
        
        return True
    
    @classmethod
    def execute(cls, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute a function with circuit breaker protection.
        
        This method wraps function calls with circuit breaker logic:
        1. Checks if circuit is open and fails fast if it is
        2. Executes the function
        3. Records success or failure
        4. Returns the result or raises the exception
        
        Args:
            func: The function to execute
            *args: Positional arguments to pass to func
            **kwargs: Keyword arguments to pass to func
            
        Returns:
            The result of func if successful
            
        Raises:
            The original exception if func fails
        """
        circuit = cls.getInstance()
        
        if circuit.is_open():
            raise RetryableError("Circuit breaker is open - service temporarily unavailable")
        
        try:
            result = func(*args, **kwargs)
            circuit.record_success()
            return result
        except Exception as e:
            # Don't count client errors (4xx) as circuit failures
            if not isinstance(e, FatalError):
                cls.record_failure()
            raise

class IrelandPayCRMSyncManager:
    """Manages synchronization between Ireland Pay CRM and the application database.
    
    This class handles the synchronization of merchants, residuals, and volumes data
    from Ireland Pay CRM to the Supabase database. It implements resilience patterns
    including retry with exponential backoff and circuit breaker to handle API
    instability gracefully.
    
    Key resilience features:
    - Exponential backoff retries: Automatically retries failed API calls with
      increasing delays between attempts (configured by IRELANDPAY_MAX_RETRIES and
      IRELANDPAY_BACKOFF_BASE_MS environment variables)
    - Circuit breaker: Prevents repeated calls to failing services and allows
      time for the service to recover (configured by IRELANDPAY_CIRCUIT_MAX_FAILURES and
      IRELANDPAY_CIRCUIT_RESET_SECONDS environment variables)
    - Error categorization: Distinguishes between retryable errors (network issues,
      server errors) and fatal errors (client errors, authentication)
    - Timeout handling: Aborts requests that take too long to complete (configured
      by IRELANDPAY_TIMEOUT_SECONDS environment variable)
    """
    
    def __init__(self):
        api_key = os.environ.get('IRELANDPAY_CRM_API_KEY')
        if not api_key:
            raise ValueError("IRELANDPAY_CRM_API_KEY environment variable not set")
        self.irelandpay_client = IrelandPayCRMClient(api_key)
        self.supabase = createSupabaseServiceClient()
        logger.info("Ireland Pay CRM Sync Manager initialized")
    
    def _execute_with_resilience(self, operation_func, *args, **kwargs):
        """Execute an operation with retry and circuit breaker patterns.
        
        This method wraps operations (API calls, database operations) with resilience
        patterns to handle failures gracefully:
        
        1. Checks if the circuit breaker is open and fails fast if it is
        2. Uses tenacity library for exponential backoff retries
        3. Categorizes errors into retryable and fatal
        4. Updates circuit breaker state based on successes and failures
        
        Args:
            operation_func: The function to execute
            *args: Positional arguments to pass to operation_func
            **kwargs: Keyword arguments to pass to operation_func
            
        Returns:
            The result of operation_func if successful, or an error dict if all retries fail
        """
        
        @retry(
            stop=stop_after_attempt(MAX_RETRIES),
            wait=wait_exponential(multiplier=BACKOFF_BASE_MS / 1000, min=1, max=60),
            retry=retry_if_exception_type(RetryableError),
            before_sleep=lambda retry_state: logger.warning(
                f"Retry {retry_state.attempt_number} after {retry_state.outcome.exception()}"
            )
        )
        def resilient_operation():
            return CircuitBreaker.execute(operation_func, *args, **kwargs)
        
        try:
            return resilient_operation()
        except RetryError as e:
            logger.error(f"Operation failed after {MAX_RETRIES} retries: {e}")
            return {
                "success": False,
                "error": f"Operation failed after {MAX_RETRIES} retries",
                "details": str(e)
            }
        except Exception as e:
            logger.error(f"Operation failed with unexpected error: {e}")
            return {
                "success": False,
                "error": "Unexpected error during operation",
                "details": str(e)
            }
    
    def sync_merchants(self, force: bool = False) -> Dict[str, Any]:
        """Sync merchants data from Ireland Pay CRM API to Supabase.
        
        Args:
            force: If True, force a full sync even if recent data exists
            
        Returns:
            Dictionary containing sync results and statistics
        """
        logger.info("Starting merchants sync from Ireland Pay CRM")
        
        results = {
            "total_merchants": 0,
            "merchants_added": 0,
            "merchants_updated": 0,
            "merchants_failed": 0,
            "errors": [],
            "start_time": datetime.now().isoformat(),
            "end_time": None
        }
        
        try:
            # Get all merchants from Ireland Pay CRM
            page = 1
            per_page = 100
            
            while True:
                logger.info(f"Fetching merchants page {page}")
                
                # Use resilient execution for API call
                api_result = self._execute_with_resilience(
                    self.irelandpay_client.get_merchants,
                    page=page,
                    per_page=per_page
                )
                
                if not api_result.get("success", True):
                    results["errors"].append(f"Failed to fetch merchants page {page}: {api_result.get('error')}")
                    break
                
                merchants_data = api_result.get("data", [])
                if not merchants_data:
                    break
                
                # Process each merchant
                for merchant in merchants_data:
                    try:
                        # Transform merchant data to match our schema
                        transformed_merchant = self._transform_merchant_data(merchant)
                        
                        # Upsert to database
                        db_result = self._execute_with_resilience(
                            self._upsert_merchant,
                            transformed_merchant
                        )
                        
                        if db_result.get("success", True):
                            if db_result.get("action") == "inserted":
                                results["merchants_added"] += 1
                            else:
                                results["merchants_updated"] += 1
                        else:
                            results["merchants_failed"] += 1
                            results["errors"].append(f"Failed to upsert merchant {merchant.get('mid')}: {db_result.get('error')}")
                        
                        results["total_merchants"] += 1
                        
                    except Exception as e:
                        results["merchants_failed"] += 1
                        results["errors"].append(f"Error processing merchant {merchant.get('mid', 'unknown')}: {str(e)}")
                        logger.error(f"Error processing merchant: {e}")
                
                # Check if we have more pages
                if len(merchants_data) < per_page:
                    break
                
                page += 1
            
            results["end_time"] = datetime.now().isoformat()
            logger.info(f"Merchants sync completed: {results['merchants_added']} added, {results['merchants_updated']} updated, {results['merchants_failed']} failed")
            
        except Exception as e:
            results["errors"].append(f"Sync failed: {str(e)}")
            logger.error(f"Merchants sync failed: {e}")
        
        return results
    
    def sync_residuals(self, year: int, month: int, force: bool = False) -> Dict[str, Any]:
        """Sync residuals data from Ireland Pay CRM API to Supabase.
        
        Args:
            year: Year to sync
            month: Month to sync
            force: If True, force a full sync even if recent data exists
            
        Returns:
            Dictionary containing sync results and statistics
        """
        logger.info(f"Starting residuals sync for {year}-{month:02d} from Ireland Pay CRM")
        
        results = {
            "year": year,
            "month": month,
            "total_residuals": 0,
            "residuals_added": 0,
            "residuals_updated": 0,
            "residuals_failed": 0,
            "errors": [],
            "start_time": datetime.now().isoformat(),
            "end_time": None
        }
        
        try:
            # Get residuals summary from Ireland Pay CRM
            api_result = self._execute_with_resilience(
                self.irelandpay_client.get_residuals_summary,
                year=year,
                month=month
            )
            
            if not api_result.get("success", True):
                results["errors"].append(f"Failed to fetch residuals summary: {api_result.get('error')}")
                return results
            
            residuals_data = api_result.get("data", {})
            
            # Process residuals data
            for merchant_id, residual_info in residuals_data.items():
                try:
                    # Transform residual data to match our schema
                    transformed_residual = self._transform_residual_data(
                        merchant_id, residual_info, year, month
                    )
                    
                    # Upsert to database
                    db_result = self._execute_with_resilience(
                        self._upsert_residual,
                        transformed_residual
                    )
                    
                    if db_result.get("success", True):
                        if db_result.get("action") == "inserted":
                            results["residuals_added"] += 1
                        else:
                            results["residuals_updated"] += 1
                    else:
                        results["residuals_failed"] += 1
                        results["errors"].append(f"Failed to upsert residual for merchant {merchant_id}: {db_result.get('error')}")
                    
                    results["total_residuals"] += 1
                    
                except Exception as e:
                    results["residuals_failed"] += 1
                    results["errors"].append(f"Error processing residual for merchant {merchant_id}: {str(e)}")
                    logger.error(f"Error processing residual: {e}")
            
            results["end_time"] = datetime.now().isoformat()
            logger.info(f"Residuals sync completed: {results['residuals_added']} added, {results['residuals_updated']} updated, {results['residuals_failed']} failed")
            
        except Exception as e:
            results["errors"].append(f"Sync failed: {str(e)}")
            logger.error(f"Residuals sync failed: {e}")
        
        return results
    
    def sync_volumes(self, year: int, month: int, force: bool = False) -> Dict[str, Any]:
        """Sync transaction volumes data from Ireland Pay CRM API to Supabase.
        
        Args:
            year: Year to sync
            month: Month to sync
            force: If True, force a full sync even if recent data exists
            
        Returns:
            Dictionary containing sync results and statistics
        """
        logger.info(f"Starting volumes sync for {year}-{month:02d} from Ireland Pay CRM")
        
        results = {
            "year": year,
            "month": month,
            "total_volumes": 0,
            "volumes_added": 0,
            "volumes_updated": 0,
            "volumes_failed": 0,
            "errors": [],
            "start_time": datetime.now().isoformat(),
            "end_time": None
        }
        
        try:
            # Get all merchants first
            merchants_result = self._execute_with_resilience(
                self.irelandpay_client.get_merchants,
                page=1,
                per_page=1000  # Get all merchants for volume sync
            )
            
            if not merchants_result.get("success", True):
                results["errors"].append(f"Failed to fetch merchants for volume sync: {merchants_result.get('error')}")
                return results
            
            merchants_data = merchants_result.get("data", [])
            
            # Calculate date range for the month
            start_date = f"{year}-{month:02d}-01"
            if month == 12:
                end_date = f"{year + 1}-01-01"
            else:
                end_date = f"{year}-{month + 1:02d}-01"
            
            # Process each merchant's transaction volume
            for merchant in merchants_data:
                try:
                    merchant_id = merchant.get("mid")
                    if not merchant_id:
                        continue
                    
                    # Get merchant transactions for the month
                    transactions_result = self._execute_with_resilience(
                        self.irelandpay_client.get_merchant_transactions,
                        merchant_number=merchant_id,
                        start_date=start_date,
                        end_date=end_date
                    )
                    
                    if not transactions_result.get("success", True):
                        results["volumes_failed"] += 1
                        results["errors"].append(f"Failed to fetch transactions for merchant {merchant_id}: {transactions_result.get('error')}")
                        continue
                    
                    transactions_data = transactions_result.get("data", [])
                    
                    # Calculate total volume for the month
                    total_volume = 0
                    total_transactions = 0
                    
                    for transaction in transactions_data:
                        volume = transaction.get("amount", 0)
                        if volume:
                            total_volume += float(volume)
                            total_transactions += 1
                    
                    # Transform volume data to match our schema
                    transformed_volume = {
                        "mid": merchant_id,
                        "month": f"{year}-{month:02d}-01",
                        "total_txns": total_transactions,
                        "total_volume": total_volume,
                        "source": "irelandpay_crm_api",
                        "synced_at": datetime.now().isoformat()
                    }
                    
                    # Upsert to database
                    db_result = self._execute_with_resilience(
                        self._upsert_volume,
                        transformed_volume
                    )
                    
                    if db_result.get("success", True):
                        if db_result.get("action") == "inserted":
                            results["volumes_added"] += 1
                        else:
                            results["volumes_updated"] += 1
                    else:
                        results["volumes_failed"] += 1
                        results["errors"].append(f"Failed to upsert volume for merchant {merchant_id}: {db_result.get('error')}")
                    
                    results["total_volumes"] += 1
                    
                except Exception as e:
                    results["volumes_failed"] += 1
                    results["errors"].append(f"Error processing volume for merchant {merchant.get('mid', 'unknown')}: {str(e)}")
                    logger.error(f"Error processing volume: {e}")
            
            results["end_time"] = datetime.now().isoformat()
            logger.info(f"Volumes sync completed: {results['volumes_added']} added, {results['volumes_updated']} updated, {results['volumes_failed']} failed")
            
        except Exception as e:
            results["errors"].append(f"Sync failed: {str(e)}")
            logger.error(f"Volumes sync failed: {e}")
        
        return results
    
    def _transform_merchant_data(self, merchant: Dict) -> Dict:
        """Transform merchant data from Ireland Pay CRM format to our database schema.
        
        Args:
            merchant: Raw merchant data from Ireland Pay CRM API
            
        Returns:
            Transformed merchant data
        """
        return {
            "mid": merchant.get("mid"),
            "datasource": merchant.get("datasource", "irelandpay_crm"),
            "merchant_dba": merchant.get("name"),
            "opened": merchant.get("opened"),
            "closed": merchant.get("closed"),
            "status": merchant.get("status"),
            "active": merchant.get("active"),
            "group": merchant.get("group"),
            "processor": merchant.get("processor"),
            "sic_code": merchant.get("sic_code"),
            "vim": merchant.get("vim"),
            "created": merchant.get("created"),
            "modified": merchant.get("modified"),
            "synced_at": datetime.now().isoformat()
        }
    
    def _transform_residual_data(self, merchant_id: str, residual_info: Dict, year: int, month: int) -> Dict:
        """Transform residual data from Ireland Pay CRM format to our database schema.
        
        Args:
            merchant_id: Merchant ID
            residual_info: Raw residual data from Ireland Pay CRM API
            year: Year
            month: Month
            
        Returns:
            Transformed residual data
        """
        return {
            "mid": merchant_id,
            "merchant_dba": residual_info.get("merchant_name"),
            "payout_month": f"{year}-{month:02d}-01",
            "transactions": residual_info.get("transactions", 0),
            "sales_amount": residual_info.get("sales_amount", 0),
            "income": residual_info.get("income", 0),
            "expenses": residual_info.get("expenses", 0),
            "net_profit": residual_info.get("net_profit", 0),
            "bps": residual_info.get("bps", 0),
            "commission_pct": residual_info.get("commission_pct", 0),
            "agent_net": residual_info.get("agent_net", 0),
            "source": "irelandpay_crm_api",
            "synced_at": datetime.now().isoformat()
        }
    
    def _upsert_merchant(self, merchant_data: Dict) -> Dict:
        """Upsert merchant data to the database.
        
        Args:
            merchant_data: Merchant data to upsert
            
        Returns:
            Dictionary with success status and action taken
        """
        try:
            # Check if merchant exists
            existing = self.supabase.table("merchants").select("*").eq("mid", merchant_data["mid"]).execute()
            
            if existing.data:
                # Update existing merchant
                result = self.supabase.table("merchants").update(merchant_data).eq("mid", merchant_data["mid"]).execute()
                return {"success": True, "action": "updated"}
            else:
                # Insert new merchant
                result = self.supabase.table("merchants").insert(merchant_data).execute()
                return {"success": True, "action": "inserted"}
                
        except Exception as e:
            logger.error(f"Database error upserting merchant: {e}")
            return {"success": False, "error": str(e)}
    
    def _upsert_residual(self, residual_data: Dict) -> Dict:
        """Upsert residual data to the database.
        
        Args:
            residual_data: Residual data to upsert
            
        Returns:
            Dictionary with success status and action taken
        """
        try:
            # Check if residual exists
            existing = self.supabase.table("residual_payouts").select("*").eq("mid", residual_data["mid"]).eq("payout_month", residual_data["payout_month"]).execute()
            
            if existing.data:
                # Update existing residual
                result = self.supabase.table("residual_payouts").update(residual_data).eq("mid", residual_data["mid"]).eq("payout_month", residual_data["payout_month"]).execute()
                return {"success": True, "action": "updated"}
            else:
                # Insert new residual
                result = self.supabase.table("residual_payouts").insert(residual_data).execute()
                return {"success": True, "action": "inserted"}
                
        except Exception as e:
            logger.error(f"Database error upserting residual: {e}")
            return {"success": False, "error": str(e)}
    
    def _upsert_volume(self, volume_data: Dict) -> Dict:
        """Upsert volume data to the database.
        
        Args:
            volume_data: Volume data to upsert
            
        Returns:
            Dictionary with success status and action taken
        """
        try:
            # Check if volume exists
            existing = self.supabase.table("merchant_metrics").select("*").eq("mid", volume_data["mid"]).eq("month", volume_data["month"]).execute()
            
            if existing.data:
                # Update existing volume
                result = self.supabase.table("merchant_metrics").update(volume_data).eq("mid", volume_data["mid"]).eq("month", volume_data["month"]).execute()
                return {"success": True, "action": "updated"}
            else:
                # Insert new volume
                result = self.supabase.table("merchant_metrics").insert(volume_data).execute()
                return {"success": True, "action": "inserted"}
                
        except Exception as e:
            logger.error(f"Database error upserting volume: {e}")
            return {"success": False, "error": str(e)} 
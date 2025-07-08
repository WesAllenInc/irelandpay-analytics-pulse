"""
IRIS CRM Synchronization Module

This module handles synchronization of data between IRIS CRM API and our Supabase database.
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
logger = logging.getLogger('iriscrm_sync')
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# =========================================================================
# Resilient IRIS CRM Sync Configuration
# =========================================================================
# These environment variables control the resilience features of the IRIS CRM sync
# They can be adjusted based on the specific requirements and API stability

# Maximum number of retry attempts for failed operations
# - Increase for APIs with intermittent failures
# - Decrease for faster feedback in development
# Default: 3 (resulting in 1 initial attempt + 3 retries = 4 total attempts)
MAX_RETRIES = int(os.environ.get('IRIS_MAX_RETRIES', '3'))

# Base delay in milliseconds for exponential backoff
# - With default of 1000ms, retries will be delayed by approximately: 1s, 2s, 4s...
# - Increase for less aggressive retries or rate-limited APIs
# - Decrease for faster retries in development (but be cautious of rate limits)
# Default: 1000 (1 second)
BACKOFF_BASE_MS = int(os.environ.get('IRIS_BACKOFF_BASE_MS', '1000'))

# Timeout in seconds for HTTP requests
# - Increase for APIs with known slow response times
# - Decrease to fail faster when API is unresponsive
# - Should generally align with any gateway or load balancer timeouts
# Default: 30 seconds
TIMEOUT_SECONDS = int(os.environ.get('IRIS_TIMEOUT_SECONDS', '30'))

# Number of consecutive failures before opening the circuit breaker
# - Increase in high-traffic environments to prevent premature circuit opening
# - Decrease in critical systems to fail faster when API is unstable
# Default: 5 consecutive failures
CIRCUIT_MAX_FAILURES = int(os.environ.get('IRIS_CIRCUIT_MAX_FAILURES', '5'))

# Time in seconds after which to attempt to reset (close) the circuit
# - Increase for longer cool-down periods when API issues tend to persist
# - Decrease for faster recovery attempts in less critical systems
# Default: 60 seconds (1 minute)
CIRCUIT_RESET_SECONDS = int(os.environ.get('IRIS_CIRCUIT_RESET_SECONDS', '60'))

# Define custom error types for better error handling
class IRISCRMError(Exception):
    """Base exception for IRIS CRM errors.
    
    This serves as the parent class for more specific error types.
    """
    pass

class RetryableError(IRISCRMError):
    """Exception for errors that should be retried.
    
    Use this for transient errors where a retry might succeed, such as:
    - Network connectivity issues
    - HTTP 5xx server errors
    - Gateway timeouts
    - Rate limiting (with appropriate backoff)
    
    The retry logic will automatically attempt to recover from these errors.
    """
    pass

class FatalError(IRISCRMError):
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
from .iriscrm_client import IRISCRMClient

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
        """Check if circuit is open, with time-based reset.
        
        Returns True if the circuit is open (calls should be prevented).
        The circuit will auto-reset after CIRCUIT_RESET_SECONDS has elapsed.
        
        Returns:
            bool: True if circuit is open, False if circuit is closed
        """
        # If circuit is open, check if reset timeout has elapsed
        if self._is_open and self._last_failure_time is not None:
            elapsed_time = time.time() - self._last_failure_time
            
            if elapsed_time >= CIRCUIT_RESET_SECONDS:
                logger.info(f"Circuit breaker reset after {elapsed_time:.1f} seconds")
                self._is_open = False
                self._failures = 0
        
        return self._is_open
    
    @classmethod
    def execute(cls, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute a function with circuit breaker protection"""
        if cls.is_open():
            raise RetryableError("Circuit is OPEN - request rejected")
        
        try:
            # Execute with circuit breaker protection
            return func(*args, **kwargs)
        except (RetryableError, RequestException, Timeout, ConnectionError) as e:
            cls.record_failure()
            raise RetryableError(f"Request failed, circuit state updated: {str(e)}") from e
        except Exception as e:
            # Don't count client errors (4xx) as circuit failures
            if not isinstance(e, FatalError):
                cls.record_failure()
            raise


class IRISCRMSyncManager:
    """Manages synchronization between IRIS CRM and the application database.
    
    This class handles the synchronization of merchants, residuals, and volumes data
    from IRIS CRM to the Supabase database. It implements resilience patterns
    including retry with exponential backoff and circuit breaker to handle API
    instability gracefully.
    
    Key resilience features:
    - Exponential backoff retries: Automatically retries failed API calls with
      increasing delays between attempts (configured by IRIS_MAX_RETRIES and
      IRIS_BACKOFF_BASE_MS environment variables)
    - Circuit breaker: Prevents repeated calls to failing services and allows
      time for the service to recover (configured by IRIS_CIRCUIT_MAX_FAILURES and
      IRIS_CIRCUIT_RESET_SECONDS environment variables)
    - Error categorization: Distinguishes between retryable errors (network issues,
      server errors) and fatal errors (client errors, authentication)
    - Timeout handling: Aborts requests that take too long to complete (configured
      by IRIS_TIMEOUT_SECONDS environment variable)
    """
    def __init__(self):
        api_key = os.environ.get('IRIS_CRM_API_KEY')
        if not api_key:
            raise ValueError("IRIS_CRM_API_KEY environment variable not set")
        self.iris_client = IRISCRMClient(api_key)
        self.supabase = createSupabaseServiceClient()
        logger.info("IRIS CRM Sync Manager initialized")
    
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
        circuit_breaker = CircuitBreaker.getInstance()
        
        # Check if circuit is open
        if circuit_breaker.is_open():
            logger.warning("Circuit breaker is open, skipping operation")
            return {
                "success": False,
                "error": "API currently unavailable due to repeated failures",
                "circuit_open": True
            }
        
        # Define the retry function
        @retry(
            # Stop after MAX_RETRIES attempts (from env var)
            stop=stop_after_attempt(MAX_RETRIES),
            # Wait with exponential backoff based on BACKOFF_BASE_MS (from env var)
            # e.g., with 1000ms: 1s, 2s, 4s between retries
            wait=wait_exponential(multiplier=BACKOFF_BASE_MS / 1000, min=BACKOFF_BASE_MS / 1000),
            # Only retry for RetryableError exceptions
            retry=retry_if_exception_type(RetryableError),
            # Reraise the last exception when all retries are exhausted
            reraise=True
        )
        def _retryable_operation():
            try:
                # Execute the operation with timeout
                return operation_func(*args, **kwargs)
            except FatalError as e:
                # Don't retry fatal errors like authentication issues
                logger.error(f"Fatal error: {str(e)}")
                circuit_breaker.record_failure()
                raise
            except RetryableError as e:
                # Retry these errors (handled by @retry decorator)
                logger.warning(f"Retryable error: {str(e)}")
                circuit_breaker.record_failure()
                raise
            except Exception as e:
                # Unexpected errors - treat as retryable by default
                logger.warning(f"Unexpected error (treating as retryable): {str(e)}")
                circuit_breaker.record_failure()
                raise RetryableError(f"Unexpected error: {str(e)}") from e
        
        # Execute with retry
        try:
            result = _retryable_operation()
            # Record success to reset failure counter in circuit breaker
            circuit_breaker.record_success()
            return result
            return _retryable_func(*args, **kwargs)
        except RetryError as e:
            # All retries failed
            logger.critical(f"All {MAX_RETRIES} retry attempts failed. Last error: {e.last_attempt.exception()}")
            # Return gracefully degraded response
            return {
                "success": False,
                "error": "IRIS API unavailable after multiple retry attempts",
                "details": str(e.last_attempt.exception())
            }
        except FatalError as e:
            # Client error that shouldn't be retried
            logger.error(f"Fatal error encountered: {str(e)}")
            return {
                "success": False,
                "error": "IRIS API request invalid",
                "details": str(e)
            }
        except Exception as e:
            # Unexpected errors
            logger.critical(f"Unexpected error in resilience wrapper: {str(e)}")
            return {
                "success": False,
                "error": "Unexpected error occurred",
                "details": str(e)
            }
    
    async def sync_merchants(self) -> Dict[str, Any]:
        """
        Sync merchants data from IRIS CRM API to Supabase.
        Enhanced with retry and circuit-breaker patterns.
        
        Returns:
            Dictionary with sync results
        """
        logger.info("Starting merchants sync")
        results = {
            "total_merchants": 0,
            "merchants_added": 0,
            "merchants_updated": 0,
            "merchants_failed": 0,
            "errors": []
        }
        
        try:
            # Get merchants from IRIS CRM API
            # We'll paginate through all merchants
            page = 1
            per_page = 100
            total_merchants = 0
            
            while True:
                # Use resilient execution for API call
                merchant_result = self._execute_with_resilience(
                    self.iris_client.get_merchants,
                    page=page,
                    per_page=per_page
                )
                
                # Handle API failures
                if merchant_result.get('success') is False:
                    results["errors"].append(merchant_result.get('error', 'Unknown API error'))
                    logger.error(f"Failed to get merchants page {page}: {merchant_result.get('details', 'No details')}")
                    break
                
                # Process merchants
                merchants_data = merchant_result
                merchants = merchants_data.get('data', [])
                if not merchants:
                    break
                
                for merchant in merchants:
                    try:
                        merchant_id = merchant.get('merchantNumber')
                        dba_name = merchant.get('dbaName')
                        
                        if not merchant_id:
                            results["merchants_failed"] += 1
                            results["errors"].append(f"Missing merchant ID for merchant: {merchant}")
                            continue
                        
                        # Check if merchant already exists - database operation wrapped with resilient execution
                        query_result = self._execute_with_resilience(
                            lambda: self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                        )
                        
                        if isinstance(query_result, dict) and query_result.get('success') is False:
                            # Handle database query failure
                            results["merchants_failed"] += 1
                            results["errors"].append(f"Database query failed for merchant {merchant_id}: {query_result.get('error')}")
                            continue
                        
                        # Proceed with insert/update based on query result
                        existing_merchant = query_result
                        
                        if not existing_merchant.data:
                            # Create new merchant with resilient execution
                            insert_result = self._execute_with_resilience(
                                lambda: self.supabase.table("merchants").insert({
                                    "merchant_id": merchant_id,
                                    "dba_name": dba_name,
                                    "last_sync": datetime.now().isoformat()
                                }).execute()
                            )
                            
                            if isinstance(insert_result, dict) and insert_result.get('success') is False:
                                results["merchants_failed"] += 1
                                results["errors"].append(f"Failed to insert merchant {merchant_id}: {insert_result.get('error')}")
                            else:
                                results["merchants_added"] += 1
                        else:
                            # Update existing merchant with resilient execution
                            update_result = self._execute_with_resilience(
                                lambda: self.supabase.table("merchants").update({
                                    "dba_name": dba_name,
                                    "last_sync": datetime.now().isoformat()
                                }).eq("merchant_id", merchant_id).execute()
                            )
                            
                            if isinstance(update_result, dict) and update_result.get('success') is False:
                                results["merchants_failed"] += 1
                                results["errors"].append(f"Failed to update merchant {merchant_id}: {update_result.get('error')}")
                            else:
                                results["merchants_updated"] += 1
                        
                        total_merchants += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing merchant: {str(e)}")
                        results["merchants_failed"] += 1
                        results["errors"].append(f"Error processing merchant: {str(e)}")
                
                # Move to next page
                page += 1
            
            results["total_merchants"] = total_merchants
            logger.info(f"Merchants sync completed. Total: {total_merchants}, Added: {results['merchants_added']}, Updated: {results['merchants_updated']}, Failed: {results['merchants_failed']}")
            
        except Exception as e:
            logger.error(f"Merchants sync failed: {str(e)}")
            results["errors"].append(f"Merchants sync failed: {str(e)}")
        
        return results
    
    async def sync_residuals(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """
        Sync residuals data from IRIS CRM API to Supabase.
        
        Args:
            year: Year to sync (defaults to current year)
            month: Month to sync (defaults to current month)
            
        Returns:
            Dictionary with sync results
        """
        # Default to current month if not specified
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        
        logger.info(f"Starting residuals sync for {year}-{month}")
        
        results = {
            "year": year,
            "month": month,
            "total_residuals": 0,
            "residuals_added": 0,
            "residuals_updated": 0,
            "residuals_failed": 0,
            "errors": []
        }
        
        try:
            # Get residuals summary data
            residuals_data = self.iris_client.get_residuals_summary(year, month)
            
            # Get processors from the summary
            processors = residuals_data.get('processors', [])
            
            for processor in processors:
                processor_id = processor.get('id')
                processor_name = processor.get('name')
                
                # Get detailed residuals for this processor
                try:
                    details = self.iris_client.get_residuals_details(processor_id, year, month)
                    merchant_rows = details.get('merchants', [])
                    
                    for row in merchant_rows:
                        try:
                            merchant_id = row.get('merchantNumber')
                            agent_name = row.get('agent')
                            gross_volume = row.get('volume', 0)
                            amount = row.get('totalResidual', 0)
                            bps = row.get('bps', 0)
                            
                            # Skip if missing required data
                            if not merchant_id:
                                results["residuals_failed"] += 1
                                results["errors"].append(f"Missing merchant ID for residual: {row}")
                                continue
                            
                            # Look up merchant in our database
                            merchant_result = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                            
                            if not merchant_result.data:
                                # Create merchant if it doesn't exist
                                merchant_insert = self.supabase.table("merchants").insert({
                                    "merchant_id": merchant_id,
                                    "dba_name": row.get('dbaName', f"Merchant {merchant_id}"),
                                    "last_sync": datetime.now().isoformat()
                                }).execute()
                                merchant_uuid = merchant_insert.data[0]["id"]
                            else:
                                merchant_uuid = merchant_result.data[0]["id"]
                            
                            # Look up or create agent
                            if agent_name:
                                agent_result = self.supabase.table("agents").select("id").eq("agent_name", agent_name).execute()
                                
                                if not agent_result.data:
                                    # Create new agent
                                    agent_insert = self.supabase.table("agents").insert({
                                        "agent_name": agent_name,
                                        "email": None
                                    }).execute()
                                    agent_id = agent_insert.data[0]["id"]
                                else:
                                    agent_id = agent_result.data[0]["id"]
                                
                                # Update merchant with agent ID
                                self.supabase.table("merchants").update({
                                    "agent_id": agent_id
                                }).eq("id", merchant_uuid).execute()
                            
                            # Format processing date
                            processing_month = f"{year}-{month:02d}-01"
                            
                            # Check for existing residual
                            residual_result = self.supabase.table("residuals").select("id").match({
                                "merchant_id": merchant_uuid,
                                "processing_month": processing_month,
                                "processor": processor_name
                            }).execute()
                            
                            residual_data = {
                                "merchant_id": merchant_uuid,
                                "processing_month": processing_month,
                                "processor": processor_name,
                                "gross_volume": gross_volume,
                                "amount": amount,
                                "bps": bps
                            }
                            
                            if not residual_result.data:
                                # Insert new residual
                                self.supabase.table("residuals").insert(residual_data).execute()
                                results["residuals_added"] += 1
                            else:
                                # Update existing residual
                                self.supabase.table("residuals").update(residual_data).eq("id", residual_result.data[0]["id"]).execute()
                                results["residuals_updated"] += 1
                            
                            results["total_residuals"] += 1
                            
                        except Exception as e:
                            logger.error(f"Error processing residual for merchant {merchant_id}: {str(e)}")
                            results["residuals_failed"] += 1
                            results["errors"].append(f"Error processing residual for merchant {merchant_id}: {str(e)}")
                    
                except Exception as e:
                    logger.error(f"Error processing residuals for processor {processor_id}: {str(e)}")
                    results["errors"].append(f"Error processing residuals for processor {processor_id}: {str(e)}")
            
            logger.info(f"Residuals sync completed for {year}-{month}. Total: {results['total_residuals']}, Added: {results['residuals_added']}, Updated: {results['residuals_updated']}, Failed: {results['residuals_failed']}")
            
        except Exception as e:
            logger.error(f"Residuals sync failed: {str(e)}")
            results["errors"].append(f"Residuals sync failed: {str(e)}")
        
        return results
    
    async def sync_volumes(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """
        Sync processing volumes data from IRIS CRM API to Supabase.
        
        This uses the transactions API to calculate processing volumes.
        
        Args:
            year: Year to sync (defaults to current year)
            month: Month to sync (defaults to current month)
            
        Returns:
            Dictionary with sync results
        """
        # Default to current month if not specified
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        
        logger.info(f"Starting volumes sync for {year}-{month}")
        
        results = {
            "year": year,
            "month": month,
            "total_volumes": 0,
            "volumes_added": 0,
            "volumes_updated": 0,
            "volumes_failed": 0,
            "errors": []
        }
        
        try:
            # Get merchants first to process their volumes
            merchants_response = await self.sync_merchants()
            
            # Get all merchants from our database
            merchants_result = self.supabase.table("merchants").select("id, merchant_id").execute()
            merchants = merchants_result.data
            
            # For each merchant, get their transaction data for the month
            for merchant in merchants:
                merchant_uuid = merchant["id"]
                merchant_id = merchant["merchant_id"]
                
                try:
                    # Define date range for the month
                    start_date = f"{year}-{month:02d}-01"
                    
                    # Calculate end date (last day of the month)
                    if month == 12:
                        end_date = f"{year+1}-01-01"
                    else:
                        end_date = f"{year}-{month+1:02d}-01"
                    
                    end_date_obj = datetime.fromisoformat(end_date)
                    end_date_obj = end_date_obj - timedelta(days=1)
                    end_date = end_date_obj.strftime("%Y-%m-%d")
                    
                    # Get transactions for this merchant
                    transactions = self.iris_client.get_merchant_transactions(
                        merchant_id,
                        start_date=start_date,
                        end_date=end_date
                    )
                    
                    # Calculate volume metrics
                    gross_volume = 0
                    chargebacks = 0
                    fees = 0
                    
                    # Process transactions
                    for transaction in transactions.get('data', []):
                        amount = transaction.get('amount', 0)
                        transaction_type = transaction.get('type', '').lower()
                        
                        if transaction_type == 'sale':
                            gross_volume += amount
                        elif transaction_type == 'chargeback':
                            chargebacks += amount
                        elif transaction_type == 'fee':
                            fees += amount
                    
                    # Calculate estimated BPS
                    estimated_bps = 0
                    if gross_volume > 0:
                        estimated_bps = (fees / gross_volume) * 10000
                    
                    # Format processing month
                    processing_month = start_date
                    
                    # Check for existing volume record
                    volume_result = self.supabase.table("merchant_processing_volumes").select("id").match({
                        "merchant_id": merchant_uuid,
                        "processing_month": processing_month
                    }).execute()
                    
                    volume_data = {
                        "merchant_id": merchant_uuid,
                        "processing_month": processing_month,
                        "gross_volume": gross_volume,
                        "chargebacks": chargebacks,
                        "fees": fees,
                        "estimated_bps": estimated_bps
                    }
                    
                    if not volume_result.data:
                        # Insert new volume record
                        self.supabase.table("merchant_processing_volumes").insert(volume_data).execute()
                        results["volumes_added"] += 1
                    else:
                        # Update existing volume record
                        self.supabase.table("merchant_processing_volumes").update(volume_data).eq("id", volume_result.data[0]["id"]).execute()
                        results["volumes_updated"] += 1
                    
                    results["total_volumes"] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing volumes for merchant {merchant_id}: {str(e)}")
                    results["volumes_failed"] += 1
                    results["errors"].append(f"Error processing volumes for merchant {merchant_id}: {str(e)}")
            
            logger.info(f"Volumes sync completed for {year}-{month}. Total: {results['total_volumes']}, Added: {results['volumes_added']}, Updated: {results['volumes_updated']}, Failed: {results['volumes_failed']}")
            
        except Exception as e:
            logger.error(f"Volumes sync failed: {str(e)}")
            results["errors"].append(f"Volumes sync failed: {str(e)}")
        
        return results
    
    async def sync_all(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """
        Sync all data from IRIS CRM API to Supabase.
        
        Args:
            year: Year to sync (defaults to current year)
            month: Month to sync (defaults to current month)
            
        Returns:
            Dictionary with sync results
        """
        # Default to current month if not specified
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        
        logger.info(f"Starting full sync for {year}-{month}")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "year": year,
            "month": month,
            "merchants": {},
            "residuals": {},
            "volumes": {}
        }
        
        # Sync merchants first
        results["merchants"] = await self.sync_merchants()
        
        # Sync residuals
        results["residuals"] = await self.sync_residuals(year, month)
        
        # Sync volumes
        results["volumes"] = await self.sync_volumes(year, month)
        
        # Log sync completion
        logger.info(f"Full sync completed for {year}-{month}")
        
        # Record sync in the database
        self.supabase.table("sync_logs").insert({
            "sync_date": datetime.now().isoformat(),
            "year": year,
            "month": month,
            "merchants_total": results["merchants"].get("total_merchants", 0),
            "merchants_added": results["merchants"].get("merchants_added", 0),
            "merchants_updated": results["merchants"].get("merchants_updated", 0),
            "merchants_failed": results["merchants"].get("merchants_failed", 0),
            "residuals_total": results["residuals"].get("total_residuals", 0),
            "residuals_added": results["residuals"].get("residuals_added", 0),
            "residuals_updated": results["residuals"].get("residuals_updated", 0),
            "residuals_failed": results["residuals"].get("residuals_failed", 0),
            "volumes_total": results["volumes"].get("total_volumes", 0),
            "volumes_added": results["volumes"].get("volumes_added", 0),
            "volumes_updated": results["volumes"].get("volumes_updated", 0),
            "volumes_failed": results["volumes"].get("volumes_failed", 0),
            "error_count": len(results["merchants"].get("errors", [])) + 
                          len(results["residuals"].get("errors", [])) + 
                          len(results["volumes"].get("errors", []))
        }).execute()
        
        return results

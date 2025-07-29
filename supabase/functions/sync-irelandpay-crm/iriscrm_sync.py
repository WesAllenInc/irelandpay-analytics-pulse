#!/usr/bin/env python
"""
IRIS CRM Sync Script for Edge Functions

This standalone script is called by the sync-iriscrm Edge Function to perform data synchronization
between IRIS CRM API and the Supabase database. It replaces the previous Excel upload functionality.
"""
import os
import sys
import json
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from transaction_client import TransactionClient

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger('iriscrm_sync')

# IRIS CRM API Client (simplified version for Edge Function)
class IrelandPayCRMClient:
    """Ireland Pay CRM API Client for Edge Functions"""
    
    BASE_URL = "https://crm.ireland-pay.com/api/v1"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """Make a request to the Ireland Pay CRM API"""
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data
            )
            
            response.raise_for_status()
            
            if response.content:
                return response.json()
            return {}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text}")
            
            raise
    
    # Merchant API endpoints
    def get_merchants(self, page: int = 1, per_page: int = 100, **filters) -> Dict:
        """Get a list of merchants"""
        params = {"page": page, "per_page": per_page, **filters}
        return self._make_request("GET", "/merchants", params=params)
    
    def get_merchant(self, merchant_number: str) -> Dict:
        """Get detailed information about a specific merchant"""
        return self._make_request("GET", f"/merchants/{merchant_number}")
    
    def get_merchant_transactions(self, merchant_number: str, start_date: str = None, 
                                  end_date: str = None, page: int = 1, per_page: int = 100) -> Dict:
        """Get transactions for a merchant"""
        params = {"page": page, "per_page": per_page}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
            
        return self._make_request("GET", f"/merchants/{merchant_number}/transactions", params=params)
    
    # Residuals API endpoints
    def get_residuals_summary(self, year: int, month: int) -> Dict:
        """Get residuals summary data"""
        return self._make_request("GET", f"/residuals/reports/summary/{year}/{month}")
    
    def get_residuals_details(self, processor_id: str, year: int, month: int) -> Dict:
        """Get detailed residuals data"""
        return self._make_request(
            "GET", 
            f"/residuals/reports/details/{processor_id}/{year}/{month}"
        )
    
    def get_residuals_lineitems(self, year: int, month: int) -> Dict:
        """Get residuals line items"""
        return self._make_request("GET", f"/residuals/lineitems/{year}/{month}")

# Supabase Client for Python Edge Functions
class SupabaseClient:
    """Simple Supabase client for direct database operations from Python Edge Functions"""
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        })
    
    def table(self, table_name: str):
        """Create a table query builder"""
        return TableQuery(self, table_name)

class TableQuery:
    """Table query builder for Supabase"""
    
    def __init__(self, client: SupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        self.url = f"{client.url}/rest/v1/{table_name}"
        self.query_params = {}
        self.filters = []
    
    def select(self, columns: str = "*"):
        """Select columns from table"""
        self.query_params["select"] = columns
        return self
    
    def insert(self, data: Dict):
        """Insert data into table"""
        try:
            response = self.client.session.post(
                self.url,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Insert error for table {self.table_name}: {str(e)}")
            raise
    
    def update(self, data: Dict):
        """Update data in table (must be used with filters)"""
        query_url = self.url
        if self.filters:
            for f in self.filters:
                query_url += f
        
        try:
            response = self.client.session.patch(
                query_url,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Update error for table {self.table_name}: {str(e)}")
            raise
    
    def eq(self, column: str, value: Any):
        """Add equality filter"""
        self.filters.append(f"?{column}=eq.{value}")
        return self
    
    def execute(self):
        """Execute the query and return results"""
        query_url = self.url
        if self.query_params:
            query_url += "?" + "&".join([f"{k}={v}" for k, v in self.query_params.items()])
        
        if self.filters:
            for f in self.filters:
                query_url += f
        
        try:
            response = self.client.session.get(query_url)
            response.raise_for_status()
            return {"data": response.json(), "error": None}
        except Exception as e:
            logger.error(f"Query error for table {self.table_name}: {str(e)}")
            return {"data": None, "error": str(e)}

# Main sync functionality
class IrelandPayCRMSync:
    """Handles synchronization between IRIS CRM API and Supabase database"""
    
    def __init__(self):
        # Get API key from environment variables
        api_key = os.environ.get('IRELANDPAY_CRM_API_KEY')
        
        if not api_key:
            raise ValueError("IRELANDPAY_CRM_API_KEY environment variable is not set")
        
        # Initialize API client
        self.client = IrelandPayCRMClient(api_key)
        
        # Get Supabase credentials
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set")
        
        # Initialize Supabase client
        self.supabase = SupabaseClient(supabase_url, supabase_key)
        
        # Initialize Transaction client
        self.tx_client = TransactionClient(supabase_url, supabase_key)
        
        logger.info("IRIS CRM Sync initialized")
    
    def sync_merchants(self) -> Dict[str, Any]:
        """Sync merchants data from IRIS CRM API to Supabase using transactions"""
        logger.info("Starting merchants sync")
        
        results = {
            "total_merchants": 0,
            "merchants_added": 0,
            "merchants_updated": 0,
            "merchants_failed": 0,
            "errors": []
        }
        
        # Start a transaction for the merchants sync
        try:
            transaction_id = self.tx_client.start_transaction('merchants')
            logger.info(f"Started transaction {transaction_id} for merchants sync")
            
            page = 1
            per_page = 100
            total_pages = 1
            merchant_batch = []
            batch_size = 50  # Process in smaller batches for better error handling
            
            # Fetch and process merchants page by page
            while page <= total_pages:
                response = self.client.get_merchants(page=page, per_page=per_page)
                
                if not response or 'data' not in response:
                    error_msg = f"Failed to fetch merchants data (page {page})"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
                    break
                
                # Update total pages on first request
                if page == 1 and 'meta' in response:
                    total_pages = response['meta'].get('last_page', 1)
                
                merchants = response.get('data', [])
                results["total_merchants"] += len(merchants)
                
                for merchant in merchants:
                    try:
                        # Transform merchant data to match our database schema
                        merchant_record = {
                            "id": str(merchant.get('id')),
                            "merchant_name": merchant.get('business_name'),
                            "merchant_number": merchant.get('merchant_number'),
                            "status": merchant.get('status', 'active').lower(),
                            "address": merchant.get('address', ''),
                            "city": merchant.get('city', ''),
                            "state": merchant.get('state', ''),
                            "zip": merchant.get('zip', ''),
                            "contact_name": f"{merchant.get('contact_first_name', '')} {merchant.get('contact_last_name', '')}".strip(),
                            "contact_email": merchant.get('contact_email', ''),
                            "contact_phone": merchant.get('contact_phone', ''),
                            "agent_id": str(merchant.get('agent_id')),
                            "processor_id": merchant.get('processor_id'),
                            "processor_name": merchant.get('processor_name'),
                            "updated_at": datetime.now().isoformat(),
                            "sync_source": "iriscrm_api"
                        }
                        
                        merchant_batch.append(merchant_record)
                        
                        # Process in batches to avoid large transactions
                        if len(merchant_batch) >= batch_size:
                            batch_result = self.tx_client.batch_upsert("merchants", merchant_batch)
                            
                            # Update counters
                            results["merchants_added"] += batch_result.get("inserted", 0)
                            results["merchants_updated"] += batch_result.get("updated", 0)
                            results["merchants_failed"] += batch_result.get("failed", 0)
                            
                            if batch_result.get("errors"):
                                results["errors"].extend(batch_result.get("errors", []))
                            
                            # Clear batch
                            merchant_batch = []
                            
                    except Exception as e:
                        error_msg = f"Failed to process merchant {merchant.get('id')}: {str(e)}"
                        logger.error(error_msg)
                        results["errors"].append(error_msg)
                        results["merchants_failed"] += 1
                
                # Move to next page
                page += 1
                
            # Process any remaining merchants in the batch
            if merchant_batch:
                batch_result = self.tx_client.batch_upsert("merchants", merchant_batch)
                results["merchants_added"] += batch_result.get("inserted", 0)
                results["merchants_updated"] += batch_result.get("updated", 0)
                results["merchants_failed"] += batch_result.get("failed", 0)
                
                if batch_result.get("errors"):
                    results["errors"].extend(batch_result.get("errors", []))
            
            # If we had too many errors, rollback the transaction
            if results["merchants_failed"] > (results["total_merchants"] * 0.1):  # More than 10% failed
                error_msg = f"Too many merchant processing failures: {results['merchants_failed']}/{results['total_merchants']}"
                logger.error(error_msg)
                self.tx_client.rollback_transaction(error_msg)
                results["errors"].append(error_msg)
                results["transaction_status"] = "rolled_back"
            else:
                # Commit the transaction
                self.tx_client.commit_transaction({"summary": results})
                results["transaction_status"] = "committed"
                
            logger.info(f"Merchants sync completed. Total: {results['total_merchants']}, Added: {results['merchants_added']}, Updated: {results['merchants_updated']}, Failed: {results['merchants_failed']}")
            
        except Exception as e:
            error_msg = f"Merchants sync failed: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            
            # Rollback the transaction if an error occurred
            if hasattr(self, 'tx_client') and self.tx_client.transaction_id:
                self.tx_client.rollback_transaction(error_msg)
                results["transaction_status"] = "rolled_back"
        
        return results
    
    def sync_residuals(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """Sync residuals data from IRIS CRM API to Supabase"""
        # Default to current month if not specified
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        
        logger.info(f"Starting residuals sync for {year}-{month}")
        
        results = {
            "total_residuals": 0,
            "residuals_added": 0,
            "residuals_updated": 0,
            "residuals_failed": 0,
            "errors": []
        }
        
        try:
            residuals_data = self.sync_residuals_with_transaction(year, month)
            results = residuals_data
        except Exception as e:
            logger.error(f"Residuals sync failed: {str(e)}")
            results["errors"].append(f"Residuals sync failed: {str(e)}")
        
        return results
    
    def sync_residuals_with_transaction(self, year: int, month: int) -> Dict[str, Any]:
        """Sync residual data for the specified year and month from IRIS CRM API to Supabase using transactions"""
        logger.info(f"Starting residuals sync with transaction for {year}-{month}")
        
        results = {
            "total_residuals": 0,
            "residuals_added": 0,
            "residuals_updated": 0,
            "residuals_failed": 0,
            "errors": []
        }
        
        # Start a transaction for the residuals sync
        try:
            transaction_id = self.tx_client.start_transaction(
                'residuals', 
                year=year, 
                month=month,
                metadata={"period": f"{year}-{month:02d}"}
            )
            logger.info(f"Started transaction {transaction_id} for residuals sync {year}-{month:02d}")
            
            # Get residual data from IRIS CRM API
            residuals_data = self.client.get_residuals_lineitems(year, month)
            
            if not residuals_data or 'data' not in residuals_data:
                error_msg = f"Failed to fetch residuals data for {year}-{month}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                self.tx_client.rollback_transaction(error_msg)
                results["transaction_status"] = "rolled_back"
                return results
            
            residuals = residuals_data.get('data', [])
            results["total_residuals"] = len(residuals)
            
            # Process residuals in batches for better performance and error handling
            residual_batch = []
            batch_size = 100
            
            for residual in residuals:
                try:
                    merchant_id = residual.get('merchant_number')
                    merchant_name = residual.get('merchant_name', '')
                    amount = residual.get('residual_amount', 0)
                    volume = residual.get('volume', 0)
                    bps = residual.get('basis_points', 0)
                    agent_id = residual.get('agent_id')
                    
                    if not merchant_id:
                        results["residuals_failed"] += 1
                        results["errors"].append("Missing merchant ID for residual")
                        continue
                    
                    residual_record = {
                        "merchant_id": str(merchant_id),
                        "merchant_name": merchant_name,
                        "year": year,
                        "month": month,
                        "amount": float(amount) if amount else 0,
                        "volume": float(volume) if volume else 0,
                        "basis_points": float(bps) if bps else 0,
                        "updated_at": datetime.now().isoformat(),
                        "sync_source": "iriscrm_api"
                    }
                    
                    # Use agent_id if available in the residual data
                    if agent_id:
                        residual_record["agent_id"] = str(agent_id)
                    
                    residual_batch.append(residual_record)
                    
                    # Process in batches to avoid large transactions
                    if len(residual_batch) >= batch_size:
                        batch_result = self.tx_client.batch_upsert(
                            "residuals", 
                            residual_batch, 
                            conflict_target="merchant_id,year,month",
                            conflict_action="update"
                        )
                        
                        # Update counters
                        results["residuals_added"] += batch_result.get("inserted", 0)
                        results["residuals_updated"] += batch_result.get("updated", 0)
                        results["residuals_failed"] += batch_result.get("failed", 0)
                        
                        if batch_result.get("errors"):
                            results["errors"].extend(batch_result.get("errors", []))
                        
                        # Clear batch
                        residual_batch = []
                    
                except Exception as e:
                    error_msg = f"Error processing residual for merchant {merchant_id}: {str(e)}"
                    logger.error(error_msg)
                    results["residuals_failed"] += 1
                    results["errors"].append(error_msg)
            
            # Process any remaining residuals in the batch
            if residual_batch:
                batch_result = self.tx_client.batch_upsert(
                    "residuals", 
                    residual_batch,
                    conflict_target="merchant_id,year,month",
                    conflict_action="update"
                )
                
                results["residuals_added"] += batch_result.get("inserted", 0)
                results["residuals_updated"] += batch_result.get("updated", 0)
                results["residuals_failed"] += batch_result.get("failed", 0)
                
                if batch_result.get("errors"):
                    results["errors"].extend(batch_result.get("errors", []))
            
            # If we had too many errors, rollback the transaction
            if results["residuals_failed"] > (results["total_residuals"] * 0.1):  # More than 10% failed
                error_msg = f"Too many residual processing failures: {results['residuals_failed']}/{results['total_residuals']}"
                logger.error(error_msg)
                self.tx_client.rollback_transaction(error_msg)
                results["errors"].append(error_msg)
                results["transaction_status"] = "rolled_back"
            else:
                # Commit the transaction and trigger materialized view refresh
                self.tx_client.commit_transaction({"summary": results})
                results["transaction_status"] = "committed"
                
                # Trigger refresh of the agent_performance_metrics materialized view
                try:
                    logger.info("Refreshing materialized views after residuals sync")
                    self.supabase.rpc("refresh_agent_performance_views").execute()
                except Exception as e:
                    logger.warning(f"Failed to refresh materialized views: {str(e)}")
            
            logger.info(f"Residuals sync completed. Total: {results['total_residuals']}, Added: {results['residuals_added']}, Updated: {results['residuals_updated']}, Failed: {results['residuals_failed']}")
            
        except Exception as e:
            error_msg = f"Residuals sync failed: {str(e)}"
            logger.error(error_msg)
            results["errors"].append(error_msg)
            
            # Rollback the transaction if an error occurred
            if hasattr(self, 'tx_client') and self.tx_client.transaction_id:
                self.tx_client.rollback_transaction(error_msg)
                results["transaction_status"] = "rolled_back"
        
        return results
        
    def sync_all(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """Sync all data from IRIS CRM API to Supabase with transactional safety"""
        # Default to current month if not specified
        if year is None or month is None:
            today = datetime.now()
            year = today.year
            month = today.month
        
        logger.info(f"Starting full sync for {year}-{month}")
        
        results = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "year": year,
            "month": month,
            "merchants": {},
            "residuals": {},
            "transaction_status": "started"
        }
        
        # Start a transaction for the full sync operation
        try:
            transaction_id = self.tx_client.start_transaction(
                'all', 
                year=year, 
                month=month,
                metadata={"period": f"{year}-{month:02d}", "type": "full_sync"}
            )
            logger.info(f"Started transaction {transaction_id} for full sync {year}-{month:02d}")
            
            # Sync merchants first
            results["merchants"] = self.sync_merchants()
            
            # Check if merchants sync was successful before continuing
            if results["merchants"].get("transaction_status") == "rolled_back":
                logger.error("Merchants sync failed, skipping residuals sync")
                results["success"] = False
                results["error"] = "Merchants sync failed"
                self.tx_client.rollback_transaction("Merchants sync failed")
                results["transaction_status"] = "rolled_back"
                return results
            
            # Sync residuals
            results["residuals"] = self.sync_residuals(year, month)
            
            # Check if either sync operation failed
            merchant_success = results["merchants"].get("transaction_status") != "rolled_back"
            residual_success = results["residuals"].get("transaction_status") != "rolled_back"
            
            if not merchant_success or not residual_success:
                error_msg = "One or more sync operations failed"
                logger.error(error_msg)
                results["success"] = False
                results["error"] = error_msg
                
                # Make sure any ongoing transaction is rolled back
                if hasattr(self, 'tx_client') and self.tx_client.transaction_id:
                    self.tx_client.rollback_transaction(error_msg)
                    results["transaction_status"] = "rolled_back"
                
                return results
            
            # Log sync completion
            logger.info(f"Full sync completed for {year}-{month}")
            
            # Record sync in the database
            try:
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
                    "error_count": len(results["merchants"].get("errors", [])) + 
                                  len(results["residuals"].get("errors", []))
                }).execute()
            except Exception as e:
                logger.warning(f"Failed to record sync log: {str(e)}")
            
            # Refresh materialized views
            try:
                logger.info("Refreshing materialized views after full sync")
                self.supabase.rpc("refresh_agent_performance_views").execute()
            except Exception as e:
                logger.warning(f"Failed to refresh materialized views: {str(e)}")
            
            # Commit the final transaction (if still active)
            if hasattr(self, 'tx_client') and self.tx_client.transaction_id:
                self.tx_client.commit_transaction({"summary": results})
                results["transaction_status"] = "committed"
            
        except Exception as e:
            logger.error(f"Full sync failed: {str(e)}")
            results["success"] = False
            results["error"] = str(e)
            
            # Rollback the transaction if an error occurred
            if hasattr(self, 'tx_client') and self.tx_client.transaction_id:
                self.tx_client.rollback_transaction(f"Full sync failed: {str(e)}")
                results["transaction_status"] = "rolled_back"
        
        return results


def main():
    """Main entry point for the script"""
    import argparse
    
    parser = argparse.ArgumentParser(description='IRIS CRM Sync Tool')
    parser.add_argument('--data-type', choices=['merchants', 'residuals', 'all'], default='all',
                        help='Type of data to sync')
    parser.add_argument('--year', type=int, help='Year to sync (default: current year)')
    parser.add_argument('--month', type=int, help='Month to sync (default: current month)')
    parser.add_argument('--force', action='store_true', help='Force sync even if recent sync exists')
    
    args = parser.parse_args()
    
    # Initialize sync manager
    sync = IRISCRMSync()
    
    results = {}
    
    try:
        # Execute sync based on data type
        if args.data_type == 'merchants':
            results = sync.sync_merchants()
        elif args.data_type == 'residuals':
            results = sync.sync_residuals(args.year, args.month)
        else:
            results = sync.sync_all(args.year, args.month)
        
        # Output results as JSON for the Edge Function
        print(json.dumps(results))
        return 0
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        return 1


if __name__ == "__main__":
    sys.exit(main())

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

# Set up logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger('iriscrm_sync')

# IRIS CRM API Client (simplified version for Edge Function)
class IRISCRMClient:
    """Simplified IRIS CRM API Client for Edge Functions"""
    
    BASE_URL = "https://iriscrm.com/api/v1"
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Dict:
        """Make a request to the IRIS CRM API"""
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
class IRISCRMSync:
    """Handles synchronization between IRIS CRM API and Supabase database"""
    
    def __init__(self):
        # Get API key from environment variables
        api_key = os.environ.get('IRIS_CRM_API_KEY')
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not api_key:
            raise ValueError("IRIS_CRM_API_KEY environment variable not set")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables not set")
        
        # Initialize IRIS CRM client
        self.iris_client = IRISCRMClient(api_key)
        
        # Initialize Supabase client
        self.supabase = SupabaseClient(supabase_url, supabase_key)
        
        logger.info("IRIS CRM Sync initialized")
    
    def sync_merchants(self) -> Dict[str, Any]:
        """Sync merchants data from IRIS CRM API to Supabase"""
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
            page = 1
            per_page = 100
            total_merchants = 0
            
            while True:
                merchants_data = self.iris_client.get_merchants(page=page, per_page=per_page)
                
                # Check if we've reached the end
                merchants = merchants_data.get('data', [])
                if not merchants:
                    break
                
                # Process merchants
                for merchant in merchants:
                    try:
                        merchant_id = merchant.get('merchantNumber')
                        dba_name = merchant.get('dbaName')
                        
                        if not merchant_id:
                            results["merchants_failed"] += 1
                            results["errors"].append(f"Missing merchant ID for merchant")
                            continue
                        
                        # Check if merchant already exists
                        existing_merchant = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                        
                        if not existing_merchant["data"] or len(existing_merchant["data"]) == 0:
                            # Create new merchant
                            self.supabase.table("merchants").insert({
                                "merchant_id": merchant_id,
                                "dba_name": dba_name,
                                "last_sync": datetime.now().isoformat()
                            })
                            results["merchants_added"] += 1
                        else:
                            # Update existing merchant
                            self.supabase.table("merchants").update({
                                "dba_name": dba_name,
                                "last_sync": datetime.now().isoformat()
                            }).eq("merchant_id", merchant_id)
                            results["merchants_updated"] += 1
                        
                        total_merchants += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing merchant {merchant_id}: {str(e)}")
                        results["merchants_failed"] += 1
                        results["errors"].append(f"Error processing merchant: {str(e)}")
                
                # Move to next page
                page += 1
            
            results["total_merchants"] = total_merchants
            logger.info(f"Merchants sync completed. Total: {total_merchants}, Added: {results['merchants_added']}, Updated: {results['merchants_updated']}, Failed: {results['merchants_failed']}")
            
        except Exception as e:
            logger.error(f"Merchant sync failed: {str(e)}")
            results["errors"].append(f"Merchant sync failed: {str(e)}")
        
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
                                results["errors"].append(f"Missing merchant ID for residual")
                                continue
                            
                            # Look up merchant in our database
                            merchant_result = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                            
                            # Process merchant lookup result
                            merchant_uuid = None
                            if not merchant_result["data"] or len(merchant_result["data"]) == 0:
                                # Create merchant if it doesn't exist
                                merchant_insert = self.supabase.table("merchants").insert({
                                    "merchant_id": merchant_id,
                                    "dba_name": row.get('dbaName', f"Merchant {merchant_id}"),
                                    "last_sync": datetime.now().isoformat()
                                })
                                merchant_uuid = merchant_insert[0]["id"]
                            else:
                                merchant_uuid = merchant_result["data"][0]["id"]
                            
                            # Look up or create agent
                            agent_id = None
                            if agent_name:
                                agent_result = self.supabase.table("agents").select("id").eq("agent_name", agent_name).execute()
                                
                                if not agent_result["data"] or len(agent_result["data"]) == 0:
                                    # Create new agent
                                    agent_insert = self.supabase.table("agents").insert({
                                        "agent_name": agent_name,
                                        "email": None
                                    })
                                    agent_id = agent_insert[0]["id"]
                                else:
                                    agent_id = agent_result["data"][0]["id"]
                                
                                # Update merchant with agent ID if we have one
                                if agent_id and merchant_uuid:
                                    self.supabase.table("merchants").update({
                                        "agent_id": agent_id
                                    }).eq("id", merchant_uuid)
                            
                            # Format processing date
                            processing_month = f"{year}-{month:02d}-01"
                            
                            # Skip further processing if we couldn't get a merchant UUID
                            if not merchant_uuid:
                                results["residuals_failed"] += 1
                                results["errors"].append(f"Failed to get merchant UUID for {merchant_id}")
                                continue
                            
                            # Check for existing residual
                            residual_data = {
                                "merchant_id": merchant_uuid,
                                "processing_month": processing_month,
                                "processor": processor_name,
                                "gross_volume": gross_volume,
                                "amount": amount,
                                "bps": bps
                            }
                            
                            # Insert the residual data (simplified for edge function)
                            self.supabase.table("residuals").insert(residual_data)
                            results["residuals_added"] += 1
                            results["total_residuals"] += 1
                            
                        except Exception as e:
                            logger.error(f"Error processing residual for merchant: {str(e)}")
                            results["residuals_failed"] += 1
                            results["errors"].append(f"Error processing residual: {str(e)}")
                    
                except Exception as e:
                    logger.error(f"Error processing residuals for processor {processor_id}: {str(e)}")
                    results["errors"].append(f"Error processing residuals for processor: {str(e)}")
            
            logger.info(f"Residuals sync completed for {year}-{month}. Total: {results['total_residuals']}, Added: {results['residuals_added']}, Updated: {results['residuals_updated']}, Failed: {results['residuals_failed']}")
            
        except Exception as e:
            logger.error(f"Residuals sync failed: {str(e)}")
            results["errors"].append(f"Residuals sync failed: {str(e)}")
        
        return results
    
    def sync_all(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """Sync all data from IRIS CRM API to Supabase"""
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
            "residuals": {}
        }
        
        try:
            # Sync merchants first
            results["merchants"] = self.sync_merchants()
            
            # Sync residuals
            results["residuals"] = self.sync_residuals(year, month)
            
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
                "error_count": len(results["merchants"].get("errors", [])) + 
                              len(results["residuals"].get("errors", []))
            })
            
        except Exception as e:
            logger.error(f"Full sync failed: {str(e)}")
            results["success"] = False
            results["error"] = str(e)
        
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

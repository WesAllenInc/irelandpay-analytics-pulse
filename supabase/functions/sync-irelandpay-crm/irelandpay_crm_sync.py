#!/usr/bin/env python3
"""
Ireland Pay CRM Synchronization Script

This script handles the synchronization of data between Ireland Pay CRM API and our Supabase database.
It replaces the previous Excel upload functionality with automated API data fetching.

Usage:
    python irelandpay_crm_sync.py --data-type merchants
    python irelandpay_crm_sync.py --data-type residuals --year 2024 --month 12
    python irelandpay_crm_sync.py --data-type volumes --year 2024 --month 12
    python irelandpay_crm_sync.py --data-type all --force
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import requests
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IrelandPayCRMSync:
    """Ireland Pay CRM synchronization manager."""
    
    def __init__(self):
        """Initialize the sync manager with API credentials and database connection."""
        # Hardcoded API key for Ireland Pay CRM
        self.api_key = 'c1jfpS4tI23CUZ4OCO4YNtYRtdXP9eT4PbdIUULIysGZyaD8gu'
        self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables not set")
        
        # Initialize clients
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.base_url = "https://crm.ireland-pay.com/api/v1"
        self.headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        logger.info("Ireland Pay CRM Sync initialized")
    
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
                
                # Make API request
                response = requests.get(
                    f"{self.base_url}/merchants",
                    headers=self.headers,
                    params={'page': page, 'per_page': per_page},
                    timeout=30
                )
                
                if response.status_code != 200:
                    error_msg = f"Failed to fetch merchants page {page}: {response.status_code} - {response.text}"
                    results["errors"].append(error_msg)
                    logger.error(error_msg)
                    break
                
                data = response.json()
                merchants_data = data.get('data', [])
                
                if not merchants_data:
                    break
                
                # Process each merchant
                for merchant in merchants_data:
                    try:
                        # Transform merchant data to match our schema
                        transformed_merchant = self._transform_merchant_data(merchant)
                        
                        # Upsert to database
                        db_result = self._upsert_merchant(transformed_merchant)
                        
                        if db_result["success"]:
                            if db_result["action"] == "inserted":
                                results["merchants_added"] += 1
                            else:
                                results["merchants_updated"] += 1
                        else:
                            results["merchants_failed"] += 1
                            results["errors"].append(f"Failed to upsert merchant {merchant.get('mid')}: {db_result['error']}")
                        
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
            response = requests.get(
                f"{self.base_url}/residuals/reports/summary/{year}/{month}",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                error_msg = f"Failed to fetch residuals summary: {response.status_code} - {response.text}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
                return results
            
            data = response.json()
            residuals_data = data.get('data', {})
            
            # Process residuals data
            for merchant_id, residual_info in residuals_data.items():
                try:
                    # Get the merchant UUID from the database
                    merchant_result = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                    
                    if not merchant_result.data:
                        logger.warning(f"Merchant {merchant_id} not found in database, skipping residual")
                        results["residuals_failed"] += 1
                        results["errors"].append(f"Merchant {merchant_id} not found in database")
                        continue
                    
                    merchant_uuid = merchant_result.data[0]["id"]
                    
                    # Transform residual data to match our schema
                    transformed_residual = self._transform_residual_data(
                        merchant_uuid, residual_info, year, month
                    )
                    
                    # Upsert to database
                    db_result = self._upsert_residual(transformed_residual)
                    
                    if db_result["success"]:
                        if db_result["action"] == "inserted":
                            results["residuals_added"] += 1
                        else:
                            results["residuals_updated"] += 1
                    else:
                        results["residuals_failed"] += 1
                        results["errors"].append(f"Failed to upsert residual for merchant {merchant_id}: {db_result['error']}")
                    
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
            response = requests.get(
                f"{self.base_url}/merchants",
                headers=self.headers,
                params={'per_page': 1000},  # Get all merchants for volume sync
                timeout=30
            )
            
            if response.status_code != 200:
                error_msg = f"Failed to fetch merchants for volume sync: {response.status_code} - {response.text}"
                results["errors"].append(error_msg)
                logger.error(error_msg)
                return results
            
            data = response.json()
            merchants_data = data.get('data', [])
            
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
                    response = requests.get(
                        f"{self.base_url}/merchants/{merchant_id}/transactions",
                        headers=self.headers,
                        params={'start_date': start_date, 'end_date': end_date},
                        timeout=30
                    )
                    
                    if response.status_code != 200:
                        results["volumes_failed"] += 1
                        results["errors"].append(f"Failed to fetch transactions for merchant {merchant_id}: {response.status_code} - {response.text}")
                        continue
                    
                    data = response.json()
                    transactions_data = data.get('data', [])
                    
                    # Calculate total volume for the month
                    total_volume = 0
                    total_transactions = 0
                    
                    for transaction in transactions_data:
                        volume = transaction.get("amount", 0)
                        if volume:
                            total_volume += float(volume)
                            total_transactions += 1
                    
                    # Get the merchant UUID from the database
                    merchant_result = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                    
                    if not merchant_result.data:
                        logger.warning(f"Merchant {merchant_id} not found in database, skipping volume")
                        results["volumes_failed"] += 1
                        results["errors"].append(f"Merchant {merchant_id} not found in database")
                        continue
                    
                    merchant_uuid = merchant_result.data[0]["id"]
                    
                    # Transform volume data to match our schema
                    transformed_volume = {
                        "merchant_id": merchant_uuid,
                        "processing_month": f"{year}-{month:02d}-01",
                        "gross_volume": total_volume,
                        "transaction_count": total_transactions,
                        "avg_ticket": total_volume / total_transactions if total_transactions > 0 else 0,
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    # Upsert to database
                    db_result = self._upsert_volume(transformed_volume)
                    
                    if db_result["success"]:
                        if db_result["action"] == "inserted":
                            results["volumes_added"] += 1
                        else:
                            results["volumes_updated"] += 1
                    else:
                        results["volumes_failed"] += 1
                        results["errors"].append(f"Failed to upsert volume for merchant {merchant_id}: {db_result['error']}")
                    
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
            "merchant_id": merchant.get("mid"),  # Map mid to merchant_id
            "dba_name": merchant.get("name"),    # Map name to dba_name
            "processor": merchant.get("processor"),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
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
            "merchant_id": merchant_id,  # This will need to be the UUID from merchants table
            "processing_month": f"{year}-{month:02d}-01",
            "net_residual": residual_info.get("net_profit", 0),
            "fees_deducted": residual_info.get("expenses", 0),
            "final_residual": residual_info.get("income", 0),
            "office_bps": residual_info.get("bps", 0),
            "agent_bps": residual_info.get("agent_net", 0),
            "processor_residual": residual_info.get("sales_amount", 0),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
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
            existing = self.supabase.table("merchants").select("*").eq("merchant_id", merchant_data["merchant_id"]).execute()
            
            if existing.data:
                # Update existing merchant
                result = self.supabase.table("merchants").update(merchant_data).eq("merchant_id", merchant_data["merchant_id"]).execute()
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
            existing = self.supabase.table("residuals").select("*").eq("merchant_id", residual_data["merchant_id"]).eq("processing_month", residual_data["processing_month"]).execute()
            
            if existing.data:
                # Update existing residual
                result = self.supabase.table("residuals").update(residual_data).eq("merchant_id", residual_data["merchant_id"]).eq("processing_month", residual_data["processing_month"]).execute()
                return {"success": True, "action": "updated"}
            else:
                # Insert new residual
                result = self.supabase.table("residuals").insert(residual_data).execute()
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
            existing = self.supabase.table("merchant_processing_volumes").select("*").eq("merchant_id", volume_data["merchant_id"]).eq("processing_month", volume_data["processing_month"]).execute()
            
            if existing.data:
                # Update existing volume
                result = self.supabase.table("merchant_processing_volumes").update(volume_data).eq("merchant_id", volume_data["merchant_id"]).eq("processing_month", volume_data["processing_month"]).execute()
                return {"success": True, "action": "updated"}
            else:
                # Insert new volume
                result = self.supabase.table("merchant_processing_volumes").insert(volume_data).execute()
                return {"success": True, "action": "inserted"}
                
        except Exception as e:
            logger.error(f"Database error upserting volume: {e}")
            return {"success": False, "error": str(e)}

def main():
    """Main function to handle command line arguments and execute sync operations."""
    parser = argparse.ArgumentParser(description='Ireland Pay CRM Synchronization Script')
    parser.add_argument('--data-type', choices=['merchants', 'residuals', 'volumes', 'all'], 
                       default='all', help='Type of data to sync')
    parser.add_argument('--year', type=int, help='Year to sync (for residuals and volumes)')
    parser.add_argument('--month', type=int, help='Month to sync (for residuals and volumes)')
    parser.add_argument('--force', action='store_true', help='Force sync even if recent data exists')
    
    args = parser.parse_args()
    
    try:
        # Initialize sync manager
        sync_manager = IrelandPayCRMSync()
        
        # Determine current year/month if not provided
        current_date = datetime.now()
        year = args.year or current_date.year
        month = args.month or current_date.month
        
        results = {}
        
        # Execute sync based on data type
        if args.data_type == 'merchants' or args.data_type == 'all':
            results['merchants'] = sync_manager.sync_merchants(force=args.force)
        
        if args.data_type == 'residuals' or args.data_type == 'all':
            results['residuals'] = sync_manager.sync_residuals(year, month, force=args.force)
        
        if args.data_type == 'volumes' or args.data_type == 'all':
            results['volumes'] = sync_manager.sync_volumes(year, month, force=args.force)
        
        # Output results as JSON
        print(json.dumps({
            "success": True,
            "message": f"Successfully synced {args.data_type} data",
            "results": results
        }))
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main() 
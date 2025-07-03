"""
IRIS CRM Synchronization Module

This module handles synchronization of data between IRIS CRM API and our Supabase database.
It replaces the previous Excel upload functionality with automated API data fetching.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from .supabase import createSupabaseServiceClient
from .iriscrm_client import IRISCRMClient

# Set up logging
logger = logging.getLogger('iriscrm_sync')
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)


class IRISCRMSyncManager:
    """
    Manages synchronization between IRIS CRM API and Supabase database.
    """
    
    def __init__(self):
        """Initialize the sync manager with API client and Supabase client."""
        # Get API key from environment variables
        api_key = os.environ.get('IRIS_CRM_API_KEY')
        if not api_key:
            raise ValueError("IRIS_CRM_API_KEY environment variable not set")
        
        # Initialize IRIS CRM client
        self.iris_client = IRISCRMClient(api_key)
        
        # Initialize Supabase client
        self.supabase = createSupabaseServiceClient()
        
        # Log initialization
        logger.info("IRIS CRM Sync Manager initialized")
    
    async def sync_merchants(self) -> Dict[str, Any]:
        """
        Sync merchants data from IRIS CRM API to Supabase.
        
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
                            results["errors"].append(f"Missing merchant ID for merchant: {merchant}")
                            continue
                        
                        # Check if merchant already exists
                        existing_merchant = self.supabase.table("merchants").select("id").eq("merchant_id", merchant_id).execute()
                        
                        if not existing_merchant.data:
                            # Create new merchant
                            self.supabase.table("merchants").insert({
                                "merchant_id": merchant_id,
                                "dba_name": dba_name,
                                "last_sync": datetime.now().isoformat()
                            }).execute()
                            results["merchants_added"] += 1
                        else:
                            # Update existing merchant
                            self.supabase.table("merchants").update({
                                "dba_name": dba_name,
                                "last_sync": datetime.now().isoformat()
                            }).eq("merchant_id", merchant_id).execute()
                            results["merchants_updated"] += 1
                        
                        total_merchants += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing merchant {merchant_id}: {str(e)}")
                        results["merchants_failed"] += 1
                        results["errors"].append(f"Error processing merchant {merchant_id}: {str(e)}")
                
                # Move to next page
                page += 1
            
            results["total_merchants"] = total_merchants
            logger.info(f"Merchants sync completed. Total: {total_merchants}, Added: {results['merchants_added']}, Updated: {results['merchants_updated']}, Failed: {results['merchants_failed']}")
            
        except Exception as e:
            logger.error(f"Merchant sync failed: {str(e)}")
            results["errors"].append(f"Merchant sync failed: {str(e)}")
        
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

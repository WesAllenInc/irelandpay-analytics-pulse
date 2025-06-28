"""
Database synchronization module for syncing processed data to Supabase.
"""
import logging
from typing import Dict, List, Any
import pandas as pd
from datetime import datetime

from irelandpay_analytics.db.supabase_client import SupabaseClient
from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class DataSynchronizer:
    """Synchronizes processed data to Supabase database."""
    
    def __init__(self):
        """Initialize the data synchronizer with a Supabase client."""
        self.supabase = SupabaseClient()
    
    def sync_merchant_data(self, merchant_df: pd.DataFrame) -> int:
        """
        Synchronize merchant data to Supabase.
        
        Args:
            merchant_df: DataFrame containing merchant data
            
        Returns:
            Number of records synchronized
        """
        logger.info("Synchronizing merchant data")
        
        # Convert DataFrame to list of dictionaries
        merchants = merchant_df.to_dict(orient="records")
        
        # Add created_at timestamp if not present
        for merchant in merchants:
            if "created_at" not in merchant:
                merchant["created_at"] = datetime.now().isoformat()
        
        # Upsert records to avoid duplicates
        self.supabase.upsert_records(
            settings.MERCHANTS_TABLE, 
            merchants, 
            "mid"  # Assuming mid is the unique identifier
        )
        
        logger.info(f"Synchronized {len(merchants)} merchant records")
        return len(merchants)
    
    def sync_residual_data(self, residual_df: pd.DataFrame) -> int:
        """
        Synchronize residual data to Supabase.
        
        Args:
            residual_df: DataFrame containing residual data
            
        Returns:
            Number of records synchronized
        """
        logger.info("Synchronizing residual data")
        
        # Convert DataFrame to list of dictionaries
        residuals = residual_df.to_dict(orient="records")
        
        # Add created_at timestamp if not present
        for residual in residuals:
            if "created_at" not in residual:
                residual["created_at"] = datetime.now().isoformat()
        
        # Upsert records to avoid duplicates
        # We use a composite key of mid + payout_month to identify unique residual records
        self.supabase.upsert_records(
            settings.RESIDUALS_TABLE, 
            residuals, 
            "id"  # Assuming id is the unique identifier
        )
        
        logger.info(f"Synchronized {len(residuals)} residual records")
        return len(residuals)
    
    def sync_all(self, merchant_df: pd.DataFrame, residual_df: pd.DataFrame) -> Dict[str, int]:
        """
        Synchronize both merchant and residual data to Supabase.
        
        Args:
            merchant_df: DataFrame containing merchant data
            residual_df: DataFrame containing residual data
            
        Returns:
            Dictionary with counts of synchronized records
        """
        merchant_count = self.sync_merchant_data(merchant_df)
        residual_count = self.sync_residual_data(residual_df)
        
        return {
            "merchants": merchant_count,
            "residuals": residual_count
        }
    
    def check_duplicate_merchants(self, merchant_df: pd.DataFrame) -> pd.DataFrame:
        """
        Check for duplicate merchants in the database.
        
        Args:
            merchant_df: DataFrame containing merchant data to check
            
        Returns:
            DataFrame with only new merchants not already in the database
        """
        # Get list of merchant IDs
        mid_list = merchant_df["mid"].unique().tolist()
        
        # Get existing merchants from database
        existing_merchants = self.supabase.get_merchants_by_mid(mid_list)
        existing_mids = [m["mid"] for m in existing_merchants]
        
        # Filter out existing merchants
        new_merchants = merchant_df[~merchant_df["mid"].isin(existing_mids)]
        
        logger.info(f"Found {len(existing_mids)} existing merchants, {len(new_merchants)} new merchants")
        return new_merchants

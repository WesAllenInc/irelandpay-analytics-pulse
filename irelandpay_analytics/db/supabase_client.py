"""
Supabase client for connecting to the database and performing operations.
"""
import logging
from typing import Dict, List, Any, Optional
import supabase
from supabase import create_client, Client

from irelandpay_analytics.config import settings

logger = logging.getLogger(__name__)

class SupabaseClient:
    """Client for interacting with Supabase database."""
    
    def __init__(self):
        """Initialize the Supabase client."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase URL and key must be provided in environment variables")
        
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized")
    
    def insert_merchants(self, merchants: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Insert merchant data into the merchants table.
        
        Args:
            merchants: List of merchant dictionaries with required fields
            
        Returns:
            Response from Supabase
        """
        logger.info(f"Inserting {len(merchants)} merchant records")
        response = self.client.table(settings.MERCHANTS_TABLE).insert(merchants).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error inserting merchants: {response.error}")
            raise Exception(f"Failed to insert merchants: {response.error}")
            
        logger.info(f"Successfully inserted {len(merchants)} merchant records")
        return response.data
    
    def insert_residuals(self, residuals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Insert residual data into the residuals table.
        
        Args:
            residuals: List of residual dictionaries with required fields
            
        Returns:
            Response from Supabase
        """
        logger.info(f"Inserting {len(residuals)} residual records")
        response = self.client.table(settings.RESIDUALS_TABLE).insert(residuals).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error inserting residuals: {response.error}")
            raise Exception(f"Failed to insert residuals: {response.error}")
            
        logger.info(f"Successfully inserted {len(residuals)} residual records")
        return response.data
    
    def get_merchants_by_mid(self, mid_list: List[str]) -> List[Dict[str, Any]]:
        """
        Get merchants by merchant IDs.
        
        Args:
            mid_list: List of merchant IDs to retrieve
            
        Returns:
            List of merchant records
        """
        response = self.client.table(settings.MERCHANTS_TABLE).select("*").in_("mid", mid_list).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error retrieving merchants: {response.error}")
            raise Exception(f"Failed to retrieve merchants: {response.error}")
            
        return response.data
    
    def get_residuals_by_month(self, month: str) -> List[Dict[str, Any]]:
        """
        Get residuals for a specific month.
        
        Args:
            month: Month in format YYYY-MM
            
        Returns:
            List of residual records
        """
        response = self.client.table(settings.RESIDUALS_TABLE).select("*").eq("payout_month", month).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error retrieving residuals: {response.error}")
            raise Exception(f"Failed to retrieve residuals: {response.error}")
            
        return response.data
    
    def get_merchant_volumes_by_month(self, month: str) -> List[Dict[str, Any]]:
        """
        Get merchant volumes for a specific month.
        
        Args:
            month: Month in format YYYY-MM
            
        Returns:
            List of merchant volume records
        """
        response = self.client.table(settings.MERCHANTS_TABLE).select("*").eq("month", month).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error retrieving merchant volumes: {response.error}")
            raise Exception(f"Failed to retrieve merchant volumes: {response.error}")
            
        return response.data
    
    def check_record_exists(self, table: str, field: str, value: Any) -> bool:
        """
        Check if a record exists in a table.
        
        Args:
            table: Table name
            field: Field to check
            value: Value to check for
            
        Returns:
            True if record exists, False otherwise
        """
        response = self.client.table(table).select("id").eq(field, value).limit(1).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error checking record existence: {response.error}")
            raise Exception(f"Failed to check record existence: {response.error}")
            
        return len(response.data) > 0
    
    def upsert_records(self, table: str, records: List[Dict[str, Any]], key_field: str) -> Dict[str, Any]:
        """
        Upsert records into a table (insert if not exists, update if exists).
        
        Args:
            table: Table name
            records: List of record dictionaries
            key_field: Field to use as the key for upserting
            
        Returns:
            Response from Supabase
        """
        logger.info(f"Upserting {len(records)} records into {table}")
        response = self.client.table(table).upsert(records, on_conflict=key_field).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error upserting records: {response.error}")
            raise Exception(f"Failed to upsert records: {response.error}")
            
        logger.info(f"Successfully upserted {len(records)} records into {table}")
        return response.data

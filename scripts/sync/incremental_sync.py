#!/usr/bin/env python3
"""
Incremental Sync Module for Ireland Pay Analytics
-------------------------------------------------
This module implements delta sync capabilities to reduce full sync frequency.
It tracks changes since the last sync and only updates modified records.
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set

import httpx
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('incremental_sync')

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_client = create_client(supabase_url, supabase_key)

# IRIS CRM API Configuration
IRELANDPAY_CRM_API_KEY = os.environ.get("IRELANDPAY_CRM_API_KEY")
IRELANDPAY_CRM_BASE_URL = "https://crm.ireland-pay.com/api/v1"

class IncrementalSync:
    """
    Handles incremental synchronization between IRIS CRM and the Supabase database.
    Only syncs records that have changed since the last sync to minimize API calls
    and improve performance.
    """
    
    def __init__(self, data_type: str, sync_scope: Optional[str] = None):
        """
        Initialize the incremental sync handler.
        
        Args:
            data_type: Type of data being synced (e.g., 'merchants', 'residuals')
            sync_scope: Optional scope for the sync (e.g., month, region)
        """
        self.data_type = data_type
        self.sync_scope = sync_scope
        self.last_sync_time = self._get_last_sync_time()
        self.changes_count = 0
        self.client = httpx.Client(timeout=60.0)
    
    def _get_last_sync_time(self) -> datetime:
        """
        Retrieve the timestamp of the last successful sync for this data type.
        
        Returns:
            Datetime of last successful sync, or a default old date if none found
        """
        try:
            result = supabase_client.rpc(
                'get_sync_watermark', 
                {'p_data_type': self.data_type, 'p_sync_scope': self.sync_scope}
            ).execute()
            
            if result.data:
                # Convert the timestamp string to datetime
                return datetime.fromisoformat(result.data.replace('Z', '+00:00'))
            
            # Default to 30 days ago if no watermark exists
            return datetime.utcnow() - timedelta(days=30)
            
        except Exception as e:
            logger.error(f"Error getting last sync time: {e}")
            # Default to 30 days ago if error occurs
            return datetime.utcnow() - timedelta(days=30)
    
    def _update_sync_watermark(self, sync_time: Optional[datetime] = None, record_count: Optional[int] = None) -> None:
        """
        Update the sync watermark with the current timestamp.
        
        Args:
            sync_time: Time to set as the sync watermark (defaults to now)
            record_count: Number of records processed in this sync
        """
        try:
            if sync_time is None:
                sync_time = datetime.utcnow()
                
            supabase_client.rpc(
                'update_sync_watermark',
                {
                    'p_data_type': self.data_type,
                    'p_timestamp': sync_time.isoformat(),
                    'p_sync_scope': self.sync_scope,
                    'p_record_count': record_count
                }
            ).execute()
            
            logger.info(f"Updated sync watermark for {self.data_type} to {sync_time.isoformat()}")
        except Exception as e:
            logger.error(f"Error updating sync watermark: {e}")
    
    def _generate_record_hash(self, record: Dict[str, Any]) -> str:
        """
        Generate a hash of the record to detect changes.
        
        Args:
            record: Dictionary of record data
        
        Returns:
            SHA-256 hash of the record data
        """
        # Remove fields that shouldn't affect the hash
        record_copy = record.copy()
        for field in ['created_at', 'updated_at', 'last_sync_at', 'last_modified_at', 'hash_value']:
            record_copy.pop(field, None)
            
        # Sort keys for consistent hashing regardless of field order
        canonical = json.dumps(record_copy, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    def _get_changed_records_from_api(
        self, 
        endpoint: str, 
        since_param: str, 
        id_field: str = 'id'
    ) -> Tuple[List[Dict[str, Any]], Set[str]]:
        """
        Fetch records from the IRIS CRM API that have changed since the last sync.
        
        Args:
            endpoint: API endpoint to query
            since_param: Parameter name for the 'since' filter
            id_field: Field to use as the unique identifier
            
        Returns:
            Tuple of (changed_records, deleted_ids)
        """
        changed_records = []
        deleted_ids = set()
        
        try:
            # Format the timestamp for the API
            since_timestamp = self.last_sync_time.strftime("%Y-%m-%dT%H:%M:%S")
            
            # Make the API request
            headers = {"Authorization": f"Bearer {IRELANDPAY_CRM_API_KEY}"}
            params = {since_param: since_timestamp, "include_deleted": "true"}
            
            response = self.client.get(
                f"{IRIS_CRM_BASE_URL}/{endpoint}",
                headers=headers,
                params=params
            )
            
            response.raise_for_status()
            api_data = response.json()
            
            # Process the results
            for record in api_data.get('data', []):
                if record.get('_deleted', False):
                    # Track deleted records by their ID
                    deleted_ids.add(str(record.get(id_field)))
                else:
                    # Add modified record to the changes list
                    changed_records.append(record)
            
            logger.info(f"Found {len(changed_records)} changed and {len(deleted_ids)} deleted records in {endpoint}")
            return changed_records, deleted_ids
            
        except Exception as e:
            logger.error(f"Error fetching changed records from API: {e}")
            return [], set()
    
    def _get_database_records_by_ids(
        self, 
        table_name: str, 
        ids: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Get existing records from the database by their IDs.
        
        Args:
            table_name: Name of the database table
            ids: List of record IDs to fetch
            
        Returns:
            Dictionary mapping record IDs to their current database state
        """
        if not ids:
            return {}
            
        try:
            result = supabase_client.table(table_name).select('*').in_('id', ids).execute()
            
            # Create a dictionary mapping IDs to records
            records_by_id = {}
            for record in result.data:
                records_by_id[str(record.get('id'))] = record
                
            return records_by_id
            
        except Exception as e:
            logger.error(f"Error fetching database records: {e}")
            return {}
    
    def _apply_changes(
        self, 
        table_name: str, 
        changed_records: List[Dict[str, Any]], 
        deleted_ids: Set[str],
        id_field: str = 'id'
    ) -> int:
        """
        Apply the changes to the database using upsert for modified records and deletion for removed records.
        
        Args:
            table_name: Name of the database table
            changed_records: List of records that have been changed
            deleted_ids: Set of IDs for records that should be deleted
            id_field: Field to use as the unique identifier
            
        Returns:
            Number of records affected
        """
        processed_count = 0
        
        # Handle modified and new records
        if changed_records:
            try:
                # Prepare records for upsert
                records_to_upsert = []
                existing_records = self._get_database_records_by_ids(
                    table_name, 
                    [str(record.get(id_field)) for record in changed_records]
                )
                
                for record in changed_records:
                    record_id = str(record.get(id_field))
                    
                    # Check if the record exists and has changed
                    if record_id in existing_records:
                        existing_record = existing_records[record_id]
                        new_hash = self._generate_record_hash(record)
                        
                        # Only update if the record has changed
                        if existing_record.get('hash_value') != new_hash:
                            record['hash_value'] = new_hash
                            record['last_modified_at'] = datetime.utcnow().isoformat()
                            records_to_upsert.append(record)
                    else:
                        # New record, add it with hash
                        record['hash_value'] = self._generate_record_hash(record)
                        record['last_modified_at'] = datetime.utcnow().isoformat()
                        records_to_upsert.append(record)
                
                # Perform the upsert if we have records to update
                if records_to_upsert:
                    result = supabase_client.table(table_name).upsert(records_to_upsert).execute()
                    processed_count += len(result.data)
                    logger.info(f"Upserted {len(result.data)} records to {table_name}")
                
            except Exception as e:
                logger.error(f"Error upserting records: {e}")
        
        # Handle deleted records
        if deleted_ids:
            try:
                result = supabase_client.table(table_name).delete().in_('id', list(deleted_ids)).execute()
                processed_count += len(deleted_ids)
                logger.info(f"Deleted {len(deleted_ids)} records from {table_name}")
            except Exception as e:
                logger.error(f"Error deleting records: {e}")
        
        return processed_count
    
    def sync_merchants(self) -> int:
        """
        Perform an incremental sync of merchant data.
        
        Returns:
            Number of records processed
        """
        logger.info(f"Starting incremental merchant sync since {self.last_sync_time}")
        
        # Fetch changed merchants from the API
        changed_records, deleted_ids = self._get_changed_records_from_api(
            endpoint="merchants",
            since_param="modified_since",
            id_field="merchant_id"
        )
        
        # Apply changes to the database
        processed_count = self._apply_changes(
            table_name="merchants",
            changed_records=changed_records,
            deleted_ids=deleted_ids,
            id_field="merchant_id"
        )
        
        # Update the sync watermark
        self._update_sync_watermark(record_count=processed_count)
        
        return processed_count
    
    def sync_residuals(self, month: Optional[str] = None) -> int:
        """
        Perform an incremental sync of residual data.
        
        Args:
            month: Optional month to sync in YYYY-MM format
            
        Returns:
            Number of records processed
        """
        # If no month specified, use current month
        if not month:
            now = datetime.utcnow()
            month = now.strftime("%Y-%m")
        
        logger.info(f"Starting incremental residuals sync for {month} since {self.last_sync_time}")
        
        # Fetch changed residuals from the API
        changed_records, deleted_ids = self._get_changed_records_from_api(
            endpoint=f"residuals/{month}",
            since_param="modified_since",
            id_field="residual_id"
        )
        
        # Apply changes to the database
        processed_count = self._apply_changes(
            table_name="residuals",
            changed_records=changed_records,
            deleted_ids=deleted_ids,
            id_field="residual_id"
        )
        
        # Update the sync watermark with the specific month scope
        self._update_sync_watermark(
            sync_time=datetime.utcnow(),
            record_count=processed_count
        )
        
        return processed_count
    
    def sync_agents(self) -> int:
        """
        Perform an incremental sync of agent data.
        
        Returns:
            Number of records processed
        """
        logger.info(f"Starting incremental agent sync since {self.last_sync_time}")
        
        # Fetch changed agents from the API
        changed_records, deleted_ids = self._get_changed_records_from_api(
            endpoint="agents",
            since_param="modified_since",
            id_field="agent_id"
        )
        
        # Apply changes to the database
        processed_count = self._apply_changes(
            table_name="agents",
            changed_records=changed_records,
            deleted_ids=deleted_ids,
            id_field="agent_id"
        )
        
        # Update the sync watermark
        self._update_sync_watermark(record_count=processed_count)
        
        return processed_count

# Utility function for CLI usage
def run_incremental_sync(data_type: str, scope: Optional[str] = None) -> None:
    """
    Run incremental sync for a specific data type from command line.
    
    Args:
        data_type: Type of data to sync ('merchants', 'residuals', 'agents')
        scope: Optional scope parameter (e.g., month for residuals)
    """
    sync_handler = IncrementalSync(data_type, sync_scope=scope)
    
    if data_type == 'merchants':
        processed = sync_handler.sync_merchants()
    elif data_type == 'residuals':
        processed = sync_handler.sync_residuals(month=scope)
    elif data_type == 'agents':
        processed = sync_handler.sync_agents()
    else:
        logger.error(f"Unknown data type: {data_type}")
        return
        
    logger.info(f"Incremental sync complete for {data_type}. Processed {processed} records.")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run incremental sync for Ireland Pay Analytics")
    parser.add_argument(
        'data_type',
        choices=['merchants', 'residuals', 'agents'],
        help="Type of data to sync"
    )
    parser.add_argument(
        '--scope',
        help="Optional scope parameter (e.g., YYYY-MM for residuals)"
    )
    
    args = parser.parse_args()
    run_incremental_sync(args.data_type, args.scope)

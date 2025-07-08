"""
Transaction-safe client for Supabase synchronization operations.
This module provides a transactional wrapper around database operations.
"""
import json
import logging
import requests
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger("transaction_client")

class TransactionClient:
    """
    A transaction-safe client for Supabase that provides atomic operations
    with rollback capability.
    """
    
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        })
        self.transaction_id = None
    
    def _post_rpc(self, function_name: str, params: Dict) -> Dict:
        """Execute an RPC function and return the result"""
        url = f"{self.url}/rest/v1/rpc/{function_name}"
        
        try:
            response = self.session.post(url, json=params)
            response.raise_for_status()
            
            if response.content:
                return response.json()
            return {}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"RPC request failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text}")
            
            raise
    
    def start_transaction(self, sync_type: str, year: Optional[int] = None, 
                         month: Optional[int] = None, metadata: Dict = None) -> str:
        """
        Start a new sync transaction.
        
        Args:
            sync_type: Type of sync ('merchants', 'residuals', 'volumes', 'all')
            year: Year for the sync operation
            month: Month for the sync operation
            metadata: Additional metadata to store with the transaction
            
        Returns:
            UUID of the created transaction
        """
        params = {
            "p_sync_type": sync_type,
            "p_year": year,
            "p_month": month,
            "p_metadata": metadata or {}
        }
        
        result = self._post_rpc("start_sync_transaction", params)
        self.transaction_id = result
        
        logger.info(f"Started transaction {self.transaction_id} for {sync_type} sync")
        return self.transaction_id
    
    def commit_transaction(self, metadata: Dict = None) -> bool:
        """
        Commit the current sync transaction.
        
        Args:
            metadata: Additional metadata to store with the transaction
            
        Returns:
            True if the transaction was successfully committed
        """
        if not self.transaction_id:
            raise ValueError("No active transaction to commit")
        
        params = {
            "p_transaction_id": self.transaction_id,
            "p_metadata": metadata or {}
        }
        
        result = self._post_rpc("commit_sync_transaction", params)
        success = result is True
        
        if success:
            logger.info(f"Committed transaction {self.transaction_id}")
            self.transaction_id = None
        else:
            logger.error(f"Failed to commit transaction {self.transaction_id}")
        
        return success
    
    def rollback_transaction(self, error_message: str = None) -> bool:
        """
        Rollback the current sync transaction.
        
        Args:
            error_message: Optional error message explaining why the transaction was rolled back
            
        Returns:
            True if the transaction was successfully rolled back
        """
        if not self.transaction_id:
            raise ValueError("No active transaction to rollback")
        
        params = {
            "p_transaction_id": self.transaction_id,
            "p_error_message": error_message
        }
        
        result = self._post_rpc("rollback_sync_transaction", params)
        success = result is True
        
        if success:
            logger.info(f"Rolled back transaction {self.transaction_id}: {error_message}")
            self.transaction_id = None
        else:
            logger.error(f"Failed to rollback transaction {self.transaction_id}")
        
        return success
    
    def batch_upsert(self, table_name: str, records: List[Dict], 
                    conflict_target: str = "id", 
                    conflict_action: str = "update") -> Dict:
        """
        Perform a batch upsert operation within the current transaction.
        
        Args:
            table_name: Name of the table to insert/update records in
            records: List of records to upsert
            conflict_target: Column to check for conflicts
            conflict_action: Action to take on conflict ('update' or 'ignore')
            
        Returns:
            Dictionary with operation results
        """
        if not self.transaction_id:
            raise ValueError("No active transaction for batch operation")
        
        if not records:
            return {"success": True, "inserted": 0, "updated": 0, "failed": 0, "errors": []}
        
        params = {
            "p_transaction_id": self.transaction_id,
            "p_table_name": table_name,
            "p_records": json.dumps(records),
            "p_conflict_target": conflict_target,
            "p_conflict_action": conflict_action
        }
        
        result = self._post_rpc("atomic_batch_upsert", params)
        
        logger.info(
            f"Batch upsert on {table_name}: inserted {result.get('inserted', 0)}, "
            f"updated {result.get('updated', 0)}, failed {result.get('failed', 0)}"
        )
        
        return result
    
    def get_transaction_status(self) -> Dict:
        """
        Get the status of the current transaction.
        
        Returns:
            Dictionary with transaction status details
        """
        if not self.transaction_id:
            raise ValueError("No active transaction")
        
        params = {
            "p_transaction_id": self.transaction_id
        }
        
        return self._post_rpc("get_sync_transaction_status", params)
    
    def __enter__(self):
        """
        Context manager entry point.
        
        Example:
            ```
            with TransactionClient(url, key) as tx:
                tx.start_transaction('merchants')
                # Perform operations
                tx.commit_transaction()
            ```
        """
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Context manager exit point. Automatically rolls back uncommitted transactions.
        """
        if self.transaction_id:
            error_message = str(exc_val) if exc_val else "Transaction exited without commit"
            logger.warning(f"Auto-rolling back transaction {self.transaction_id}: {error_message}")
            self.rollback_transaction(error_message)
        return False  # Don't suppress exceptions

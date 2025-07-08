import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("sync_queue")

class SyncQueue:
    """
    Manages a queue of sync operations with retry capabilities and exponential backoff
    """
    
    def __init__(self, supabase_client):
        """
        Initialize the sync queue with a Supabase client for persistence
        """
        self.supabase = supabase_client
        self.active_jobs = {}  # In-memory tracking of currently active jobs
        self.max_retries = 3   # Maximum number of retry attempts
        self.base_delay = 5    # Base delay in seconds for exponential backoff
    
    async def initialize(self) -> None:
        """
        Initialize the queue system, load pending jobs from the database
        """
        try:
            # Get all pending or running jobs from the queue
            response = self.supabase.table("sync_queue").select("*").in_("status", ["pending", "running"]).execute()
            
            if response.get("error"):
                logger.error(f"Error loading sync queue: {response.get('error')}")
                return
            
            # Load any pending jobs into memory
            for job in response.get("data", []):
                job_id = job.get("id")
                self.active_jobs[job_id] = {
                    "id": job_id,
                    "params": job.get("parameters"),
                    "status": job.get("status"),
                    "retry_count": job.get("retry_count", 0),
                    "next_retry": job.get("next_retry"),
                    "last_error": job.get("last_error"),
                }
                
            logger.info(f"Loaded {len(self.active_jobs)} active jobs from the database")
            
        except Exception as e:
            logger.error(f"Failed to initialize sync queue: {str(e)}")
    
    async def enqueue(self, job_type: str, parameters: Dict[str, Any], priority: int = 0) -> str:
        """
        Add a new job to the sync queue
        
        Args:
            job_type: Type of sync job (merchants, residuals, all, etc.)
            parameters: Parameters for the sync job
            priority: Job priority (higher numbers = higher priority)
            
        Returns:
            Job ID if successful, None otherwise
        """
        try:
            # Create a new job record
            job = {
                "job_type": job_type,
                "parameters": parameters,
                "status": "pending",
                "priority": priority,
                "created_at": datetime.now().isoformat(),
                "retry_count": 0,
                "next_retry": None,
                "last_error": None,
            }
            
            # Insert into the database
            response = self.supabase.table("sync_queue").insert(job).execute()
            
            if response.get("error"):
                logger.error(f"Error adding job to queue: {response.get('error')}")
                return None
            
            # Get the new job ID
            job_id = response.get("data", [{}])[0].get("id")
            
            # Add to active jobs tracking
            self.active_jobs[job_id] = {
                "id": job_id,
                "params": parameters,
                "status": "pending",
                "retry_count": 0,
                "next_retry": None,
                "last_error": None,
            }
            
            logger.info(f"Added job {job_id} to sync queue (type: {job_type})")
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to enqueue sync job: {str(e)}")
            return None
    
    async def get_next_job(self) -> Optional[Dict[str, Any]]:
        """
        Get the next job to process from the queue
        
        Returns:
            Job details if a job is available, None otherwise
        """
        try:
            now = datetime.now().isoformat()
            
            # Query for pending jobs, ordered by priority and creation time
            response = self.supabase.table("sync_queue") \
                .select("*") \
                .eq("status", "pending") \
                .or_(f"status.eq.retrying,next_retry.lte.{now}") \
                .order("priority", {"ascending": False}) \
                .order("created_at", {"ascending": True}) \
                .limit(1) \
                .execute()
            
            if response.get("error"):
                logger.error(f"Error getting next job: {response.get('error')}")
                return None
                
            jobs = response.get("data", [])
            
            if not jobs:
                # No jobs available
                return None
                
            return jobs[0]
            
        except Exception as e:
            logger.error(f"Failed to get next job: {str(e)}")
            return None
    
    async def mark_job_running(self, job_id: str) -> bool:
        """
        Mark a job as running
        
        Args:
            job_id: ID of the job to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.supabase.table("sync_queue") \
                .update({"status": "running", "started_at": datetime.now().isoformat()}) \
                .eq("id", job_id) \
                .execute()
            
            if response.get("error"):
                logger.error(f"Error marking job {job_id} as running: {response.get('error')}")
                return False
                
            # Update in-memory tracking
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["status"] = "running"
                
            logger.info(f"Job {job_id} marked as running")
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark job as running: {str(e)}")
            return False
    
    async def complete_job(self, job_id: str, result: Dict[str, Any]) -> bool:
        """
        Mark a job as completed
        
        Args:
            job_id: ID of the job to complete
            result: Result data from the job
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.supabase.table("sync_queue") \
                .update({
                    "status": "completed", 
                    "completed_at": datetime.now().isoformat(),
                    "result": result,
                }) \
                .eq("id", job_id) \
                .execute()
            
            if response.get("error"):
                logger.error(f"Error marking job {job_id} as completed: {response.get('error')}")
                return False
                
            # Remove from active jobs tracking
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
                
            logger.info(f"Job {job_id} completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete job: {str(e)}")
            return False
    
    async def fail_job(self, job_id: str, error: str, retry: bool = True) -> bool:
        """
        Mark a job as failed, optionally scheduling a retry
        
        Args:
            job_id: ID of the job that failed
            error: Error message
            retry: Whether to retry the job
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current job state
            response = self.supabase.table("sync_queue") \
                .select("retry_count") \
                .eq("id", job_id) \
                .execute()
                
            if response.get("error"):
                logger.error(f"Error getting job {job_id} for failure handling: {response.get('error')}")
                return False
            
            jobs = response.get("data", [])
            if not jobs:
                logger.error(f"Job {job_id} not found for failure handling")
                return False
                
            current_retry_count = jobs[0].get("retry_count", 0)
            
            # Check if we should retry
            if retry and current_retry_count < self.max_retries:
                # Calculate next retry with exponential backoff
                retry_count = current_retry_count + 1
                delay_seconds = self.base_delay * (2 ** retry_count)  # Exponential backoff
                next_retry = (datetime.now() + timedelta(seconds=delay_seconds)).isoformat()
                
                # Update job for retry
                update_data = {
                    "status": "retrying",
                    "retry_count": retry_count,
                    "next_retry": next_retry,
                    "last_error": error,
                    "last_failure": datetime.now().isoformat()
                }
                
                logger.info(f"Job {job_id} failed, scheduling retry {retry_count}/{self.max_retries} in {delay_seconds}s")
            else:
                # Mark as failed permanently
                update_data = {
                    "status": "failed",
                    "last_error": error,
                    "last_failure": datetime.now().isoformat(),
                    "completed_at": datetime.now().isoformat()
                }
                
                logger.warning(f"Job {job_id} failed permanently: {error}")
            
            # Update the job in the database
            response = self.supabase.table("sync_queue") \
                .update(update_data) \
                .eq("id", job_id) \
                .execute()
            
            if response.get("error"):
                logger.error(f"Error updating failed job {job_id}: {response.get('error')}")
                return False
                
            # Update in-memory tracking
            if job_id in self.active_jobs:
                if update_data["status"] == "failed":
                    del self.active_jobs[job_id]
                else:
                    self.active_jobs[job_id].update({
                        "status": "retrying",
                        "retry_count": retry_count,
                        "next_retry": next_retry,
                        "last_error": error
                    })
                    
            return True
            
        except Exception as e:
            logger.error(f"Failed to handle job failure: {str(e)}")
            return False
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a pending or retrying job
        
        Args:
            job_id: ID of the job to cancel
            
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.supabase.table("sync_queue") \
                .update({
                    "status": "cancelled",
                    "completed_at": datetime.now().isoformat()
                }) \
                .eq("id", job_id) \
                .in_("status", ["pending", "retrying"]) \
                .execute()
                
            if response.get("error"):
                logger.error(f"Error cancelling job {job_id}: {response.get('error')}")
                return False
            
            # Check if any rows were affected
            if len(response.get("data", [])) == 0:
                logger.warning(f"Job {job_id} not found or not in a cancellable state")
                return False
                
            # Remove from active jobs tracking
            if job_id in self.active_jobs:
                del self.active_jobs[job_id]
                
            logger.info(f"Job {job_id} cancelled")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel job: {str(e)}")
            return False
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the current queue state
        
        Returns:
            Dictionary with queue statistics
        """
        try:
            # Get counts by status
            response = self.supabase.rpc(
                "get_sync_queue_stats", 
                {}
            ).execute()
            
            if response.get("error"):
                logger.error(f"Error getting queue stats: {response.get('error')}")
                return {
                    "pending": 0,
                    "running": 0,
                    "retrying": 0,
                    "completed": 0,
                    "failed": 0,
                    "cancelled": 0
                }
                
            # Return the stats
            return response.get("data", {})
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {str(e)}")
            return {
                "pending": 0,
                "running": 0,
                "retrying": 0, 
                "completed": 0,
                "failed": 0,
                "cancelled": 0
            }

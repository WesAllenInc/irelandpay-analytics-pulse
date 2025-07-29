#!/usr/bin/env python
"""
Sync Queue Processor for Ireland Pay Analytics

This script processes jobs from the sync_queue table, handling retries with exponential backoff.
It's designed to run as a background service or scheduled task.
"""

import os
import time
import json
import logging
import random
import traceback
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import requests
from supabase import create_client, Client

from iriscrm_sync import IrisCrmSync, TransactionClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("sync_queue_processor")

# Constants
MAX_RETRIES = 5
BASE_RETRY_DELAY = 30  # seconds
MAX_RETRY_DELAY = 3600  # 1 hour
PROCESSING_INTERVAL = 15  # seconds
MAX_CONSECUTIVE_ERRORS = 3

class QueueProcessor:
    """Processes sync jobs from the sync_queue table."""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize the queue processor.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase = create_client(supabase_url, supabase_key)
        self.running = False
        self.consecutive_errors = 0
        
    def start(self, single_job: bool = False) -> None:
        """Start the queue processor.
        
        Args:
            single_job: If True, process only one job and exit
        """
        self.running = True
        logger.info("Starting sync queue processor")
        
        try:
            while self.running:
                try:
                    job = self._get_next_job()
                    if job:
                        logger.info(f"Processing job: {job['id']} - Type: {job['job_type']}")
                        self._process_job(job)
                        self.consecutive_errors = 0
                    else:
                        logger.debug("No jobs to process")
                        
                    if single_job:
                        logger.info("Single job mode - exiting")
                        break
                        
                    # Wait before checking for more jobs
                    time.sleep(PROCESSING_INTERVAL)
                    
                except Exception as e:
                    self.consecutive_errors += 1
                    logger.error(f"Error processing job queue: {str(e)}")
                    logger.error(traceback.format_exc())
                    
                    if self.consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                        logger.critical(f"Too many consecutive errors ({self.consecutive_errors}), stopping processor")
                        self.running = False
                    else:
                        # Wait longer when errors occur
                        backoff_time = PROCESSING_INTERVAL * (2 ** self.consecutive_errors)
                        logger.info(f"Backing off for {backoff_time} seconds")
                        time.sleep(backoff_time)
        
        finally:
            logger.info("Queue processor stopped")
    
    def stop(self) -> None:
        """Stop the queue processor."""
        logger.info("Stopping queue processor")
        self.running = False
    
    def _get_next_job(self) -> Optional[Dict[str, Any]]:
        """Get the next job to process from the queue.
        
        Returns:
            The next job, or None if no jobs are ready to be processed
        """
        try:
            response = self.supabase.rpc("get_next_sync_job").execute()
            
            if not response.data:
                return None
            
            # Check if we got an empty job object
            job_data = response.data
            if not job_data or not isinstance(job_data, dict) or not job_data.get("id"):
                return None
            
            return job_data
        
        except Exception as e:
            logger.error(f"Error getting next job: {str(e)}")
            return None
    
    def _process_job(self, job: Dict[str, Any]) -> None:
        """Process a single job.
        
        Args:
            job: The job to process
        """
        job_id = job["id"]
        job_type = job["job_type"]
        parameters = job["parameters"] or {}
        retry_count = job.get("retry_count", 0)
        
        # Mark job as running
        self._update_job_status(job_id, "running", started_at=datetime.now().isoformat())
        
        try:
            # Process based on job type
            if job_type in ["merchants", "residuals", "volumes", "all"]:
                result = self._run_sync_job(job_type, parameters)
                success = result.get("success", False)
                
                if success:
                    self._mark_job_completed(job_id, result)
                else:
                    error_message = result.get("error", "Unknown error")
                    self._handle_job_failure(job_id, error_message, retry_count)
            else:
                logger.warning(f"Unknown job type: {job_type}")
                self._mark_job_completed(job_id, {"success": False, "error": f"Unknown job type: {job_type}"})
        
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}")
            logger.error(traceback.format_exc())
            self._handle_job_failure(job_id, str(e), retry_count)
    
    def _run_sync_job(self, job_type: str, parameters: Dict) -> Dict[str, Any]:
        """Run a sync job.
        
        Args:
            job_type: The type of sync job
            parameters: The job parameters
        
        Returns:
            The result of the sync operation
        """
        try:
            year = parameters.get("year")
            month = parameters.get("month")
            force_sync = parameters.get("forceSync", False)
            
            # Create transaction client
            transaction_client = TransactionClient(
                self.supabase_url, 
                self.supabase_key
            )
            
            # Create sync client
            sync_client = IrisCrmSync(
                api_key=os.environ.get("IRELANDPAY_CRM_API_KEY"),
                supabase_url=self.supabase_url,
                supabase_key=self.supabase_key,
                transaction_client=transaction_client
            )
            
            # Run the appropriate sync method
            if job_type == "merchants":
                result = sync_client.sync_merchants(force=force_sync)
            elif job_type == "residuals":
                if year is None or month is None:
                    # Use current month if not specified
                    now = datetime.now()
                    year = year or now.year
                    month = month or now.month
                    
                result = sync_client.sync_residuals(year=year, month=month, force=force_sync)
            elif job_type == "volumes":
                if year is None or month is None:
                    # Use current month if not specified
                    now = datetime.now()
                    year = year or now.year
                    month = month or now.month
                    
                result = sync_client.sync_volumes(year=year, month=month, force=force_sync)
            elif job_type == "all":
                result = sync_client.sync_all(force=force_sync)
            else:
                result = {"success": False, "error": f"Unsupported job type: {job_type}"}
            
            return result
        
        except Exception as e:
            logger.error(f"Error running sync job: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    def _update_job_status(
        self, 
        job_id: str, 
        status: str, 
        started_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        next_retry: Optional[str] = None,
        last_error: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None
    ) -> None:
        """Update a job's status.
        
        Args:
            job_id: The job ID
            status: The new status
            started_at: When the job started
            completed_at: When the job completed
            next_retry: When to retry the job
            last_error: The last error message
            result: The job result
        """
        update_data = {"status": status}
        
        if started_at:
            update_data["started_at"] = started_at
            
        if completed_at:
            update_data["completed_at"] = completed_at
            
        if next_retry:
            update_data["next_retry"] = next_retry
            
        if last_error:
            update_data["last_error"] = last_error
            
        if result:
            update_data["result"] = json.dumps(result)
        
        try:
            self.supabase.table("sync_queue").update(update_data).eq("id", job_id).execute()
        except Exception as e:
            logger.error(f"Error updating job {job_id} status to {status}: {str(e)}")
    
    def _mark_job_completed(self, job_id: str, result: Dict[str, Any]) -> None:
        """Mark a job as completed.
        
        Args:
            job_id: The job ID
            result: The job result
        """
        self._update_job_status(
            job_id=job_id,
            status="completed",
            completed_at=datetime.now().isoformat(),
            result=result
        )
        logger.info(f"Job {job_id} completed successfully")
    
    def _handle_job_failure(self, job_id: str, error_message: str, retry_count: int) -> None:
        """Handle a job failure.
        
        Args:
            job_id: The job ID
            error_message: The error message
            retry_count: The current retry count
        """
        if retry_count >= MAX_RETRIES:
            # Max retries reached, mark as failed
            self._update_job_status(
                job_id=job_id,
                status="failed",
                completed_at=datetime.now().isoformat(),
                last_error=error_message,
                result={"success": False, "error": error_message}
            )
            logger.warning(f"Job {job_id} failed after {retry_count} retries: {error_message}")
        else:
            # Calculate next retry time with exponential backoff and jitter
            new_retry_count = retry_count + 1
            delay_seconds = min(
                BASE_RETRY_DELAY * (2 ** retry_count) + random.uniform(0, 10),
                MAX_RETRY_DELAY
            )
            next_retry = (datetime.now() + timedelta(seconds=delay_seconds)).isoformat()
            
            self._update_job_status(
                job_id=job_id,
                status="retrying",
                last_error=error_message,
                next_retry=next_retry
            )
            
            # Update retry count
            self.supabase.table("sync_queue").update(
                {"retry_count": new_retry_count}
            ).eq("id", job_id).execute()
            
            logger.info(f"Job {job_id} failed, scheduled retry #{new_retry_count} at {next_retry}")

def main():
    """Main entry point for queue processor."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Process sync queue jobs")
    parser.add_argument("--single-job", action="store_true", help="Process a single job and exit")
    args = parser.parse_args()
    
    # Create and start processor
    processor = QueueProcessor(supabase_url, supabase_key)
    
    try:
        processor.start(single_job=args.single_job)
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received, stopping processor")
        processor.stop()

if __name__ == "__main__":
    main()

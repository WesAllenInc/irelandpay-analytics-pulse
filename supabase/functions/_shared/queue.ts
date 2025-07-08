import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { v4 as uuid } from 'https://deno.land/std@0.168.0/uuid/mod.ts';

/**
 * Queue management system for sync jobs
 */

interface QueueJob {
  id?: string;
  job_type: string;
  priority: number;
  status: string;
  payload: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  scheduled_for?: string;
  attempts?: number;
  last_error?: string;
  processed_at?: string;
}

/**
 * Add a job to the queue
 * @param supabase Supabase client
 * @param job Job definition
 * @returns Job ID
 */
export async function addJob(supabase: SupabaseClient, job: QueueJob): Promise<string> {
  // Generate a unique ID if not provided
  const jobId = job.id || uuid();
  
  // Ensure job has all required fields
  const newJob: QueueJob = {
    id: jobId,
    job_type: job.job_type,
    priority: job.priority || 5,
    status: job.status || 'pending',
    payload: job.payload || {},
    scheduled_for: job.scheduled_for || new Date().toISOString(),
    attempts: job.attempts || 0,
  };
  
  // Insert the job into the queue
  const { error } = await supabase
    .from('sync_queue')
    .insert(newJob);
  
  if (error) {
    throw new Error(`Failed to add job to queue: ${error.message}`);
  }
  
  return jobId;
}

/**
 * Get the next job from the queue
 * @param supabase Supabase client
 * @param jobTypes Array of job types to consider
 * @returns Next job or null if queue is empty
 */
export async function getNextJob(
  supabase: SupabaseClient,
  jobTypes: string[] = []
): Promise<QueueJob | null> {
  let query = supabase
    .from('sync_queue')
    .select('*')
    .eq('status', 'pending')
    .is('processed_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  
  // Filter by job types if provided
  if (jobTypes && jobTypes.length > 0) {
    query = query.in('job_type', jobTypes);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get next job: ${error.message}`);
  }
  
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Update job status
 * @param supabase Supabase client
 * @param jobId Job ID
 * @param status New status
 * @param error Optional error message
 */
export async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: string,
  error?: string
): Promise<void> {
  const updates: Partial<QueueJob> = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  // Add processed timestamp for completed/failed jobs
  if (['completed', 'failed'].includes(status)) {
    updates.processed_at = new Date().toISOString();
  }
  
  // Add error message if provided
  if (error) {
    updates.last_error = error;
  }
  
  // Update the job
  const { error: updateError } = await supabase
    .from('sync_queue')
    .update(updates)
    .eq('id', jobId);
  
  if (updateError) {
    throw new Error(`Failed to update job status: ${updateError.message}`);
  }
}

/**
 * Increment job attempt counter and update status
 * @param supabase Supabase client
 * @param jobId Job ID
 * @param error Error message
 * @param maxAttempts Maximum number of attempts before marking as failed
 */
export async function recordJobFailure(
  supabase: SupabaseClient,
  jobId: string,
  error: string,
  maxAttempts = 3
): Promise<void> {
  // Get current job details
  const { data, error: fetchError } = await supabase
    .from('sync_queue')
    .select('attempts')
    .eq('id', jobId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch job details: ${fetchError.message}`);
  }
  
  const attempts = (data?.attempts || 0) + 1;
  const status = attempts >= maxAttempts ? 'failed' : 'pending';
  
  // Calculate backoff for retries (exponential with jitter)
  let delayMinutes = 0;
  if (status === 'pending') {
    const baseDelay = Math.pow(2, attempts) * 5; // 5, 10, 20 minutes
    const jitter = Math.floor(Math.random() * 5); // 0-5 minutes of jitter
    delayMinutes = baseDelay + jitter;
  }
  
  // Calculate new scheduled time with backoff
  const scheduled = new Date();
  scheduled.setMinutes(scheduled.getMinutes() + delayMinutes);
  
  // Update the job
  const { error: updateError } = await supabase
    .from('sync_queue')
    .update({
      status,
      attempts,
      last_error: error,
      scheduled_for: scheduled.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  
  if (updateError) {
    throw new Error(`Failed to record job failure: ${updateError.message}`);
  }
}

/**
 * Get job stats grouped by status
 * @param supabase Supabase client
 * @returns Job statistics
 */
export async function getQueueStats(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  // Execute a stored procedure that returns job stats
  const { data, error } = await supabase.rpc('get_sync_queue_stats');
  
  if (error) {
    throw new Error(`Failed to get queue stats: ${error.message}`);
  }
  
  // Format the response
  const stats: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  
  if (data && Array.isArray(data)) {
    data.forEach((item: {status: string, count: number}) => {
      stats[item.status] = item.count;
    });
  }
  
  return stats;
}

/**
 * Delete old completed or failed jobs
 * @param supabase Supabase client
 * @param maxAgeDays Age in days after which to delete jobs
 * @returns Number of jobs deleted
 */
export async function cleanupOldJobs(
  supabase: SupabaseClient,
  maxAgeDays = 30
): Promise<number> {
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  // Delete old jobs
  const { data, error } = await supabase
    .from('sync_queue')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('updated_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    throw new Error(`Failed to clean up old jobs: ${error.message}`);
  }
  
  return data?.length || 0;
}

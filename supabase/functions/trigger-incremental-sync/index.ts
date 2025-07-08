import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as queue from "../_shared/queue.ts";

// Types for request body
interface IncrementalSyncRequest {
  dataType: string;
  syncScope?: string;
  fullSync?: boolean;
}

// Types for sync job definition
interface SyncJob {
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

// Validate data type
function isValidDataType(dataType: string): boolean {
  const validTypes = ['merchants', 'residuals', 'agents'];
  return validTypes.includes(dataType.toLowerCase());
}

// Validate sync scope (for residuals)
function isValidSyncScope(dataType: string, syncScope?: string): boolean {
  if (!syncScope) return true;
  
  // For residuals, scope should be YYYY-MM format
  if (dataType.toLowerCase() === 'residuals') {
    const monthRegex = /^\d{4}-\d{2}$/;
    return monthRegex.test(syncScope);
  }
  
  return true;
}

// Function to create a sync job
async function createSyncJob(
  supabase: SupabaseClient,
  dataType: string,
  syncScope?: string,
  fullSync = false
): Promise<string> {
  // Build job payload
  const payload = {
    data_type: dataType.toLowerCase(),
    sync_mode: fullSync ? 'full' : 'incremental',
    sync_scope: syncScope || null,
  };

  // Create job in the queue
  const job: SyncJob = {
    job_type: `sync_${dataType.toLowerCase()}`,
    priority: fullSync ? 10 : 5, // Full syncs get higher priority
    status: 'pending',
    payload,
    scheduled_for: new Date().toISOString(),
  };

  // Add job to the queue system
  const jobId = await queue.addJob(supabase, job);
  
  // Log the job creation
  await supabase.from('sync_logs').insert({
    sync_type: dataType.toLowerCase(),
    sync_mode: fullSync ? 'full' : 'incremental',
    sync_scope: syncScope,
    status: 'queued',
    message: `${dataType} sync job queued with ID: ${jobId}`,
  });

  return jobId;
}

// Check API rate limits before proceeding
async function checkApiRateLimits(supabase: SupabaseClient): Promise<{allowed: boolean, reason?: string}> {
  try {
    // Get current rate limit status
    const { data: rateLimits, error } = await supabase
      .from('api_rate_limits')
      .select('*')
      .order('remaining', { ascending: true })
      .limit(1);

    if (error) throw new Error(`Failed to check rate limits: ${error.message}`);
    
    // If we found a rate limit with critical remaining calls
    if (rateLimits && rateLimits.length > 0 && rateLimits[0].remaining < 50) {
      const limit = rateLimits[0];
      return {
        allowed: false,
        reason: `API rate limit near threshold: ${limit.remaining}/${limit.limit} remaining for ${limit.service} ${limit.endpoint}`
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error("Error checking API rate limits:", error);
    // Allow the operation if we can't check (fallback to safe behavior)
    return { allowed: true };
  }
}

// Check if similar sync jobs are already in progress
async function checkExistingJobs(
  supabase: SupabaseClient,
  dataType: string,
  syncScope?: string
): Promise<{allowed: boolean, reason?: string}> {
  try {
    // Check for active jobs of the same type
    const { data: activeJobs, error } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('job_type', `sync_${dataType.toLowerCase()}`)
      .in('status', ['pending', 'processing'])
      .is('processed_at', null);

    if (error) throw new Error(`Failed to check existing jobs: ${error.message}`);
    
    // If there are active jobs with the same type
    if (activeJobs && activeJobs.length > 0) {
      const matchingScope = activeJobs.some(job => {
        const jobScope = job.payload.sync_scope;
        return (!syncScope && !jobScope) || (syncScope === jobScope);
      });
      
      if (matchingScope) {
        return {
          allowed: false,
          reason: `A ${dataType} sync job${syncScope ? ` for ${syncScope}` : ''} is already in progress`
        };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error("Error checking existing jobs:", error);
    // Allow the operation if we can't check (fallback to permissive behavior)
    return { allowed: true };
  }
}

serve(async (req: Request) => {
  try {
    // Get request body
    const requestData: IncrementalSyncRequest = await req.json();
    const { dataType, syncScope, fullSync = false } = requestData;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!dataType) {
      return new Response(
        JSON.stringify({ success: false, message: 'dataType is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidDataType(dataType)) {
      return new Response(
        JSON.stringify({ success: false, message: `Invalid dataType: ${dataType}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidSyncScope(dataType, syncScope)) {
      return new Response(
        JSON.stringify({ success: false, message: `Invalid syncScope: ${syncScope}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check API rate limits if doing an incremental sync
    if (!fullSync) {
      const rateCheckResult = await checkApiRateLimits(supabase);
      if (!rateCheckResult.allowed) {
        return new Response(
          JSON.stringify({ success: false, message: rateCheckResult.reason }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for existing similar jobs
    const jobCheckResult = await checkExistingJobs(supabase, dataType, syncScope);
    if (!jobCheckResult.allowed) {
      return new Response(
        JSON.stringify({ success: false, message: jobCheckResult.reason }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create and queue the sync job
    const jobId = await createSyncJob(supabase, dataType, syncScope, fullSync);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `${dataType} ${fullSync ? 'full' : 'incremental'} sync job queued successfully`,
        jobId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

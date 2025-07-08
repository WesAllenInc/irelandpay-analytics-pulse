import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types for schedule record
interface SyncSchedule {
  id: string;
  data_type: string;
  sync_scope: string | null;
  cron_expression: string;
  frequency: string;
  next_run: string;
}

// Process due schedules and trigger syncs
async function processDueSchedules(supabase: SupabaseClient): Promise<{
  processed: number;
  errors: number;
}> {
  // Get due schedules
  const { data: dueSchedules, error } = await supabase
    .rpc('get_due_sync_schedules', { p_limit: 10 });

  if (error) {
    console.error("Error fetching due schedules:", error.message);
    throw error;
  }

  console.log(`Found ${dueSchedules?.length || 0} due schedules`);

  let processed = 0;
  let errors = 0;

  // Process each due schedule
  if (dueSchedules && dueSchedules.length > 0) {
    for (const schedule of dueSchedules) {
      try {
        // Call trigger-incremental-sync function
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          'trigger-incremental-sync',
          {
            body: {
              dataType: schedule.data_type,
              syncScope: schedule.sync_scope,
              // Use incremental sync by default to reduce API usage
              fullSync: false
            }
          }
        );

        if (syncError) throw new Error(`Sync error: ${syncError.message}`);

        if (syncResult?.success) {
          // Update schedule's next run time
          const { error: updateError } = await supabase
            .rpc('mark_sync_schedule_executed', { p_schedule_id: schedule.id });

          if (updateError) {
            throw new Error(`Schedule update error: ${updateError.message}`);
          }

          // Log successful execution
          await supabase.from('sync_logs').insert({
            sync_type: schedule.data_type,
            sync_mode: 'incremental',
            sync_scope: schedule.sync_scope,
            status: 'scheduled',
            message: `Scheduled sync triggered for ${schedule.data_type}${schedule.sync_scope ? ` (${schedule.sync_scope})` : ''}`,
            job_id: syncResult.jobId
          });

          processed++;
          console.log(`Processed schedule ${schedule.id} for ${schedule.data_type}`);
        } else {
          throw new Error(`Sync failed: ${syncResult?.message || 'Unknown error'}`);
        }
      } catch (err) {
        errors++;
        console.error(`Error processing schedule ${schedule.id}:`, err);

        // Log the error
        await supabase.from('sync_logs').insert({
          sync_type: schedule.data_type,
          sync_mode: 'incremental',
          sync_scope: schedule.sync_scope,
          status: 'error',
          message: `Error processing scheduled sync: ${err.message}`,
        });
      }
    }
  }

  return { processed, errors };
}

serve(async (req: Request) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract authorization token
    const authHeader = req.headers.get('Authorization');
    
    // Check authorization for cron jobs
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Validate token against allowed values
    // In production, this would validate against a stored secret
    const validToken = Deno.env.get('CRON_SECRET');
    if (token !== validToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process due schedules
    const result = await processDueSchedules(supabase);

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${result.processed} schedules with ${result.errors} errors`,
        ...result
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in scheduled-sync-processor:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

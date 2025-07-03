// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SyncOptions {
  dataType?: 'merchants' | 'residuals' | 'volumes' | 'all';
  year?: number;
  month?: number;
  forceSync?: boolean;
}

const IRIS_CRM_API_KEY = Deno.env.get('IRIS_CRM_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!IRIS_CRM_API_KEY) {
  console.error('Missing IRIS_CRM_API_KEY environment variable')
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

/**
 * Execute Python-based IRIS CRM sync
 * This uses the iriscrm_sync.py module to handle the actual synchronization
 */
async function executePythonSync(options: SyncOptions) {
  try {
    // The Python script path
    const scriptPath = './iriscrm_sync.py'
    
    // Generate command arguments based on options
    const args = ['python', scriptPath]
    
    if (options.dataType) {
      args.push('--data-type', options.dataType)
    }
    
    if (options.year) {
      args.push('--year', options.year.toString())
    }
    
    if (options.month) {
      args.push('--month', options.month.toString())
    }
    
    if (options.forceSync) {
      args.push('--force')
    }
    
    // Execute the Python script
    const command = new Deno.Command('python', {
      args: args.slice(1), // Skip the 'python' command as it's already included
      env: {
        'IRIS_CRM_API_KEY': IRIS_CRM_API_KEY || '',
        'SUPABASE_URL': SUPABASE_URL || '',
        'SUPABASE_SERVICE_ROLE_KEY': SUPABASE_SERVICE_ROLE_KEY || '',
      }
    })

    const { stdout, stderr, success } = await command.output()
    
    if (!success) {
      const errorMessage = new TextDecoder().decode(stderr)
      console.error('Python sync failed:', errorMessage)
      return { success: false, error: errorMessage }
    }
    
    const output = new TextDecoder().decode(stdout)
    try {
      return JSON.parse(output)
    } catch (e) {
      console.error('Failed to parse Python output as JSON:', e)
      return { success: false, error: 'Failed to parse Python output', output }
    }
  } catch (error) {
    console.error('Failed to execute Python sync:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Checks if a sync is already in progress
 */
async function isSyncInProgress(supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('sync_status')
    .select('*')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error checking sync status:', error)
    return false
  }

  return data && data.length > 0
}

/**
 * Creates or updates the sync status record
 */
async function updateSyncStatus(
  supabase: any, 
  status: 'in_progress' | 'completed' | 'failed',
  dataType: string,
  results: any = null
): Promise<void> {
  const timestamp = new Date().toISOString()
  
  // Check for an in-progress sync
  if (status === 'in_progress') {
    const { data } = await supabase
      .from('sync_status')
      .insert({
        status,
        data_type: dataType,
        started_at: timestamp,
      })
      .select()
    
    console.log('Created sync status record:', data)
  } else {
    // Update the most recent in-progress sync
    const { data: syncRecords } = await supabase
      .from('sync_status')
      .select('*')
      .eq('status', 'in_progress')
      .eq('data_type', dataType)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (syncRecords && syncRecords.length > 0) {
      const syncId = syncRecords[0].id
      
      const { data } = await supabase
        .from('sync_status')
        .update({
          status,
          completed_at: timestamp,
          results: results || {},
        })
        .eq('id', syncId)
        .select()
      
      console.log(`Updated sync status to ${status}:`, data)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(
      SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    // Parse request body
    const { dataType = 'all', year, month, forceSync = false } = await req.json() as SyncOptions
    
    // Check if a sync is already in progress, unless forcing a new sync
    if (!forceSync && await isSyncInProgress(supabase)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A sync operation is already in progress. Please try again later or use forceSync=true to override.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        }
      )
    }
    
    // Update sync status to in_progress
    await updateSyncStatus(supabase, 'in_progress', dataType)
    
    // Execute the sync
    const syncResults = await executePythonSync({
      dataType: dataType as any,
      year,
      month,
      forceSync
    })
    
    // Update sync status based on results
    if (syncResults.success === false) {
      await updateSyncStatus(supabase, 'failed', dataType, syncResults)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: syncResults.error || 'Sync failed',
          details: syncResults
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
    
    // Sync was successful
    await updateSyncStatus(supabase, 'completed', dataType, syncResults)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${dataType} data`,
        details: syncResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
    
  } catch (error) {
    console.error('Error in sync-iriscrm function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

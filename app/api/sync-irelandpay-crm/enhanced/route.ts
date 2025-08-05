import { NextResponse } from 'next/server';
import { requireAdmin } from '@/middleware/admin-auth';
import { IrelandPaySyncManager } from '@/lib/sync/ireland-pay-sync-manager';
import { DailySyncManager } from '@/lib/sync/daily-sync-manager';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  // Check admin authorization
  const adminError = await requireAdmin(request as any);
  if (adminError) return adminError;

  const supabase = createSupabaseServerClient();

  try {
    const body = await request.json();
    const { syncType, apiKey, baseUrl } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key is required'
      }, { status: 400 });
    }

    // Check if a sync is already in progress
    const { data: activeSyncs } = await supabase
      .from('sync_jobs')
      .select('*')
      .in('status', ['pending', 'running'])
      .limit(1);

    if (activeSyncs && activeSyncs.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'A sync is already in progress',
        activeSyncId: activeSyncs[0].id
      }, { status: 409 });
    }

    // Create sync job record
    const { data: syncJob, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        sync_type: syncType || 'manual',
        status: 'pending',
        triggered_by: 'manual',
        triggered_by_user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json({
        success: false,
        error: `Failed to create sync job: ${jobError.message}`
      }, { status: 500 });
    }

    // Initialize appropriate sync manager
    let syncManager: IrelandPaySyncManager;
    if (syncType === 'daily') {
      syncManager = new DailySyncManager(apiKey, baseUrl);
    } else {
      syncManager = new IrelandPaySyncManager(apiKey, baseUrl);
    }

    // Start sync in background
    const startSync = async () => {
      try {
        // Update job status to running
        await supabase
          .from('sync_jobs')
          .update({ status: 'running' })
          .eq('id', syncJob.id);

        let result;
        if (syncType === 'daily') {
          result = await (syncManager as DailySyncManager).performDailySync();
        } else {
          result = await syncManager.performInitialSync(async (progress) => {
            // Update progress in database
            await supabase
              .from('sync_progress')
              .upsert({
                sync_id: syncJob.id,
                phase: progress.phase,
                progress: progress.progress,
                message: progress.message,
                details: progress.details,
                last_update: progress.lastUpdate.toISOString()
              });
          });
        }

        // Update job with results
        await supabase
          .from('sync_jobs')
          .update({
            status: result.success ? 'completed' : 'failed',
            completed_at: result.endTime.toISOString(),
            results: {
              merchants: result.totalMerchants || result.merchants,
              transactions: result.totalTransactions || result.transactions,
              residuals: result.totalResiduals || result.residuals,
              errors: result.errors
            },
            error_details: result.errors.length > 0 ? { errors: result.errors } : null
          })
          .eq('id', syncJob.id);

      } catch (error) {
        console.error('Sync failed:', error);
        
        // Update job with error
        await supabase
          .from('sync_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_details: {
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          })
          .eq('id', syncJob.id);
      }
    };

    // Start sync in background (don't await)
    startSync();

    return NextResponse.json({
      success: true,
      message: 'Sync started successfully',
      syncId: syncJob.id
    });

  } catch (error) {
    console.error('Failed to start sync:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Check admin authorization
  const adminError = await requireAdmin(request as any);
  if (adminError) return adminError;

  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const syncId = searchParams.get('syncId');

  try {
    if (syncId) {
      // Get specific sync job
      const { data: syncJob, error } = await supabase
        .from('sync_jobs')
        .select(`
          *,
          sync_progress (*)
        `)
        .eq('id', syncId)
        .single();

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Sync job not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: syncJob
      });

    } else {
      // Get all sync jobs
      const { data: syncJobs, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch sync jobs'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: syncJobs
      });
    }

  } catch (error) {
    console.error('Failed to fetch sync data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
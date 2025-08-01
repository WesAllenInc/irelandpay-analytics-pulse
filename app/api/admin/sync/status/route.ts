import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminContext } from '@/middleware/admin-auth';
import { createClient } from '@/lib/supabase/server';

async function getSyncStatus(req: NextRequest, { admin }: AdminContext) {
  try {
    const supabase = createClient();

    // Get the latest sync log
    const { data: latestSync, error: syncError } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      console.error('Error fetching sync status:', syncError);
    }

    // Get sync statistics
    const { data: syncStats, error: statsError } = await supabase
      .from('sync_logs')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (statsError) {
      console.error('Error fetching sync stats:', statsError);
    }

    // Calculate statistics
    const totalSyncs = syncStats?.length || 0;
    const successfulSyncs = syncStats?.filter(s => s.status === 'completed').length || 0;
    const failedSyncs = syncStats?.filter(s => s.status === 'failed').length || 0;
    const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

    const status = {
      lastSyncTime: latestSync?.completed_at || null,
      status: latestSync?.status || 'unknown',
      totalRecords: latestSync?.merchants_count || 0,
      errors: latestSync?.errors || [],
      duration: latestSync?.duration_ms || 0,
      statistics: {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        successRate: Math.round(successRate * 100) / 100
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getSyncStatus); 
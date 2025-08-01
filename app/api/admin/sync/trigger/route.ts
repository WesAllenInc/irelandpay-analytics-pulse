import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminContext } from '@/middleware/admin-auth';
import { adminService } from '@/lib/auth/admin-service';

async function triggerManualSync(req: NextRequest, { admin }: AdminContext) {
  try {
    // Log the sync trigger
    await adminService.logAdminAction(
      admin.user_id,
      'sync.manual.trigger',
      'sync',
      undefined,
      { 
        triggered_at: new Date().toISOString(),
        method: req.method 
      }
    );

    // Here you would trigger the actual sync operation
    // For now, we'll simulate a sync process
    const syncResult = {
      success: true,
      message: 'Sync triggered successfully',
      syncId: `sync_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Log the sync completion
    await adminService.logAdminAction(
      admin.user_id,
      'sync.manual.completed',
      'sync',
      syncResult.syncId,
      { 
        result: syncResult,
        completed_at: new Date().toISOString()
      }
    );

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error('Error triggering sync:', error);
    
    // Log the sync failure
    await adminService.logAdminAction(
      admin.user_id,
      'sync.manual.failed',
      'sync',
      undefined,
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString()
      }
    );

    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(triggerManualSync); 
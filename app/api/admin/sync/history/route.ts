import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminContext } from '@/middleware/admin-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getSyncHistory(req: NextRequest, { admin }: AdminContext) {
  try {
    const supabase = createSupabaseServerClient();

    // Get sync history with pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: syncHistory, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching sync history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sync history' },
        { status: 500 }
      );
    }

    return NextResponse.json(syncHistory || []);
  } catch (error) {
    console.error('Error getting sync history:', error);
    return NextResponse.json(
      { error: 'Failed to get sync history' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getSyncHistory); 
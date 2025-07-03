import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export interface SyncOptions {
  dataType?: 'merchants' | 'residuals' | 'volumes' | 'all';
  year?: number;
  month?: number;
  forceSync?: boolean;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  syncId?: string;
}

/**
 * Trigger a sync operation with IRIS CRM API
 */
export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient()
  
  try {
    // Parse request body
    const body: SyncOptions = await request.json()
    const { dataType = 'all', year, month, forceSync = false } = body
    
    // Check if a sync is already in progress, unless forcing a new sync
    if (!forceSync) {
      const { data: syncStatus } = await supabase
        .from('sync_status')
        .select('*')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (syncStatus && syncStatus.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'A sync operation is already in progress. Please try again later or use forceSync=true to override.',
        }, { status: 409 }) // Conflict
      }
    }
    
    // Call the edge function to start the sync
    const { data, error } = await supabase.functions.invoke('sync-iriscrm', {
      body: JSON.stringify({
        dataType,
        year,
        month,
        forceSync
      })
    })
    
    if (error) {
      console.error('Error invoking sync-iriscrm function:', error)
      
      return NextResponse.json({
        success: false,
        error: `Failed to start sync operation: ${error.message}`,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully started ${dataType} sync operation`,
      details: data,
      syncId: data?.syncId
    })
    
  } catch (error: any) {
    console.error('Error in sync-iriscrm API route:', error)
    
    return NextResponse.json({
      success: false,
      error: `Failed to start sync operation: ${error.message}`,
    }, { status: 500 })
  }
}

/**
 * Get the status of sync operations
 */
export async function GET(request: Request) {
  const supabase = createSupabaseServiceClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const syncId = searchParams.get('syncId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    
    let query = supabase
      .from('sync_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (syncId) {
      query = query.eq('id', syncId)
    }
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch sync status: ${error.message}`,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data
    })
    
  } catch (error: any) {
    console.error('Error in sync-iriscrm status API route:', error)
    
    return NextResponse.json({
      success: false,
      error: `Failed to fetch sync status: ${error.message}`,
    }, { status: 500 })
  }
}

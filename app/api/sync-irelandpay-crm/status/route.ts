import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

/**
 * Check Ireland Pay CRM API connection status
 */
export async function GET() {
  const supabase = createSupabaseServiceClient()
  
  try {
    // Check if we have the required environment variables
    const hasApiKey = !!process.env.IRELANDPAY_CRM_API_KEY
    const hasBaseUrl = !!process.env.IRELANDPAY_CRM_BASE_URL
    
    if (!hasApiKey || !hasBaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Ireland Pay CRM API credentials not configured',
        details: {
          hasApiKey,
          hasBaseUrl
        }
      }, { status: 503 })
    }

    // Check if there are any recent successful syncs
    const { data: recentSyncs, error: syncError } = await supabase
      .from('sync_status')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (syncError) {
      console.error('Error checking sync status:', syncError)
    }

    // Check if there are any active schedules
    const { data: activeSchedules, error: scheduleError } = await supabase
      .from('sync_schedules')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    if (scheduleError) {
      console.error('Error checking schedules:', scheduleError)
    }

    // Determine overall status
    const hasRecentSync = recentSyncs && recentSyncs.length > 0
    const hasActiveSchedules = activeSchedules && activeSchedules.length > 0
    const lastSyncDate = hasRecentSync ? recentSyncs[0].created_at : null

    // Calculate status based on various factors
    let status = 'connected'
    let message = 'API connection is healthy'
    
    if (!hasApiKey || !hasBaseUrl) {
      status = 'disconnected'
      message = 'API credentials not configured'
    } else if (!hasRecentSync) {
      status = 'warning'
      message = 'No recent sync activity detected'
    }

    return NextResponse.json({
      success: true,
      status,
      message,
      details: {
        hasApiKey,
        hasBaseUrl,
        hasRecentSync,
        hasActiveSchedules,
        lastSyncDate,
        activeSchedulesCount: activeSchedules?.length || 0
      }
    })
    
  } catch (error: any) {
    console.error('Error checking API status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check API status',
      details: error.message
    }, { status: 500 })
  }
} 
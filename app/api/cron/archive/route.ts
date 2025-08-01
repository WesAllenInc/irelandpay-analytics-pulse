import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = headers().get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not set')
    return new Response('Server configuration error', { status: 500 })
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Invalid cron authorization header')
    return new Response('Unauthorized', { status: 401 })
  }
  
  try {
    console.log('Starting data archival process at', new Date().toISOString())
    
    const supabase = createSupabaseServiceClient()
    
    // Calculate cutoff date (3 months ago)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 3)
    
    // Run the archival process
    const { data: archiveResults, error } = await supabase.rpc('archive_old_data', { 
      cutoff_date: cutoffDate.toISOString() 
    })
    
    if (error) {
      console.error('Archive process failed:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      )
    }
    
    // Calculate total archived records
    const totalArchived = archiveResults?.reduce((sum: number, result: any) => 
      sum + (result.archived_count || 0), 0) || 0
    
    console.log('Data archival completed successfully:', {
      totalArchived,
      results: archiveResults
    })
    
    return NextResponse.json({
      success: true,
      message: 'Data archival completed',
      timestamp: new Date().toISOString(),
      cutoffDate: cutoffDate.toISOString(),
      totalArchived,
      results: archiveResults
    })
    
  } catch (error) {
    console.error('Data archival failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
} 
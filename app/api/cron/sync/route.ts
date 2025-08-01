import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { performScheduledSync } from '@/lib/sync-manager'
import { notifyAdmin } from '@/lib/email/notifications'

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
    console.log('Starting scheduled sync at', new Date().toISOString())
    
    const result = await performScheduledSync()
    
    console.log('Scheduled sync completed successfully:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled sync completed',
      timestamp: new Date().toISOString(),
      stats: result.stats
    })
  } catch (error) {
    console.error('Scheduled sync failed:', error)
    
    // Send notification to admin about the failure
    try {
      await notifyAdmin(
        'Scheduled Sync Failed',
        `The scheduled sync encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }
    
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
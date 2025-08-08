import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase'

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
    
    // Trigger the sync via the enhanced sync endpoint (server reads API key from env)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sync-irelandpay-crm/enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}` // Use cron secret for internal auth
      },
      body: JSON.stringify({ syncType: 'daily' })
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('Scheduled sync completed successfully:', result)
      
      return NextResponse.json({
        success: true,
        message: 'Scheduled sync completed',
        timestamp: new Date().toISOString(),
        data: result.data
      })
    } else {
      throw new Error(result.error || 'Sync failed')
    }
  } catch (error) {
    console.error('Scheduled sync failed:', error)
    
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

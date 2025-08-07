import { NextResponse } from 'next/server'
import { SyncLogger } from '@/lib/sync-logger'

export async function GET(request: Request) {
  const logger = new SyncLogger()
  
  try {
    const { searchParams } = new URL(request.url)
    const syncId = searchParams.get('syncId')
    
    if (!syncId) {
      return NextResponse.json({
        success: false,
        error: 'Sync ID is required'
      }, { status: 400 })
    }
    
    await logger.info('Fetching sync progress', { syncId })
    
    // Simulate detailed progress based on sync ID
    // In a real implementation, this would fetch from database
    const progress = {
      syncId,
      status: 'running',
      currentPhase: 'merchants',
      totalPhases: 5,
      currentPhaseIndex: 2,
      phases: [
        { 
          name: 'initializing', 
          description: 'Setting up sync environment', 
          progress: 100,
          status: 'completed',
          startTime: new Date(Date.now() - 30000).toISOString(),
          endTime: new Date(Date.now() - 25000).toISOString()
        },
        { 
          name: 'merchants', 
          description: 'Syncing merchant data', 
          progress: 75,
          status: 'running',
          startTime: new Date(Date.now() - 25000).toISOString(),
          endTime: null,
          details: {
            totalMerchants: 150,
            processedMerchants: 112,
            currentMerchant: 'Merchant ABC123',
            errors: 0
          }
        },
        { 
          name: 'residuals', 
          description: 'Syncing residuals data', 
          progress: 0,
          status: 'pending',
          startTime: null,
          endTime: null
        },
        { 
          name: 'volumes', 
          description: 'Syncing volume data', 
          progress: 0,
          status: 'pending',
          startTime: null,
          endTime: null
        },
        { 
          name: 'completing', 
          description: 'Finalizing sync process', 
          progress: 0,
          status: 'pending',
          startTime: null,
          endTime: null
        }
      ],
      overallProgress: 35, // (100 + 75 + 0 + 0 + 0) / 5
      startTime: new Date(Date.now() - 30000).toISOString(),
      estimatedTimeRemaining: '2 minutes',
      currentActivity: 'Processing merchant data - 112 of 150 merchants completed',
      recentLogs: [
        {
          timestamp: new Date(Date.now() - 5000).toISOString(),
          message: 'Processed merchant ABC123 successfully',
          level: 'info'
        },
        {
          timestamp: new Date(Date.now() - 10000).toISOString(),
          message: 'Retrieved 150 merchants from Ireland Pay CRM',
          level: 'info'
        },
        {
          timestamp: new Date(Date.now() - 15000).toISOString(),
          message: 'Starting merchant data sync',
          level: 'info'
        }
      ]
    }
    
    await logger.info('Sync progress retrieved', { syncId, overallProgress: progress.overallProgress })
    
    return NextResponse.json({
      success: true,
      data: progress
    })
    
  } catch (error) {
    await logger.error('Error fetching sync progress', { error })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sync progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

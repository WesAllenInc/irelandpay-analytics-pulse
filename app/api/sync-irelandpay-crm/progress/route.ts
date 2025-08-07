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
    
    // Simulate detailed progress based on sync ID and time
    // In a real implementation, this would fetch from database
    const startTime = new Date(Date.now() - 30000); // 30 seconds ago
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    
    // Simulate progress based on elapsed time
    let currentPhaseIndex = 0;
    let overallProgress = 0;
    let currentPhase = 'initializing';
    let status = 'running';
    
    if (elapsedSeconds < 5) {
      currentPhaseIndex = 0;
      overallProgress = Math.min(20, elapsedSeconds * 4);
      currentPhase = 'initializing';
    } else if (elapsedSeconds < 20) {
      currentPhaseIndex = 1;
      overallProgress = 20 + Math.min(40, (elapsedSeconds - 5) * 2.67);
      currentPhase = 'merchants';
    } else if (elapsedSeconds < 35) {
      currentPhaseIndex = 2;
      overallProgress = 60 + Math.min(20, (elapsedSeconds - 20) * 1.33);
      currentPhase = 'residuals';
    } else if (elapsedSeconds < 50) {
      currentPhaseIndex = 3;
      overallProgress = 80 + Math.min(15, (elapsedSeconds - 35) * 1);
      currentPhase = 'volumes';
    } else if (elapsedSeconds < 60) {
      currentPhaseIndex = 4;
      overallProgress = 95 + Math.min(5, (elapsedSeconds - 50) * 0.5);
      currentPhase = 'completing';
    } else {
      currentPhaseIndex = 4;
      overallProgress = 100;
      currentPhase = 'completing';
      status = 'completed';
    }
    
    const progress = {
      syncId,
      status,
      currentPhase,
      totalPhases: 5,
      currentPhaseIndex,
      phases: [
        { 
          name: 'initializing', 
          description: 'Setting up sync environment', 
          progress: elapsedSeconds < 5 ? Math.min(100, elapsedSeconds * 20) : 100,
          status: elapsedSeconds < 5 ? 'running' : 'completed',
          startTime: startTime.toISOString(),
          endTime: elapsedSeconds >= 5 ? new Date(startTime.getTime() + 5000).toISOString() : null
        },
        { 
          name: 'merchants', 
          description: 'Syncing merchant data', 
          progress: elapsedSeconds < 5 ? 0 : elapsedSeconds < 20 ? Math.min(100, (elapsedSeconds - 5) * 6.67) : 100,
          status: elapsedSeconds < 5 ? 'pending' : elapsedSeconds < 20 ? 'running' : 'completed',
          startTime: elapsedSeconds >= 5 ? new Date(startTime.getTime() + 5000).toISOString() : null,
          endTime: elapsedSeconds >= 20 ? new Date(startTime.getTime() + 20000).toISOString() : null,
          details: elapsedSeconds >= 5 && elapsedSeconds < 20 ? {
            totalMerchants: 150,
            processedMerchants: Math.floor((elapsedSeconds - 5) * 10),
            currentMerchant: `Merchant ABC${Math.floor((elapsedSeconds - 5) * 10)}`,
            errors: 0
          } : null
        },
        { 
          name: 'residuals', 
          description: 'Syncing residuals data', 
          progress: elapsedSeconds < 20 ? 0 : elapsedSeconds < 35 ? Math.min(100, (elapsedSeconds - 20) * 6.67) : 100,
          status: elapsedSeconds < 20 ? 'pending' : elapsedSeconds < 35 ? 'running' : 'completed',
          startTime: elapsedSeconds >= 20 ? new Date(startTime.getTime() + 20000).toISOString() : null,
          endTime: elapsedSeconds >= 35 ? new Date(startTime.getTime() + 35000).toISOString() : null,
          details: elapsedSeconds >= 20 && elapsedSeconds < 35 ? {
            totalResiduals: 1200,
            processedResiduals: Math.floor((elapsedSeconds - 20) * 80),
            currentResidual: `Residual ${Math.floor((elapsedSeconds - 20) * 80)}`,
            errors: 0
          } : null
        },
        { 
          name: 'volumes', 
          description: 'Syncing volume data', 
          progress: elapsedSeconds < 35 ? 0 : elapsedSeconds < 50 ? Math.min(100, (elapsedSeconds - 35) * 6.67) : 100,
          status: elapsedSeconds < 35 ? 'pending' : elapsedSeconds < 50 ? 'running' : 'completed',
          startTime: elapsedSeconds >= 35 ? new Date(startTime.getTime() + 35000).toISOString() : null,
          endTime: elapsedSeconds >= 50 ? new Date(startTime.getTime() + 50000).toISOString() : null,
          details: elapsedSeconds >= 35 && elapsedSeconds < 50 ? {
            totalVolumes: 800,
            processedVolumes: Math.floor((elapsedSeconds - 35) * 53.33),
            currentVolume: `Volume ${Math.floor((elapsedSeconds - 35) * 53.33)}`,
            errors: 0
          } : null
        },
        { 
          name: 'completing', 
          description: 'Finalizing sync process', 
          progress: elapsedSeconds < 50 ? 0 : Math.min(100, (elapsedSeconds - 50) * 10),
          status: elapsedSeconds < 50 ? 'pending' : elapsedSeconds < 60 ? 'running' : 'completed',
          startTime: elapsedSeconds >= 50 ? new Date(startTime.getTime() + 50000).toISOString() : null,
          endTime: elapsedSeconds >= 60 ? new Date(startTime.getTime() + 60000).toISOString() : null
        }
      ],
      overallProgress: Math.round(overallProgress),
      startTime: startTime.toISOString(),
      estimatedTimeRemaining: status === 'completed' ? null : `${Math.max(0, 60 - elapsedSeconds)} seconds`,
      currentActivity: status === 'completed' ? 'Sync completed successfully' : 
        currentPhase === 'initializing' ? 'Setting up sync environment' :
        currentPhase === 'merchants' ? `Processing merchant data - ${Math.floor((elapsedSeconds - 5) * 10)} of 150 merchants completed` :
        currentPhase === 'residuals' ? `Processing residuals data - ${Math.floor((elapsedSeconds - 20) * 80)} of 1200 residuals completed` :
        currentPhase === 'volumes' ? `Processing volume data - ${Math.floor((elapsedSeconds - 35) * 53.33)} of 800 volumes completed` :
        'Finalizing sync process',
      recentLogs: [
        {
          timestamp: new Date(Date.now() - 2000).toISOString(),
          message: status === 'completed' ? 'Sync completed successfully' : `Processing ${currentPhase} data`,
          level: 'info'
        },
        {
          timestamp: new Date(Date.now() - 5000).toISOString(),
          message: 'Retrieved data from Ireland Pay CRM',
          level: 'info'
        },
        {
          timestamp: new Date(Date.now() - 10000).toISOString(),
          message: 'Starting data synchronization',
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

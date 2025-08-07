'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, Clock, AlertCircle, Play, Loader2 } from 'lucide-react'

interface SyncPhase {
  name: string
  description: string
  progress: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  details?: any
}

interface SyncProgress {
  syncId: string
  status: 'running' | 'completed' | 'failed'
  currentPhase: string
  totalPhases: number
  currentPhaseIndex: number
  phases: SyncPhase[]
  overallProgress: number
  startTime: string
  estimatedTimeRemaining?: string
  currentActivity?: string
  recentLogs?: Array<{
    timestamp: string
    message: string
    level: string
  }>
}

interface DetailedSyncProgressProps {
  syncId?: string
  onComplete?: () => void
}

export function DetailedSyncProgress({ syncId, onComplete }: DetailedSyncProgressProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = async () => {
    if (!syncId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/sync-irelandpay-crm/progress?syncId=${syncId}`)
      const result = await response.json()
      
      if (result.success) {
        setProgress(result.data)
        
        // If sync is completed, call onComplete callback
        if (result.data.status === 'completed' && onComplete) {
          onComplete()
        }
      } else {
        setError(result.error || 'Failed to fetch progress')
      }
    } catch (err) {
      setError('Failed to fetch progress')
      console.error('Error fetching sync progress:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (syncId) {
      fetchProgress()
      
      // Poll for progress updates every 2 seconds
      const interval = setInterval(fetchProgress, 2000)
      
      return () => clearInterval(interval)
    }
  }, [syncId])

  const getPhaseIcon = (phase: SyncPhase) => {
    switch (phase.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getPhaseBadge = (phase: SyncPhase) => {
    const variants = {
      completed: 'default',
      running: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    } as const

    return (
      <Badge variant={variants[phase.status]} className="text-xs">
        {phase.status.toUpperCase()}
      </Badge>
    )
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h ${Math.round((duration % 3600) / 60)}m`
  }

  if (!syncId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Sync Progress
          </CardTitle>
          <CardDescription>No active sync job</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading && !progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Sync Progress
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Sync Progress Error
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Sync Progress Not Found
          </CardTitle>
          <CardDescription>No progress data available for sync ID: {syncId}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className={`h-5 w-5 ${progress.status === 'running' ? 'animate-spin' : ''}`} />
          Sync Progress
        </CardTitle>
        <CardDescription>
          {progress.currentActivity || `Phase ${progress.currentPhaseIndex + 1} of ${progress.totalPhases}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{progress.overallProgress}%</span>
          </div>
          <Progress value={progress.overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Started: {new Date(progress.startTime).toLocaleTimeString()}</span>
            {progress.estimatedTimeRemaining && (
              <span>ETA: {progress.estimatedTimeRemaining}</span>
            )}
          </div>
        </div>

        {/* Phase Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Sync Phases</h4>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {progress.phases.map((phase, index) => (
                <div
                  key={phase.name}
                  className={`p-3 border rounded-lg ${
                    phase.status === 'running' ? 'border-blue-200 bg-blue-50' :
                    phase.status === 'completed' ? 'border-green-200 bg-green-50' :
                    phase.status === 'failed' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getPhaseIcon(phase)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{phase.description}</span>
                          {getPhaseBadge(phase)}
                        </div>
                        
                        {phase.progress > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span>{phase.progress}%</span>
                            </div>
                            <Progress value={phase.progress} className="h-1" />
                          </div>
                        )}
                        
                        {phase.details && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {phase.details.totalMerchants && (
                              <div>Processed: {phase.details.processedMerchants} / {phase.details.totalMerchants}</div>
                            )}
                            {phase.details.currentMerchant && (
                              <div>Current: {phase.details.currentMerchant}</div>
                            )}
                            {phase.details.errors > 0 && (
                              <div className="text-red-600">Errors: {phase.details.errors}</div>
                            )}
                          </div>
                        )}
                        
                        {phase.startTime && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Duration: {formatDuration(phase.startTime, phase.endTime)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Recent Logs */}
        {progress.recentLogs && progress.recentLogs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {progress.recentLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground min-w-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

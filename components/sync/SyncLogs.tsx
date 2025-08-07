'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react'

interface SyncLog {
  id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  details?: any
  sync_id?: string
  timestamp: string
  user_id?: string
}

export function SyncLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/sync-logs?limit=50')
      const result = await response.json()
      
      if (result.success) {
        setLogs(result.data)
      } else {
        setError(result.error || 'Failed to fetch logs')
      }
    } catch (err) {
      setError('Failed to fetch logs')
      console.error('Error fetching sync logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const getLevelIcon = (level: SyncLog['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'debug':
        return <Bug className="h-4 w-4 text-gray-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getLevelBadge = (level: SyncLog['level']) => {
    const variants = {
      error: 'destructive',
      warn: 'secondary',
      debug: 'outline',
      info: 'default'
    } as const

    return (
      <Badge variant={variants[level]} className="text-xs">
        {level.toUpperCase()}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear old logs? This will remove logs older than 30 days.')) {
      return
    }

    try {
      const response = await fetch('/api/sync-logs?daysToKeep=30', { method: 'DELETE' })
      const result = await response.json()
      
      if (result.success) {
        fetchLogs() // Refresh the logs
      } else {
        setError(result.error || 'Failed to clear logs')
      }
    } catch (err) {
      setError('Failed to clear logs')
      console.error('Error clearing sync logs:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Logs
            </CardTitle>
            <CardDescription>
              Recent synchronization activity and error logs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
            >
              Clear Old
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No sync logs found</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getLevelBadge(log.level)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.sync_id && (
                            <span className="text-xs text-muted-foreground">
                              Sync: {log.sync_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium">{log.message}</p>
                        {log.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

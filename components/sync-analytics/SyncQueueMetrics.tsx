import React from "react"
import { SyncQueueStats } from "../../hooks/useSyncAnalytics"
import { Card, CardContent } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"

interface SyncQueueMetricsProps {
  queueStats: SyncQueueStats | null
}

export function SyncQueueMetrics({ queueStats }: SyncQueueMetricsProps) {
  if (!queueStats) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No queue data available</p>
      </div>
    )
  }

  // Calculate percentages for the progress bars
  const total = queueStats.total || 1; // Avoid division by zero
  const completedPercent = (queueStats.completed / total) * 100;
  const failedPercent = (queueStats.failed / total) * 100;
  const pendingPercent = (queueStats.pending / total) * 100;
  const runningPercent = (queueStats.running / total) * 100;
  const retryingPercent = (queueStats.retrying / total) * 100;
  const cancelledPercent = (queueStats.cancelled / total) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <QueueStatCard
          label="Total Jobs"
          value={queueStats.total}
          color="bg-blue-500"
        />
        <QueueStatCard
          label="Completed"
          value={queueStats.completed}
          color="bg-green-500"
        />
        <QueueStatCard
          label="Failed"
          value={queueStats.failed}
          color="bg-red-500"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <QueueStatProgress
              label="Completed"
              value={queueStats.completed}
              percent={completedPercent}
              color="bg-green-500"
            />
            
            <QueueStatProgress
              label="Pending"
              value={queueStats.pending}
              percent={pendingPercent}
              color="bg-blue-500"
            />
            
            <QueueStatProgress
              label="Running"
              value={queueStats.running}
              percent={runningPercent}
              color="bg-purple-500"
            />
            
            <QueueStatProgress
              label="Retrying"
              value={queueStats.retrying}
              percent={retryingPercent}
              color="bg-amber-500"
            />
            
            <QueueStatProgress
              label="Failed"
              value={queueStats.failed}
              percent={failedPercent}
              color="bg-red-500"
            />
            
            <QueueStatProgress
              label="Cancelled"
              value={queueStats.cancelled}
              percent={cancelledPercent}
              color="bg-gray-500"
            />
          </div>
        </CardContent>
      </Card>
      
      {(queueStats.next_retry || queueStats.oldest_pending) && (
        <div className="text-sm text-muted-foreground space-y-1">
          {queueStats.oldest_pending && (
            <p>Oldest pending job: {new Date(queueStats.oldest_pending).toLocaleString()}</p>
          )}
          {queueStats.next_retry && (
            <p>Next retry scheduled: {new Date(queueStats.next_retry).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  )
}

interface QueueStatCardProps {
  label: string
  value: number
  color: string
}

function QueueStatCard({ label, value, color }: QueueStatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
          <span className="text-xl font-bold">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface QueueStatProgressProps {
  label: string
  value: number
  percent: number
  color: string
}

function QueueStatProgress({ label, value, percent, color }: QueueStatProgressProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span>{value}</span>
      </div>
      <Progress value={percent} className={`h-2 ${color}`} />
    </div>
  );
}

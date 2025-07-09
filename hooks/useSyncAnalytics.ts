import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "../lib/supabase-browser"
import { useInterval } from "./useInterval"

export interface SyncMetrics {
  total_syncs: number
  successful_syncs: number
  failed_syncs: number
  average_duration_seconds: number
  longest_sync_seconds: number
  total_merchants_synced: number
  total_residuals_synced: number
  sync_success_rate: number
}

export interface SyncQueueStats {
  pending: number
  running: number
  retrying: number
  completed: number
  failed: number
  cancelled: number
  total: number
  oldest_pending: string | null
  next_retry: string | null
}

export interface SyncPerformanceAnalysis {
  merchants_count: number
  residuals_count: number
  average_sync_time_seconds: number
  last_sync_completed_at: string | null
  recommendations: string[]
}

export interface SyncAnalyticsResult {
  metrics: SyncMetrics | null
  queueStats: SyncQueueStats | null
  performanceAnalysis: SyncPerformanceAnalysis | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch sync analytics data including metrics, queue stats, and performance analysis
 * @param refreshInterval - Interval in milliseconds to refresh data (default: 60 seconds)
 */
export function useSyncAnalytics(
  refreshInterval: number = 60 * 1000
): SyncAnalyticsResult {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null)
  const [queueStats, setQueueStats] = useState<SyncQueueStats | null>(null)
  const [performanceAnalysis, setPerformanceAnalysis] = useState<SyncPerformanceAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createSupabaseBrowserClient()

  const fetchAnalytics = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch sync metrics from sync_status table
      const { data: syncData, error: syncError } = await supabase
        .from("sync_status")
        .select("*")
      
      if (syncError) throw new Error(`Error fetching sync status: ${syncError.message}`)
      
      // Calculate metrics from sync data
      if (syncData) {
        const totalSyncs = syncData.length
        const successfulSyncs = syncData.filter((s: any) => s.status === "completed").length
        const failedSyncs = syncData.filter((s: any) => s.status === "failed").length
        
        // Calculate durations for completed syncs
        const completedSyncs = syncData.filter(
          (s: any) => s.status === "completed" && s.started_at && s.completed_at
        )
        
        const durations = completedSyncs.map((s: any) => {
          const start = new Date(s.started_at).getTime()
          const end = new Date(s.completed_at).getTime()
          return (end - start) / 1000 // Convert to seconds
        })
        
        const totalDuration = durations.reduce((sum: number, duration: number) => sum + duration, 0)
        const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
        
        // Get merchant and residual counts from results
        const merchantCounts = completedSyncs
          .filter((s: any) => s.results?.merchants_count)
          .map((s: any) => s.results.merchants_count || 0)
        
        const residualCounts = completedSyncs
          .filter((s: any) => s.results?.residuals_count)
          .map((s: any) => s.results.residuals_count || 0)
        
        const totalMerchants = merchantCounts.reduce((sum: number, count: number) => sum + count, 0)
        const totalResiduals = residualCounts.reduce((sum: number, count: number) => sum + count, 0)
        
        setMetrics({
          total_syncs: totalSyncs,
          successful_syncs: successfulSyncs,
          failed_syncs: failedSyncs,
          average_duration_seconds: avgDuration,
          longest_sync_seconds: maxDuration,
          total_merchants_synced: totalMerchants,
          total_residuals_synced: totalResiduals,
          sync_success_rate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0
        })
      }
      
      // Fetch queue stats
      const { data: queueStatsData, error: queueStatsError } = await supabase
        .rpc("get_sync_queue_stats")
        
      if (queueStatsError) throw new Error(`Error fetching queue stats: ${queueStatsError.message}`)
      
      if (queueStatsData) {
        setQueueStats(queueStatsData as SyncQueueStats)
      }
      
      // Fetch performance analysis and recommendations
      const { data: performanceData, error: performanceError } = await supabase
        .rpc("analyze_sync_performance")
        
      if (performanceError) throw new Error(`Error fetching performance analysis: ${performanceError.message}`)
      
      if (performanceData) {
        setPerformanceAnalysis(performanceData as SyncPerformanceAnalysis)
      }
      
    } catch (err) {
      console.error("Error in useSyncAnalytics:", err)
      setError(err instanceof Error ? err : new Error("Unknown error fetching sync analytics"))
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up refresh interval
  useInterval(() => {
    fetchAnalytics()
  }, refreshInterval)

  return {
    metrics,
    queueStats,
    performanceAnalysis,
    isLoading,
    error,
    refresh: fetchAnalytics
  }
}

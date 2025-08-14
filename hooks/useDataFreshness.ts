import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import useInterval from "./useInterval"

export interface FreshnessData {
  table_name: string
  last_updated: string
  hours_since_update: number
  record_count: number
  freshness_status: "fresh" | "recent" | "aging" | "stale"
}

export interface DataFreshnessInfo {
  data_type: string
  last_sync_at: string | null
  record_count: number
  status: "fresh" | "recent" | "aging" | "stale"
}

export interface DataFreshnessResult {
  data: FreshnessData[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export interface DataFreshnessHookResult {
  freshness: DataFreshnessInfo[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  triggerSync: (dataType: string) => Promise<void>
}

/**
 * Hook to fetch data freshness information from Supabase
 * @param refreshInterval - Interval in milliseconds to automatically refresh data (default: 5 minutes)
 * @returns Data freshness information for all tables
 */
export function useDataFreshness(
  refreshInterval: number = 5 * 60 * 1000
): DataFreshnessHookResult {
  const [data, setData] = useState<FreshnessData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createSupabaseBrowserClient()

  const fetchFreshness = async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase.rpc("get_data_freshness")
      
      if (supabaseError) {
        throw new Error(`Error fetching data freshness: ${supabaseError.message}`)
      }
      
      setData(data || [])
    } catch (err) {
      console.error("Error in useDataFreshness:", err)
      setError(err instanceof Error ? err : new Error("Unknown error fetching data freshness"))
    } finally {
      setIsLoading(false)
    }
  }

  // Add triggerSync function for specific data types
  const triggerSync = async (dataType: string): Promise<void> => {
    try {
      await supabase.functions.invoke("sync-iriscrm", {
        body: { type: dataType, scope: "incremental" },
      })
      
      // Refresh freshness data after triggering sync
      await fetchFreshness()
    } catch (err) {
      console.error(`Error triggering sync for ${dataType}:`, err)
      setError(err instanceof Error ? err : new Error(`Failed to trigger sync for ${dataType}`))
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchFreshness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up refresh interval
  useInterval(() => {
    fetchFreshness()
  }, refreshInterval)

  // Transform FreshnessData to DataFreshnessInfo format
  const freshness: DataFreshnessInfo[] = data.map((item: FreshnessData) => ({
    data_type: item.table_name,
    last_sync_at: item.last_updated,
    record_count: item.record_count,
    status: item.freshness_status,
  }))
  
  return { freshness, isLoading, error, refresh: fetchFreshness, triggerSync }
}

/**
 * Get a human-readable description of the data freshness
 * @param hours - Hours since last update
 * @returns Human-readable description
 */
export function getFreshnessDescription(hours: number): string {
  if (hours < 1) {
    return "Updated less than an hour ago"
  } else if (hours < 24) {
    return `Updated ${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? "s" : ""} ago`
  } else if (hours < 48) {
    return "Updated yesterday"
  } else if (hours < 72) {
    return "Updated 2 days ago"
  } else if (hours < 168) {
    return `Updated ${Math.floor(hours / 24)} days ago`
  } else if (hours < 720) {
    return `Updated ${Math.floor(hours / 168)} week${Math.floor(hours / 168) !== 1 ? "s" : ""} ago`
  } else {
    return "Updated more than a month ago"
  }
}

/**
 * Get color class based on freshness status
 * @param status - The freshness status
 * @returns Tailwind CSS color class
 */
export function getFreshnessColorClass(status: string): string {
  switch (status) {
    case "fresh":
      return "text-green-500"
    case "recent":
      return "text-blue-500"
    case "aging":
      return "text-amber-500"
    case "stale":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

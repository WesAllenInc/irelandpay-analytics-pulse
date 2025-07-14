'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase-compat';
import useInterval from '@/hooks/useInterval';

export interface ApiRateLimit {
  service: string;
  endpoint: string;
  limit: number;
  remaining: number;
  reset_at: string | null;
  percentage_used: number;
}

export interface ApiUsageStats {
  daily_usage: number;
  monthly_usage: number;
  monthly_limit: number;
  percentage_used: number;
}

export interface ApiUsageResult {
  rateLimits: ApiRateLimit[];
  usageStats: ApiUsageStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const API_SERVICES = {
  IRIS_CRM: 'iris-crm',
};

/**
 * Hook to monitor API usage and rate limits
 * @param refreshInterval - Interval in milliseconds to refresh data (default: 5 minutes)
 */
export function useApiUsageMonitor(
  refreshInterval: number = 5 * 60 * 1000
): ApiUsageResult {
  const [rateLimits, setRateLimits] = useState<ApiRateLimit[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClientComponentClient();

  const fetchApiUsage = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch rate limits from the api_rate_limits table
      const { data: limitData, error: limitError } = await supabase
        .from('api_rate_limits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (limitError) throw new Error(`Error fetching API rate limits: ${limitError.message}`);

      // Process the rate limit data
      if (limitData && limitData.length > 0) {
        // Group by service and endpoint, taking the most recent entry
        const limitMap = new Map<string, ApiRateLimit>();
        limitData.forEach((item: any) => {
          const key = `${item.service}_${item.endpoint}`;
          if (!limitMap.has(key)) {
            limitMap.set(key, {
              service: item.service,
              endpoint: item.endpoint,
              limit: item.limit,
              remaining: item.remaining,
              reset_at: item.reset_at,
              percentage_used: item.limit > 0 ? ((item.limit - item.remaining) / item.limit) * 100 : 0,
            });
          }
        });
        
        setRateLimits(Array.from(limitMap.values()));
      }

      // Fetch API usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('api_usage_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (usageError && usageError.code !== 'PGRST116') { // Ignore "no rows returned" error
        throw new Error(`Error fetching API usage stats: ${usageError.message}`);
      }

      if (usageData) {
        setUsageStats({
          daily_usage: usageData.daily_usage,
          monthly_usage: usageData.monthly_usage,
          monthly_limit: usageData.monthly_limit,
          percentage_used: usageData.monthly_limit > 0 
            ? (usageData.monthly_usage / usageData.monthly_limit) * 100
            : 0,
        });
      }

    } catch (err) {
      console.error('Error in useApiUsageMonitor:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching API usage data'));
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchApiUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up refresh interval
  useInterval(() => {
    fetchApiUsage();
  }, refreshInterval);

  return {
    rateLimits,
    usageStats,
    isLoading,
    error,
    refresh: fetchApiUsage
  };
}

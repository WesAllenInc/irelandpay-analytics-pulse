import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Sync optimization module for intelligently determining when to perform 
 * full vs. incremental syncs based on data consistency and performance metrics.
 */

interface SyncMetrics {
  dataType: string;
  lastFullSync: string | null;
  lastIncrementalSync: string | null;
  incrementalSinceLastFull: number;
  errorRate: number;
  inconsistencyRate: number;
  dataChangeVolume: number;
  apiRateLimitStatus: number;
}

interface SyncRecommendation {
  recommendFullSync: boolean;
  confidence: number; // 0-1 scale
  reason: string;
  nextSyncType: 'full' | 'incremental';
  optimalInterval: number; // minutes
}

/**
 * Analyzes sync patterns and determines the optimal sync strategy
 */
export async function analyzeSyncStrategy(
  supabase: SupabaseClient,
  dataType: string,
  syncScope?: string
): Promise<SyncRecommendation> {
  try {
    // Get sync metrics for the data type
    const metrics = await getSyncMetrics(supabase, dataType, syncScope);
    
    // Default recommendation
    let recommendation: SyncRecommendation = {
      recommendFullSync: false,
      confidence: 0.5,
      reason: "Default recommendation based on standard patterns",
      nextSyncType: 'incremental',
      optimalInterval: 60 // Default to hourly incremental syncs
    };
    
    // Apply business rules to determine if full sync is needed
    if (!metrics.lastFullSync) {
      // No full sync has been performed yet
      recommendation = {
        recommendFullSync: true,
        confidence: 0.95,
        reason: "No previous full sync found",
        nextSyncType: 'full',
        optimalInterval: 0 // Immediate
      };
    } else if (metrics.incrementalSinceLastFull > 48) {
      // Too many incremental syncs since last full sync
      recommendation = {
        recommendFullSync: true,
        confidence: 0.8,
        reason: `${metrics.incrementalSinceLastFull} incremental syncs since last full sync`,
        nextSyncType: 'full',
        optimalInterval: 0 // Immediate
      };
    } else if (metrics.errorRate > 0.1) {
      // High error rate in recent syncs
      recommendation = {
        recommendFullSync: true,
        confidence: 0.7,
        reason: `High error rate (${(metrics.errorRate * 100).toFixed(1)}%) in recent syncs`,
        nextSyncType: 'full',
        optimalInterval: 0 // Immediate
      };
    } else if (metrics.inconsistencyRate > 0.05) {
      // Data inconsistencies detected
      recommendation = {
        recommendFullSync: true,
        confidence: 0.85,
        reason: `Data inconsistencies detected (${(metrics.inconsistencyRate * 100).toFixed(1)}%)`,
        nextSyncType: 'full',
        optimalInterval: 0 // Immediate
      };
    } else if (metrics.dataChangeVolume > 0.5) {
      // Large volume of data changes
      recommendation = {
        recommendFullSync: true,
        confidence: 0.65,
        reason: "Large volume of data changes since last full sync",
        nextSyncType: 'full',
        optimalInterval: 0 // Immediate
      };
    } else if (metrics.apiRateLimitStatus < 0.2) {
      // API rate limits are close to being reached
      recommendation = {
        recommendFullSync: false,
        confidence: 0.9,
        reason: "API rate limits are close to threshold, deferring non-essential syncs",
        nextSyncType: 'incremental',
        optimalInterval: 360 // Suggest longer interval between syncs (6 hours)
      };
    } else {
      // Calculate optimal interval based on data change patterns
      const optimalInterval = calculateOptimalSyncInterval(metrics);
      
      recommendation = {
        recommendFullSync: false,
        confidence: 0.75,
        reason: "Normal operation, incremental sync is sufficient",
        nextSyncType: 'incremental',
        optimalInterval
      };
    }
    
    return recommendation;
  } catch (error) {
    console.error("Error analyzing sync strategy:", error);
    
    // Default conservative recommendation on error
    return {
      recommendFullSync: false,
      confidence: 0.3,
      reason: `Error analyzing sync strategy: ${error.message}`,
      nextSyncType: 'incremental',
      optimalInterval: 120 // 2 hours as a safe default
    };
  }
}

/**
 * Retrieves sync metrics for analysis
 */
async function getSyncMetrics(
  supabase: SupabaseClient,
  dataType: string,
  syncScope?: string
): Promise<SyncMetrics> {
  // Get last full sync timestamp
  const { data: fullSyncData } = await supabase
    .from('sync_watermarks')
    .select('last_sync_timestamp')
    .eq('data_type', dataType)
    .eq('sync_mode', 'full')
    .is('sync_scope', syncScope || null)
    .order('last_sync_timestamp', { ascending: false })
    .limit(1);
    
  const lastFullSync = fullSyncData && fullSyncData.length > 0 
    ? fullSyncData[0].last_sync_timestamp 
    : null;
  
  // Get last incremental sync timestamp
  const { data: incrementalSyncData } = await supabase
    .from('sync_watermarks')
    .select('last_sync_timestamp')
    .eq('data_type', dataType)
    .eq('sync_mode', 'incremental')
    .is('sync_scope', syncScope || null)
    .order('last_sync_timestamp', { ascending: false })
    .limit(1);
    
  const lastIncrementalSync = incrementalSyncData && incrementalSyncData.length > 0 
    ? incrementalSyncData[0].last_sync_timestamp 
    : null;
  
  // Count incremental syncs since last full sync
  let incrementalSinceLastFull = 0;
  if (lastFullSync) {
    const { count } = await supabase
      .from('sync_watermarks')
      .select('*', { count: 'exact', head: true })
      .eq('data_type', dataType)
      .eq('sync_mode', 'incremental')
      .is('sync_scope', syncScope || null)
      .gt('last_sync_timestamp', lastFullSync);
      
    incrementalSinceLastFull = count || 0;
  }
  
  // Get sync error rate (from last 10 syncs)
  const { data: syncLogs } = await supabase
    .from('sync_logs')
    .select('status')
    .eq('sync_type', dataType)
    .is('sync_scope', syncScope || null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const errorRate = syncLogs 
    ? syncLogs.filter(log => log.status === 'error').length / syncLogs.length 
    : 0;
  
  // Get data inconsistency metrics
  // This would normally come from a data validation check
  let inconsistencyRate = 0;
  try {
    const { data: validationResult } = await supabase
      .rpc('check_data_consistency', { 
        p_data_type: dataType,
        p_sync_scope: syncScope || null
      });
      
    if (validationResult) {
      inconsistencyRate = validationResult.inconsistency_rate || 0;
    }
  } catch {
    // If the function doesn't exist or fails, use a default value
    inconsistencyRate = 0;
  }
  
  // Get data change volume (percentage of records changed since last full sync)
  let dataChangeVolume = 0;
  try {
    const { data: changeStats } = await supabase
      .rpc('get_change_volume', {
        p_data_type: dataType,
        p_since: lastFullSync
      });
      
    if (changeStats) {
      dataChangeVolume = changeStats.change_volume || 0;
    }
  } catch {
    // Default to a moderate value if function doesn't exist
    dataChangeVolume = 0.25;
  }
  
  // Get API rate limit status (remaining / limit)
  let apiRateLimitStatus = 0.5; // Default to 50%
  const { data: rateLimits } = await supabase
    .from('api_rate_limits')
    .select('*')
    .order('remaining', { ascending: true })
    .limit(1);
    
  if (rateLimits && rateLimits.length > 0) {
    apiRateLimitStatus = rateLimits[0].remaining / rateLimits[0].limit;
  }
  
  return {
    dataType,
    lastFullSync,
    lastIncrementalSync,
    incrementalSinceLastFull,
    errorRate,
    inconsistencyRate,
    dataChangeVolume,
    apiRateLimitStatus
  };
}

/**
 * Calculates the optimal interval between syncs based on data change patterns
 */
function calculateOptimalSyncInterval(metrics: SyncMetrics): number {
  // Base interval in minutes
  let baseInterval = 60; // 1 hour default
  
  // Adjust for API rate limit status
  if (metrics.apiRateLimitStatus < 0.3) {
    baseInterval = 240; // 4 hours if API limits are constrained
  } else if (metrics.apiRateLimitStatus > 0.8) {
    baseInterval = 30; // 30 minutes if API limits are very available
  }
  
  // Adjust for data change volume
  if (metrics.dataChangeVolume > 0.3) {
    baseInterval = Math.max(15, baseInterval / 2); // More frequent for high change volumes
  } else if (metrics.dataChangeVolume < 0.1) {
    baseInterval = baseInterval * 2; // Less frequent for stable data
  }
  
  // Cap at reasonable bounds
  return Math.min(Math.max(15, baseInterval), 1440); // Between 15 minutes and 24 hours
}

/**
 * Schedules a full sync if needed based on the analysis
 */
export async function scheduleOptimalSync(
  supabase: SupabaseClient,
  dataType: string,
  syncScope?: string
): Promise<{ scheduled: boolean; recommendation: SyncRecommendation }> {
  const recommendation = await analyzeSyncStrategy(supabase, dataType, syncScope);
  
  // If we recommend a full sync and have high confidence, schedule it
  if (recommendation.recommendFullSync && recommendation.confidence > 0.7) {
    try {
      // Call the incremental sync trigger with fullSync flag
      const { data, error } = await supabase.functions.invoke(
        'trigger-incremental-sync',
        {
          body: {
            dataType: dataType,
            syncScope: syncScope,
            fullSync: true
          }
        }
      );
      
      if (error) throw error;
      
      // Create a log entry for the decision
      await supabase.from('sync_logs').insert({
        sync_type: dataType,
        sync_scope: syncScope,
        sync_mode: 'full',
        status: 'scheduled',
        message: `Automatically scheduled full sync based on analysis: ${recommendation.reason}`,
        metadata: recommendation
      });
      
      return { scheduled: true, recommendation };
    } catch (error) {
      console.error("Error scheduling full sync:", error);
      return { scheduled: false, recommendation };
    }
  }
  
  return { scheduled: false, recommendation };
}

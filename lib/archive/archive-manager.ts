import { createSupabaseClient } from '@/lib/supabase';
import { addMonths, format, startOfMonth } from 'date-fns';

export interface ArchiveResult {
  archived: number;
  errors: string[];
  duration: number;
}

export interface HistoricalQueryParams {
  merchantId?: string;
  startDate: string;
  endDate: string;
  metrics: string[];
}

export interface RetentionStats {
  totalRecords: number;
  oldestRecord: string;
  newestRecord: string;
  partitionCount: number;
  totalSize: string;
  sizeByMonth: Array<{
    month: string;
    size: string;
    recordCount: number;
  }>;
}

export interface PartitionHealth {
  name: string;
  month: string;
  recordCount: number;
  size: string;
  lastAnalyzed: string | null;
  healthy: boolean;
}

export interface QueryParams {
  dateRange: {
    start: string;
    end: string;
  };
  merchants?: string[];
  metrics: string[];
  groupBy?: string[];
}

export interface OptimizedQuery {
  query: string;
  params: any[];
  estimatedCost: number;
  usesMaterializedView: boolean;
}

export interface QueryPlan {
  plan: string;
  estimatedRows: number;
  estimatedCost: number;
  usesIndex: boolean;
  suggestions: string[];
}

export class ArchiveManager {
  private supabase = createSupabaseClient();

  /**
   * Archive data older than the active window
   */
  async archiveHistoricalData(): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      archived: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Data is automatically archived via partitioning
      // This method handles any additional archival needs
      
      // Refresh materialized views for performance
      await this.refreshMaterializedViews();
      
      // Analyze tables for query optimization
      await this.analyzePartitions();
      
      // Clean up any orphaned data
      await this.cleanupOrphanedData();
      
      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error: any) {
      result.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Query historical data efficiently
   */
  async queryHistoricalData(params: HistoricalQueryParams): Promise<any> {
    const { merchantId, startDate, endDate, metrics } = params;

    // Use partition pruning for efficient queries
    const query = this.supabase
      .from('merchant_data_partitioned')
      .select(metrics.join(','))
      .gte('month', startDate)
      .lte('month', endDate);

    if (merchantId) {
      query.eq('merchant_id', merchantId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  /**
   * Get data retention statistics
   */
  async getRetentionStats(): Promise<RetentionStats> {
    const { data, error } = await this.supabase.rpc('get_retention_stats');
    
    if (error) throw error;
    
    return {
      totalRecords: data.total_records,
      oldestRecord: data.oldest_record,
      newestRecord: data.newest_record,
      partitionCount: data.partition_count,
      totalSize: data.total_size,
      sizeByMonth: data.size_by_month || []
    };
  }

  /**
   * Get partition health information
   */
  async getPartitionHealth(): Promise<PartitionHealth[]> {
    const { data, error } = await this.supabase.rpc('get_partition_health');
    
    if (error) throw error;
    
    return data || [];
  }

  /**
   * Optimize partition performance
   */
  private async analyzePartitions(): Promise<void> {
    // Get list of partitions that need analysis
    const { data: partitions } = await this.supabase.rpc('get_partitions_for_analysis');
    
    for (const partition of partitions || []) {
      await this.supabase.rpc('analyze_partition', { 
        partition_name: partition.name 
      });
    }
  }

  /**
   * Refresh materialized views
   */
  private async refreshMaterializedViews(): Promise<void> {
    await this.supabase.rpc('refresh_summary_views');
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(): Promise<void> {
    // Remove any data that doesn't have proper merchant references
    const { error } = await this.supabase
      .from('merchant_data_partitioned')
      .delete()
      .is('merchant_id', null);
    
    if (error) {
      console.warn('Error cleaning up orphaned data:', error);
    }
  }

  /**
   * Create missing partitions for future months
   */
  async ensureFuturePartitions(monthsAhead: number = 3): Promise<void> {
    const currentDate = new Date();
    
    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = addMonths(currentDate, i);
      const partitionName = `merchant_data_${format(futureDate, 'yyyy_MM')}`;
      
      await this.supabase.rpc('create_partition_if_not_exists', {
        partition_name: partitionName,
        start_date: startOfMonth(futureDate).toISOString(),
        end_date: startOfMonth(addMonths(futureDate, 1)).toISOString()
      });
    }
  }

  /**
   * Generate optimized query based on parameters
   */
  static buildOptimizedQuery(params: QueryParams): OptimizedQuery {
    const { dateRange, merchants, metrics, groupBy } = params;
    
    // Use partition pruning
    const partitions = this.getRelevantPartitions(dateRange);
    
    // Build query with appropriate indexes
    let query = `
      SELECT 
        ${this.buildSelectClause(metrics, groupBy)}
      FROM merchant_data_partitioned
      WHERE month >= $1 AND month <= $2
    `;

    // Add merchant filter if needed
    if (merchants && merchants.length > 0) {
      query += ` AND merchant_id = ANY($3)`;
    }

    // Add grouping
    if (groupBy) {
      query += ` GROUP BY ${groupBy.join(', ')}`;
    }

    // Add ordering for performance
    query += ` ORDER BY month DESC`;

    return {
      query,
      params: [dateRange.start, dateRange.end, merchants],
      estimatedCost: this.estimateQueryCost(params),
      usesMaterializedView: this.shouldUseMaterializedView(params)
    };
  }

  /**
   * Determine if query should use materialized view
   */
  private static shouldUseMaterializedView(params: QueryParams): boolean {
    const { dateRange, metrics } = params;
    
    // Use materialized view for:
    // - Monthly aggregations
    // - Common metrics
    // - Date ranges > 3 months
    
    const monthsDiff = this.getMonthsDifference(dateRange.start, dateRange.end);
    
    const commonMetrics = ['total_volume', 'total_transactions', 'net_revenue'];
    const usesOnlyCommonMetrics = metrics.every(m => commonMetrics.includes(m));
    
    return monthsDiff > 3 && usesOnlyCommonMetrics;
  }

  /**
   * Get relevant partitions for date range
   */
  private static getRelevantPartitions(dateRange: { start: string; end: string }): string[] {
    const partitions: string[] = [];
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    let currentDate = startOfMonth(startDate);
    
    while (currentDate <= endDate) {
      partitions.push(`merchant_data_${format(currentDate, 'yyyy_MM')}`);
      currentDate = addMonths(currentDate, 1);
    }
    
    return partitions;
  }

  /**
   * Build SELECT clause for query
   */
  private static buildSelectClause(metrics: string[], groupBy?: string[]): string {
    if (groupBy) {
      return `${groupBy.join(', ')}, ${metrics.join(', ')}`;
    }
    return metrics.join(', ');
  }

  /**
   * Estimate query cost
   */
  private static estimateQueryCost(params: QueryParams): number {
    const monthsDiff = this.getMonthsDifference(params.dateRange.start, params.dateRange.end);
    const baseCost = 100;
    
    // Cost increases with date range and number of merchants
    let cost = baseCost * monthsDiff;
    
    if (params.merchants && params.merchants.length > 0) {
      cost *= Math.min(params.merchants.length / 10, 1);
    }
    
    return Math.round(cost);
  }

  /**
   * Get months difference between dates
   */
  private static getMonthsDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return (end.getFullYear() - start.getFullYear()) * 12 + 
           (end.getMonth() - start.getMonth());
  }

  /**
   * Create query execution plan
   */
  static async analyzeQuery(query: string): Promise<QueryPlan> {
    const supabase = createSupabaseClient();
    const { data } = await supabase.rpc('explain_query', { 
      query_text: query 
    });
    
    return {
      plan: data.plan,
      estimatedRows: data.estimated_rows,
      estimatedCost: data.estimated_cost,
      usesIndex: data.uses_index,
      suggestions: this.generateOptimizationSuggestions(data)
    };
  }

  /**
   * Generate optimization suggestions
   */
  private static generateOptimizationSuggestions(data: any): string[] {
    const suggestions: string[] = [];
    
    if (data.estimated_cost > 1000) {
      suggestions.push('Consider using materialized views for this query');
    }
    
    if (!data.uses_index) {
      suggestions.push('Query may benefit from additional indexes');
    }
    
    if (data.estimated_rows > 10000) {
      suggestions.push('Consider limiting date range or adding filters');
    }
    
    return suggestions;
  }
} 
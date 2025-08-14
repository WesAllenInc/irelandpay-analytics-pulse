import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Interface for metrics query parameters
 */
export interface MetricsQueryParams {
  from: string; // YYYY-MM format
  to: string; // YYYY-MM format
  merchantId?: string; // Optional merchant ID
}

/**
 * Interface for metrics response data
 */
export interface MetricsData {
  month: string;
  totalVolume: number;
  totalNet: number;
}

/**
 * Fetches metrics data based on the provided query parameters
 * @param params Query parameters for filtering metrics
 * @returns Array of metrics data
 */
export async function getMetrics(params: MetricsQueryParams): Promise<MetricsData[]> {
  const supabase = createSupabaseBrowserClient();
  try {
    // Convert YYYY-MM format to YYYY-MM-DD format for date comparison
    const fromDate = `${params.from}-01`;
    const toDate = `${params.to}-31`; // Using 31 to cover all possible month end dates

    // Build the query
    let query = supabase
      .from('master_data')
      .select('volume_month, total_volume, net_profit')
      .gte('volume_month', fromDate)
      .lte('volume_month', toDate);

    // Add merchant filter if provided
    if (params.merchantId) {
      query = query.eq('mid', params.merchantId);
    }

    // Execute the query
    const { data, error } = await query
      .order('volume_month');

    if (error) {
      console.error('Error fetching metrics:', error);
      throw new Error(error.message);
    }

    // Process the data to group by month and calculate totals
    const monthlyData: Record<string, MetricsData> = {};
    
    (data || []).forEach(item => {
      if (!item.volume_month) return;
      
      // Extract YYYY-MM from the date
      const month = item.volume_month.substring(0, 7);
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalVolume: 0,
          totalNet: 0
        };
      }
      
      monthlyData[month].totalVolume += Number(item.total_volume || 0);
      monthlyData[month].totalNet += Number(item.net_profit || 0);
    });

    return Object.values(monthlyData);
  } catch (error) {
    console.error('Error in getMetrics:', error);
    throw error;
  }
}

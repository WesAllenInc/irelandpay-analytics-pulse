
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

interface Merchant {
  mid: string;
  merchant_dba: string;
}

interface MetricsData {
  time: string;
  volume: number;
  netProfit: number;
  transactions: number;
}

type MasterDataRow = Database['public']['Views']['master_data']['Row'];

export function useDashboardData(selectedMerchant: Merchant | null, dateRange: { from: string; to: string }) {
  const [volumeData, setVolumeData] = useState<{ time: string; value: number }[]>([]);
  const [netData, setNetData] = useState<{ time: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [selectedMerchant, dateRange]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('master_data')
        .select('volume_month, merchant_volume, net_profit, payout_transactions')
        .gte('volume_month', dateRange.from)
        .lte('volume_month', dateRange.to)
        .order('volume_month');

      if (selectedMerchant) {
        query = query.eq('mid', selectedMerchant.mid);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Group by month and sum values
        type Row = { volume_month: string; merchant_volume: number; net_profit: number; payout_transactions: number };
        const monthlyData = data.reduce((acc: { [key: string]: { volume: number; netProfit: number; transactions: number } }, row: Row) => {
          const month = row.volume_month;
          if (!acc[month]) {
            acc[month] = { volume: 0, netProfit: 0, transactions: 0 };
          }
          acc[month].volume += Number(row.merchant_volume || 0);
          acc[month].netProfit += Number(row.net_profit || 0);
          acc[month].transactions += Number(row.payout_transactions || 0);
          return acc;
        }, {});

        const volumeChartData = Object.entries(monthlyData).map(([time, metrics]) => ({
          time,
          value: metrics.volume,
        }));

        const netChartData = Object.entries(monthlyData).map(([time, metrics]) => ({
          time,
          value: metrics.netProfit,
        }));

        setVolumeData(volumeChartData);
        setNetData(netChartData);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { volumeData, netData, loading, error };
}

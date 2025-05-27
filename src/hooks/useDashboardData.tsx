
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        .select('payout_month, merchant_volume, net_profit, payout_transactions')
        .gte('payout_month', dateRange.from)
        .lte('payout_month', dateRange.to)
        .order('payout_month');

      if (selectedMerchant) {
        query = query.eq('mid', selectedMerchant.mid);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Group by month and sum values
        const monthlyData = data.reduce((acc: { [key: string]: { volume: number; netProfit: number; transactions: number } }, row) => {
          const month = row.payout_month;
          if (!acc[month]) {
            acc[month] = { volume: 0, netProfit: 0, transactions: 0 };
          }
          acc[month].volume += Number(row.merchant_volume || 0);
          acc[month].netProfit += Number(row.net_profit || 0);
          acc[month].transactions += Number(row.payout_transactions || 0);
          return acc;
        }, {});

        const volumeChartData = Object.entries(monthlyData).map(([time, data]) => ({
          time,
          value: data.volume,
        }));

        const netChartData = Object.entries(monthlyData).map(([time, data]) => ({
          time,
          value: data.netProfit,
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

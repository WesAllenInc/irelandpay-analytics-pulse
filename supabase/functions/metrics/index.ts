
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsRequest {
  mid?: string;
  startDate: string;
  endDate: string;
  aggregation?: 'monthly' | 'quarterly' | 'yearly';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { mid, startDate, endDate, aggregation = 'monthly' }: MetricsRequest = await req.json();

    console.log('Fetching metrics for:', { mid, startDate, endDate, aggregation });

    // Build base query
    let query = supabaseClient
      .from('master_data')
      .select('payout_month, merchant_volume, net_profit, payout_transactions, merchant_dba, mid')
      .gte('payout_month', startDate)
      .lte('payout_month', endDate)
      .order('payout_month');

    // Filter by merchant if specified
    if (mid) {
      query = query.eq('mid', mid);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    // Aggregate data based on requested aggregation
    const aggregatedData = aggregateMetrics(data || [], aggregation);

    // Calculate summary statistics
    const summary = calculateSummary(data || []);

    return new Response(
      JSON.stringify({
        data: aggregatedData,
        summary,
        period: { startDate, endDate },
        merchant: mid || 'all',
        aggregation
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in metrics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function aggregateMetrics(data: any[], aggregation: string) {
  if (aggregation === 'monthly') {
    return data; // Already monthly from database
  }

  const groupedData: { [key: string]: any } = {};

  data.forEach(row => {
    const date = new Date(row.payout_month);
    let key: string;

    if (aggregation === 'quarterly') {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      key = `${date.getFullYear()}-Q${quarter}`;
    } else if (aggregation === 'yearly') {
      key = date.getFullYear().toString();
    } else {
      key = row.payout_month; // fallback to monthly
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        period: key,
        merchant_volume: 0,
        net_profit: 0,
        payout_transactions: 0,
        merchant_count: new Set()
      };
    }

    groupedData[key].merchant_volume += Number(row.merchant_volume || 0);
    groupedData[key].net_profit += Number(row.net_profit || 0);
    groupedData[key].payout_transactions += Number(row.payout_transactions || 0);
    if (row.mid) {
      groupedData[key].merchant_count.add(row.mid);
    }
  });

  return Object.values(groupedData).map(item => ({
    period: item.period,
    merchant_volume: item.merchant_volume,
    net_profit: item.net_profit,
    payout_transactions: item.payout_transactions,
    merchant_count: item.merchant_count.size
  }));
}

function calculateSummary(data: any[]) {
  const totalVolume = data.reduce((sum, row) => sum + Number(row.merchant_volume || 0), 0);
  const totalNetProfit = data.reduce((sum, row) => sum + Number(row.net_profit || 0), 0);
  const totalTransactions = data.reduce((sum, row) => sum + Number(row.payout_transactions || 0), 0);
  const uniqueMerchants = new Set(data.map(row => row.mid).filter(Boolean)).size;

  return {
    totalVolume,
    totalNetProfit,
    totalTransactions,
    uniqueMerchants,
    averageVolumePerMerchant: uniqueMerchants > 0 ? totalVolume / uniqueMerchants : 0,
    averageProfitPerMerchant: uniqueMerchants > 0 ? totalNetProfit / uniqueMerchants : 0,
    profitMargin: totalVolume > 0 ? (totalNetProfit / totalVolume) * 100 : 0
  };
}

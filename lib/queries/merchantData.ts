import { createSupabaseServerClient } from '@/lib/supabase/server';

// Simple in-memory cache
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute

function getCache(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  cache[key] = { data, ts: Date.now() };
}

export async function getMerchantSummary() {
  const cacheKey = 'merchantSummary';
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const supabase = createSupabaseServerClient();
  const { data: merchantRows } = await supabase
    .from('merchant_data')
    .select('merchant_id, name, total_volume, net_profit, bps');
  // Aggregate by merchant_id
  const merchantMap = new Map<string, { name: string; volume: number; profit: number; bpsSum: number; bpsCount: number }>();
  (merchantRows || []).forEach((row: any) => {
    if (!merchantMap.has(row.merchant_id)) {
      merchantMap.set(row.merchant_id, {
        name: row.name,
        volume: 0,
        profit: 0,
        bpsSum: 0,
        bpsCount: 0,
      });
    }
    const entry = merchantMap.get(row.merchant_id)!;
    entry.volume += Number(row.total_volume || 0);
    entry.profit += Number(row.net_profit || 0);
    if (row.bps !== undefined && row.bps !== null) {
      entry.bpsSum += Number(row.bps);
      entry.bpsCount += 1;
    }
  });
  const merchants = Array.from(merchantMap.entries()).map(([merchantId, entry]) => ({
    name: entry.name,
    volume: entry.volume,
    profit: entry.profit,
    bps: entry.bpsCount > 0 ? entry.bpsSum / entry.bpsCount : 0,
    merchantId,
  }));
  setCache(cacheKey, merchants);
  return merchants;
}

export async function getMerchantDetail(merchantId: string) {
  const cacheKey = `merchantDetail:${merchantId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const supabase = createSupabaseServerClient();
  const { data: volumeRows } = await supabase
    .from('merchant_data')
    .select('month, total_volume, net_profit')
    .eq('merchant_id', merchantId)
    .order('month');
  // Format for charting
  const volumeHistory = (volumeRows || []).map((row: any) => ({
    month: row.month,
    volume: Number(row.total_volume || 0),
    profit: Number(row.net_profit || 0),
  }));
  setCache(cacheKey, volumeHistory);
  return volumeHistory;
}

export async function getTopMerchantsByVolume(month: string) {
  const cacheKey = `topByVolume:${month}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const supabase = createSupabaseServerClient();
  const { data: merchantRows } = await supabase
    .from('merchant_data')
    .select('merchant_id, name, total_volume')
    .like('month', `${month}%`);
  // Aggregate and sort
  const merchantMap = new Map<string, { name: string; volume: number }>();
  (merchantRows || []).forEach((row: any) => {
    if (!merchantMap.has(row.merchant_id)) {
      merchantMap.set(row.merchant_id, {
        name: row.name,
        volume: 0,
      });
    }
    const entry = merchantMap.get(row.merchant_id)!;
    entry.volume += Number(row.total_volume || 0);
  });
  const merchants = Array.from(merchantMap.entries()).map(([merchantId, entry]) => ({
    name: entry.name,
    volume: entry.volume,
    merchantId,
  }));
  merchants.sort((a, b) => b.volume - a.volume);
  const top10 = merchants.slice(0, 10);
  setCache(cacheKey, top10);
  return top10;
}

export async function getTopMerchantsByProfit(month: string) {
  const cacheKey = `topByProfit:${month}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const supabase = createSupabaseServerClient();
  const { data: merchantRows } = await supabase
    .from('merchant_data')
    .select('merchant_id, name, net_profit')
    .like('month', `${month}%`);
  // Aggregate and sort
  const merchantMap = new Map<string, { name: string; profit: number }>();
  (merchantRows || []).forEach((row: any) => {
    if (!merchantMap.has(row.merchant_id)) {
      merchantMap.set(row.merchant_id, {
        name: row.name,
        profit: 0,
      });
    }
    const entry = merchantMap.get(row.merchant_id)!;
    entry.profit += Number(row.net_profit || 0);
  });
  const merchants = Array.from(merchantMap.entries()).map(([merchantId, entry]) => ({
    name: entry.name,
    profit: entry.profit,
    merchantId,
  }));
  merchants.sort((a, b) => b.profit - a.profit);
  const top10 = merchants.slice(0, 10);
  setCache(cacheKey, top10);
  return top10;
}

export async function getMerchantHistory(merchantId: string, from: Date, to: Date): Promise<{ date: string; volume: number; profit: number; processor: string }[]> {
  const cacheKey = `merchantHistory:${merchantId}:${from.toISOString()}:${to.toISOString()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  // Get merchant history with processor info
  const { data, error } = await supabase
    .from('merchant_processing_volumes')
    .select(`
      processing_month,
      gross_volume,
      merchant_id,
      merchants!inner(processor)
    `)
    .eq('merchant_id', merchantId)
    .gte('processing_month', from.toISOString().slice(0, 10))
    .lte('processing_month', to.toISOString().slice(0, 10))
    .order('processing_month');

  if (error) {
    console.error('Error fetching merchant history:', error);
    return [];
  }

  // Get residuals data for profit calculation
  const { data: residualsData, error: residualsError } = await supabase
    .from('residuals')
    .select('processing_month, net_residual')
    .eq('merchant_id', merchantId)
    .gte('processing_month', from.toISOString().slice(0, 10))
    .lte('processing_month', to.toISOString().slice(0, 10))
    .order('processing_month');

  if (residualsError) {
    console.error('Error fetching residuals data:', residualsError);
  }

  // Create a map of residuals by month
  const residualsMap = new Map();
  (residualsData || []).forEach(row => {
    residualsMap.set(row.processing_month, Number(row.net_residual) || 0);
  });

  // Combine volume and profit data
  const history = (data || []).map(row => ({
    date: row.processing_month,
    volume: Number(row.gross_volume) || 0,
    profit: residualsMap.get(row.processing_month) || 0,
    processor: (row.merchants as any)?.processor || 'Unknown'
  }));

  setCache(cacheKey, history);
  return history;
}

export async function getMerchantSummaryWithRange(from?: Date, to?: Date) {
  const cacheKey = `merchantSummaryRange:${from?.toISOString()}:${to?.toISOString()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  let query = supabase
    .from('merchant_processing_volumes')
    .select(`
      merchant_id,
      gross_volume,
      processing_month,
      merchants!inner(dba_name, processor)
    `);

  if (from && to) {
    query = query
      .gte('processing_month', from.toISOString().slice(0, 10))
      .lte('processing_month', to.toISOString().slice(0, 10));
  }

  const { data: volumeData, error: volumeError } = await query;

  if (volumeError) {
    console.error('Error fetching volume data:', volumeError);
    return [];
  }

  // Get residuals data for the same period
  let residualsQuery = supabase
    .from('residuals')
    .select('merchant_id, net_residual, processing_month');

  if (from && to) {
    residualsQuery = residualsQuery
      .gte('processing_month', from.toISOString().slice(0, 10))
      .lte('processing_month', to.toISOString().slice(0, 10));
  }

  const { data: residualsData, error: residualsError } = await residualsQuery;

  if (residualsError) {
    console.error('Error fetching residuals data:', residualsError);
  }

  // Aggregate data by merchant
  const merchantMap = new Map();
  
  // Process volume data
  (volumeData || []).forEach(row => {
    const merchantId = row.merchant_id;
    if (!merchantMap.has(merchantId)) {
      merchantMap.set(merchantId, {
        merchant_id: merchantId,
        name: (row.merchants as any)?.dba_name || 'Unknown',
        processor: (row.merchants as any)?.processor || 'Unknown',
        volume: 0,
        profit: 0,
        bps: 0
      });
    }
    const merchant = merchantMap.get(merchantId);
    merchant.volume += Number(row.gross_volume) || 0;
  });

  // Process residuals data
  (residualsData || []).forEach(row => {
    const merchantId = row.merchant_id;
    if (merchantMap.has(merchantId)) {
      const merchant = merchantMap.get(merchantId);
      merchant.profit += Number(row.net_residual) || 0;
    }
  });

  // Calculate BPS for each merchant
  const merchants = Array.from(merchantMap.values()).map(merchant => ({
    ...merchant,
    bps: merchant.volume > 0 ? (merchant.profit / merchant.volume) * 10000 : 0
  }));

  setCache(cacheKey, merchants);
  return merchants;
} 
import { createSupabaseServerClient } from '@/lib/supabase';

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
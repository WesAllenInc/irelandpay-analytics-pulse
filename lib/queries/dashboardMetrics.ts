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

/**
 * 1. Get raw volume sum between start and end dates
 */
export async function getRawVolumeSum(start: Date, end: Date): Promise<number> {
  const cacheKey = `rawVolumeSum:${start.toISOString()}:${end.toISOString()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('merchant_data')
    .select('total_volume')
    .gte('month', start.toISOString().slice(0, 10))
    .lte('month', end.toISOString().slice(0, 10));

  if (error) {
    console.error('Error fetching raw volume sum:', error);
    return 0;
  }

  const sum = (data || []).reduce((acc, row) => acc + (Number(row.total_volume) || 0), 0);
  setCache(cacheKey, sum);
  return sum;
}

/**
 * 2. Get day-by-day total processed volume for days 1 → today
 */
export async function getDailyTotals(daysInMonth: number): Promise<Array<{ day: number; totalVolume: number }>> {
  const cacheKey = `dailyTotals:${daysInMonth}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  // Get current month's data
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('merchant_data')
    .select('total_volume, month')
    .gte('month', monthStart.toISOString().slice(0, 10))
    .lte('month', monthEnd.toISOString().slice(0, 10));

  if (error) {
    console.error('Error fetching daily totals:', error);
    return [];
  }

  // Group by day and sum volumes
  const dailyMap = new Map<number, number>();
  
  (data || []).forEach(row => {
    const day = new Date(row.month).getDate();
    const volume = Number(row.total_volume) || 0;
    dailyMap.set(day, (dailyMap.get(day) || 0) + volume);
  });

  // Create array for all days in month
  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    totalVolume: dailyMap.get(i + 1) || 0
  }));

  setCache(cacheKey, dailyTotals);
  return dailyTotals;
}

/**
 * 3. Compute estimated volume: (rawVolumeSum / todayIndex) * daysInMonth
 */
export async function getEstimatedVolume(daysInMonth: number): Promise<number> {
  const now = new Date();
  const todayIndex = now.getDate();
  
  if (todayIndex === 0) return 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const rawVolumeSum = await getRawVolumeSum(monthStart, monthEnd);
  const estimatedVolume = (rawVolumeSum / todayIndex) * daysInMonth;
  
  return estimatedVolume;
}

/**
 * 4. Get estimated profit based on merchant residuals and volume shares
 */
export async function getEstimatedProfit(daysInMonth: number): Promise<number> {
  const cacheKey = `estimatedProfit:${daysInMonth}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  // Get current month's data with residuals
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('residual_data')
    .select('mid, net_profit, bps')
    .gte('payout_month', monthStart.toISOString().slice(0, 10))
    .lte('payout_month', monthEnd.toISOString().slice(0, 10));

  if (error) {
    console.error('Error fetching merchant data for profit estimation:', error);
    return 0;
  }

  const estimatedVolume = await getEstimatedVolume(daysInMonth);
  if (estimatedVolume === 0) return 0;

  // Get current month's raw volume sum for ratio calculation
  const currentRawVolumeSum = await getRawVolumeSum(monthStart, monthEnd);

  // For profit estimation, we'll use the net_profit from residual_data
  // and scale it based on the estimated volume ratio
  const totalCurrentProfit = (data || []).reduce((sum, row) => sum + (Number(row.net_profit) || 0), 0);
  
  let totalEstimatedProfit = 0;

  if (totalCurrentProfit > 0 && currentRawVolumeSum > 0) {
    // Scale the current profit based on estimated volume
    const volumeRatio = estimatedVolume / currentRawVolumeSum;
    totalEstimatedProfit = totalCurrentProfit * volumeRatio;
  }

  setCache(cacheKey, totalEstimatedProfit);
  return totalEstimatedProfit;
}

/**
 * 5. Get weighted average BPS across all merchants
 */
export async function getPortfolioBPSAvg(): Promise<number> {
  const cacheKey = 'portfolioBPSAvg';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  // Get last month's data for weighted average calculation
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const { data, error } = await supabase
    .from('residual_data')
    .select('net_profit, bps')
    .gte('payout_month', lastMonth.toISOString().slice(0, 10))
    .lte('payout_month', lastMonthEnd.toISOString().slice(0, 10))
    .not('bps', 'is', null);

  if (error) {
    console.error('Error fetching BPS data:', error);
    return 0;
  }

  let totalWeightedBPS = 0;
  let totalProfit = 0;

  (data || []).forEach(row => {
    const profit = Number(row.net_profit) || 0;
    const bps = Number(row.bps) || 0;
    
    if (profit > 0 && bps > 0) {
      totalWeightedBPS += profit * bps;
      totalProfit += profit;
    }
  });

  const weightedAvgBPS = totalProfit > 0 ? totalWeightedBPS / totalProfit : 0;
  setCache(cacheKey, weightedAvgBPS);
  return weightedAvgBPS;
}

/**
 * 6. Get static average agent payout percentage across all active merchants
 */
export async function getAgentPayoutAvg(): Promise<number> {
  const cacheKey = 'agentPayoutAvg';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const supabase = createSupabaseServerClient();
  
  // Get current month's data with agent percentages
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from('residual_data')
    .select('agent_pct')
    .gte('payout_month', monthStart.toISOString().slice(0, 10))
    .lte('payout_month', monthEnd.toISOString().slice(0, 10))
    .not('agent_pct', 'is', null);

  if (error) {
    console.error('Error fetching agent payout data:', error);
    return 0;
  }

  const validPercentages = (data || [])
    .map(row => Number(row.agent_pct))
    .filter(pct => pct > 0 && pct <= 100);

  const avgPayout = validPercentages.length > 0 
    ? validPercentages.reduce((sum, pct) => sum + pct, 0) / validPercentages.length 
    : 0;

  setCache(cacheKey, avgPayout);
  return avgPayout;
} 
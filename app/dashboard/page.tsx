import { MerchantAnalyticsCard } from '@/components/analytics/MerchantAnalyticsCard';
import { MerchantTable } from '@/components/analytics/MerchantTable';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { createSupabaseServerClient } from '@/lib/supabase';

// Demo data for when Supabase is not available
const demoMerchantStats = [
  { merchant_id: 'demo-1', name: 'Demo Merchant 1', total_volume: 1250000, net_profit: 12500, bps: 100 },
  { merchant_id: 'demo-2', name: 'Demo Merchant 2', total_volume: 890000, net_profit: 8900, bps: 100 },
  { merchant_id: 'demo-3', name: 'Demo Merchant 3', total_volume: 2100000, net_profit: 21000, bps: 100 },
  { merchant_id: 'demo-4', name: 'Demo Merchant 4', total_volume: 750000, net_profit: 7500, bps: 100 },
  { merchant_id: 'demo-5', name: 'Demo Merchant 5', total_volume: 1800000, net_profit: 18000, bps: 100 },
];

// Demo chart data for monthly trends
const demoVolumeTrend = [
  { month: 'Jan', volume: 1200000 },
  { month: 'Feb', volume: 1350000 },
  { month: 'Mar', volume: 1100000 },
  { month: 'Apr', volume: 1450000 },
  { month: 'May', volume: 1600000 },
  { month: 'Jun', volume: 1750000 },
];

const demoProfitTrend = [
  { month: 'Jan', profit: 12000 },
  { month: 'Feb', profit: 13500 },
  { month: 'Mar', profit: 11000 },
  { month: 'Apr', profit: 14500 },
  { month: 'May', profit: 16000 },
  { month: 'Jun', profit: 17500 },
];

export default async function DashboardPage() {
  let merchantStats = demoMerchantStats;
  let volumeTrend = demoVolumeTrend;
  let profitTrend = demoProfitTrend;
  let totalVolume = 0;
  let totalProfit = 0;
  let avgBps = 0;

  try {
    const supabase = createSupabaseServerClient();

    // Get current month range
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Fetch all merchant data for the month
    const { data: merchantRows } = await supabase
      .from('merchant_data')
      .select('merchant_id, name, total_volume, net_profit, bps')
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (merchantRows && merchantRows.length > 0) {
      // Aggregate data by merchant_id
      const merchantMap = new Map();
      
      merchantRows.forEach((row: any) => {
        const existing = merchantMap.get(row.merchant_id);
        if (existing) {
          existing.total_volume += row.total_volume || 0;
          existing.net_profit += row.net_profit || 0;
          existing.bps = row.bps || existing.bps; // Use latest BPS
        } else {
          merchantMap.set(row.merchant_id, {
            merchant_id: row.merchant_id,
            name: row.name,
            total_volume: row.total_volume || 0,
            net_profit: row.net_profit || 0,
            bps: row.bps || 0
          });
        }
      });
      
      merchantStats = Array.from(merchantMap.values());
    }
  } catch (error) {
    console.log('Using demo data - Supabase not available');
  }

  // Calculate totals
  totalVolume = merchantStats.reduce((sum, m) => sum + m.total_volume, 0);
  totalProfit = merchantStats.reduce((sum, m) => sum + m.net_profit, 0);
  avgBps = merchantStats.length > 0 ? merchantStats.reduce((sum, m) => sum + m.bps, 0) / merchantStats.length : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MerchantAnalyticsCard
          title="Total Volume (MTD)"
          value={totalVolume}
          change={5.2}
          unit="$"
        />
        <MerchantAnalyticsCard
          title="Total Profit (MTD)"
          value={totalProfit}
          change={3.8}
          unit="$"
        />
        <MerchantAnalyticsCard
          title="Avg BPS"
          value={avgBps}
          change={-1.2}
          unit=""
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MerchantChart
          title="Monthly Volume Trend"
          data={volumeTrend}
          type="line"
          xKey="month"
          yKey="volume"
        />
        <MerchantChart
          title="Monthly Profit Trend"
          data={profitTrend}
          type="line"
          xKey="month"
          yKey="profit"
        />
      </div>

      {/* Merchant Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <MerchantTable merchants={merchantStats.map(m => ({
          name: m.name,
          volume: m.total_volume,
          profit: m.net_profit,
          bps: m.bps,
          merchantId: m.merchant_id
        }))} />
      </div>
    </div>
  );
}
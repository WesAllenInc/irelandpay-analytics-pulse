import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { MerchantTable } from '@/components/analytics/MerchantTable';
import React from 'react';

// Demo data for when Supabase is not available
const demoMerchants = [
  { merchant_id: 'demo-1', name: 'Demo Merchant 1', total_volume: 1250000, net_profit: 12500, bps: 100 },
  { merchant_id: 'demo-2', name: 'Demo Merchant 2', total_volume: 890000, net_profit: 8900, bps: 100 },
  { merchant_id: 'demo-3', name: 'Demo Merchant 3', total_volume: 2100000, net_profit: 21000, bps: 100 },
  { merchant_id: 'demo-4', name: 'Demo Merchant 4', total_volume: 750000, net_profit: 7500, bps: 100 },
  { merchant_id: 'demo-5', name: 'Demo Merchant 5', total_volume: 1800000, net_profit: 18000, bps: 100 },
  { merchant_id: 'demo-6', name: 'Demo Merchant 6', total_volume: 3200000, net_profit: 32000, bps: 100 },
  { merchant_id: 'demo-7', name: 'Demo Merchant 7', total_volume: 1500000, net_profit: 15000, bps: 100 },
  { merchant_id: 'demo-8', name: 'Demo Merchant 8', total_volume: 950000, net_profit: 9500, bps: 100 },
  { merchant_id: 'demo-9', name: 'Demo Merchant 9', total_volume: 2800000, net_profit: 28000, bps: 100 },
  { merchant_id: 'demo-10', name: 'Demo Merchant 10', total_volume: 1100000, net_profit: 11000, bps: 100 },
];

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<{ month?: string; volume?: string; bps?: string }> }) {
  let merchants = demoMerchants;
  const resolvedParams = await searchParams;
  const month = resolvedParams?.month || new Date().toISOString().slice(0, 7);
  const volumeThreshold = Number(resolvedParams?.volume) || 0;
  const bpsThreshold = Number(resolvedParams?.bps) || 0;

  try {
    const supabase = createSupabaseServerClient();

    // Fetch all merchant data for the selected month
    const { data: merchantRows } = await supabase
      .from('merchant_data')
      .select('merchant_id, name, total_volume, net_profit, bps')
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`);

    if (merchantRows && merchantRows.length > 0) {
      // Aggregate data by merchant_id
      const merchantMap = new Map();
      
      merchantRows.forEach((row: any) => {
        const existing = merchantMap.get(row.merchant_id);
        if (existing) {
          existing.total_volume += row.total_volume || 0;
          existing.net_profit += row.net_profit || 0;
          existing.bps = row.bps || existing.bps;
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
      
      merchants = Array.from(merchantMap.values());
    }
  } catch (error) {
    console.log('Using demo data - Supabase not available');
  }

  // Apply filters
  merchants = merchants.filter(m => 
    m.total_volume >= volumeThreshold && 
    m.bps >= bpsThreshold
  );

  // Sort and get top 10
  const topByVolume = [...merchants]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 10)
    .map(m => ({ x: m.name, y: m.total_volume }));

  const topByProfit = [...merchants]
    .sort((a, b) => b.net_profit - a.net_profit)
    .slice(0, 10)
    .map(m => ({ x: m.name, y: m.net_profit }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="month" className="block text-sm font-medium mb-2">Month</label>
            <input
              id="month"
              type="month"
              name="month"
              defaultValue={month}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="volume" className="block text-sm font-medium mb-2">Min Volume</label>
            <input
              id="volume"
              type="number"
              name="volume"
              defaultValue={volumeThreshold}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="bps" className="block text-sm font-medium mb-2">Min BPS</label>
            <input
              id="bps"
              type="number"
              name="bps"
              defaultValue={bpsThreshold}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MerchantChart
          title="Top 10 Merchants by Volume"
          data={topByVolume}
          type="bar"
        />
        <MerchantChart
          title="Top 10 Merchants by Profit"
          data={topByProfit}
          type="bar"
        />
      </div>

      {/* Merchant Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <MerchantTable merchants={merchants.map(m => ({
          name: m.name,
          volume: m.total_volume,
          profit: m.net_profit,
          bps: m.bps,
          processor: 'Unknown', // Add default processor value
          merchantId: m.merchant_id
        }))} />
      </div>
    </div>
  );
} 
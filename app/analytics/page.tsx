import { createSupabaseServerClient } from '@/lib/supabase';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { MerchantTable } from '@/components/analytics/MerchantTable';
import React from 'react';

export default async function AnalyticsPage({ searchParams }: { searchParams?: { month?: string; volume?: string; bps?: string } }) {
  const supabase = createSupabaseServerClient();

  // Filters
  const month = searchParams?.month || new Date().toISOString().slice(0, 7);
  const volumeThreshold = Number(searchParams?.volume) || 0;
  const bpsThreshold = Number(searchParams?.bps) || 0;

  // Fetch all merchant data for the selected month
  const { data: merchantRows } = await supabase
    .from('merchant_data')
    .select('merchant_id, name, total_volume, net_profit, bps')
    .like('month', `${month}%`);

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

  // Filter by thresholds
  const filtered = merchants.filter(m =>
    m.volume >= volumeThreshold && m.bps >= bpsThreshold
  );

  // Top 10 by volume and profit
  const topByVolume = [...filtered].sort((a, b) => b.volume - a.volume).slice(0, 10);
  const topByProfit = [...filtered].sort((a, b) => b.profit - a.profit).slice(0, 10);

  // Prepare chart/table data
  const chartVolumeData = topByVolume.map(m => ({ name: m.name, volume: m.volume }));
  const chartProfitData = topByProfit.map(m => ({ name: m.name, profit: m.profit }));
  const tableData = filtered.map(m => ({
    name: m.name,
    volume: m.volume,
    profit: m.profit,
    bps: m.bps,
    merchantId: m.merchantId,
  }));

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Analytics</h1>
      <form className="flex flex-wrap gap-4 mb-6">
        <label className="flex flex-col text-sm">
          Month
          <input type="month" name="month" defaultValue={month} className="border rounded px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Volume Threshold
          <input type="number" name="volume" min={0} defaultValue={volumeThreshold} className="border rounded px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          BPS Threshold
          <input type="number" name="bps" min={0} defaultValue={bpsThreshold} className="border rounded px-2 py-1" />
        </label>
        <button type="submit" className="self-end px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <MerchantChart title="Top 10 Merchants by Volume" data={chartVolumeData} type="bar" xKey="name" yKey="volume" />
        <MerchantChart title="Top 10 Merchants by Profit" data={chartProfitData} type="bar" xKey="name" yKey="profit" />
      </div>
      <MerchantTable merchants={tableData} />
    </div>
  );
} 
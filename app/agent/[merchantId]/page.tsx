import React from 'react';
import { DashboardKPI, type KPI } from '@/components/analytics/DashboardKPI';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { TimeframeSelector, type Timeframe } from '@/components/analytics/TimeframeSelector';
import { getMerchantHistory } from '@/lib/queries/merchantData';

interface Props {
  params: Promise<{ merchantId: string }>;
}

export default async function MerchantDetailPage({ params }: Props) {
  const { merchantId } = await params;
  
  // Get current month data for initial load
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  let merchantHistory: { date: string; volume: number; profit: number; processor: string }[] = [];
  let merchantName = 'Unknown Merchant';
  let totalVolume = 0;
  let totalProfit = 0;
  let avgBps = 0;
  let processor = 'Unknown';

  try {
    merchantHistory = await getMerchantHistory(merchantId, monthStart, monthEnd);
    
    if (merchantHistory.length > 0) {
      totalVolume = merchantHistory.reduce((sum, item) => sum + item.volume, 0);
      totalProfit = merchantHistory.reduce((sum, item) => sum + item.profit, 0);
      avgBps = totalVolume > 0 ? (totalProfit / totalVolume) * 10000 : 0;
      processor = merchantHistory[0].processor;
      // Get merchant name from the first record (assuming it's consistent)
      merchantName = `Merchant ${merchantId}`;
    }
  } catch (error) {
    console.error('Error fetching merchant data:', error);
  }

  // Prepare chart data
  const volumeData = merchantHistory.map(item => ({
    x: new Date(item.date).getDate(),
    y: item.volume
  }));

  const profitData = merchantHistory.map(item => ({
    x: new Date(item.date).getDate(),
    y: item.profit
  }));

  const dailyData = merchantHistory.map(item => ({
    x: new Date(item.date).getDate(),
    y: item.volume
  }));

  // Prepare KPI data
  const kpis: KPI[] = [
    {
      label: 'Total Volume',
      value: totalVolume,
      unit: '$',
      highlight: true
    },
    {
      label: 'Total Profit',
      value: totalProfit,
      unit: '$',
      highlight: true
    },
    {
      label: 'BPS Average',
      value: avgBps,
      unit: '%',
      highlight: false
    },
    {
      label: 'Processor',
      value: 0, // We'll display this as text
      unit: '',
      highlight: false
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{merchantName}</h1>
        <div className="text-sm text-gray-600">ID: {merchantId}</div>
      </div>

      {/* KPI Cards */}
      <DashboardKPI kpis={kpis} />

      {/* Timeframe Selector */}
      <TimeframeSelector
        selectedTimeframe="Monthly"
        onTimeframeChange={() => {}} // Will be handled by client component
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MerchantChart
          title="Volume Over Time"
          data={volumeData}
          type="bar"
          highlightIndex={volumeData.length - 1}
          highlightColor="#EF4444"
        />
        <MerchantChart
          title="Profit Over Time"
          data={profitData}
          type="line"
          highlightIndex={profitData.length - 1}
          highlightColor="#EF4444"
        />
      </div>

      {/* Daily/Monthly Totals Chart */}
      <div className="mb-8">
        <MerchantChart
          title="Daily Volume"
          data={dailyData}
          type="area"
        />
      </div>

      {/* Processor Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Processor Information</h2>
        <div className="text-gray-700 dark:text-gray-300">
          <p><strong>Processor:</strong> {processor}</p>
        </div>
      </div>
    </div>
  );
} 
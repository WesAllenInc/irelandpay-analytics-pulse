'use client';

import { useState, useEffect } from 'react';
import { MerchantAnalyticsCard } from '@/components/analytics/MerchantAnalyticsCard';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { MerchantTable } from '@/components/analytics/MerchantTable';

interface IrisData {
  merchants: Array<{
    merchant_id: string;
    name: string;
    total_volume: number;
    net_profit: number;
    bps: number;
    transaction_count: number;
  }>;
  daily_data: Array<{
    date: string;
    merchant_id: string;
    merchant_name: string;
    volume: number;
    profit: number;
    bps: number;
    transactions: number;
  }>;
  summary: {
    total_merchants: number;
    total_volume: number;
    total_profit: number;
    avg_bps: number;
    period: string;
  };
}

export default function IrisTestPage() {
  const [data, setData] = useState<IrisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const fetchIrisData = async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/test-iriscrm?year=${year}&month=${month}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    fetchIrisData(year, month);
  }, [selectedMonth]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Iris CRM data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error Loading Data</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => {
              const [year, month] = selectedMonth.split('-').map(Number);
              fetchIrisData(year, month);
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  // Prepare chart data
  const dailyVolumeData = data.daily_data
    .reduce((acc, day) => {
      const existing = acc.find(d => d.date === day.date);
      if (existing) {
        existing.volume += day.volume;
      } else {
        acc.push({ date: day.date, volume: day.volume });
      }
      return acc;
    }, [] as Array<{ date: string; volume: number }>)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dailyProfitData = data.daily_data
    .reduce((acc, day) => {
      const existing = acc.find(d => d.date === day.date);
      if (existing) {
        existing.profit += day.profit;
      } else {
        acc.push({ date: day.date, profit: day.profit });
      }
      return acc;
    }, [] as Array<{ date: string; profit: number }>)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const topMerchantsByVolume = [...data.merchants]
    .sort((a, b) => b.total_volume - a.total_volume)
    .slice(0, 5)
    .map(m => ({ name: m.name, volume: m.total_volume }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Iris CRM API Test</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-blue-800 font-semibold mb-2">API Connection Status</h2>
        <p className="text-blue-600">
          ✅ Successfully connected to Iris CRM API (simulated)
        </p>
        <p className="text-blue-600 text-sm">
          Period: {data.summary.period} | 
          Merchants: {data.summary.total_merchants} | 
          Total Volume: ${data.summary.total_volume.toLocaleString()} | 
          Total Profit: ${data.summary.total_profit.toLocaleString()}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MerchantAnalyticsCard
          title="Total Volume"
          value={data.summary.total_volume}
          change={5.2}
          unit="$"
        />
        <MerchantAnalyticsCard
          title="Total Profit"
          value={data.summary.total_profit}
          change={3.8}
          unit="$"
        />
        <MerchantAnalyticsCard
          title="Avg BPS"
          value={data.summary.avg_bps}
          change={-1.2}
          unit=""
        />
        <MerchantAnalyticsCard
          title="Active Merchants"
          value={data.summary.total_merchants}
          change={0}
          unit=""
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MerchantChart
          title="Daily Volume Trend"
          data={dailyVolumeData.map(d => ({ x: d.date, y: d.volume }))}
          type="line"
        />
        <MerchantChart
          title="Daily Profit Trend"
          data={dailyProfitData.map(d => ({ x: d.date, y: d.profit }))}
          type="line"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MerchantChart
          title="Top 5 Merchants by Volume"
          data={topMerchantsByVolume.map(m => ({ x: m.name, y: m.volume }))}
          type="bar"
        />
        <MerchantChart
          title="Merchant BPS Distribution"
          data={data.merchants.map(m => ({ x: m.name, y: m.bps }))}
          type="bar"
        />
      </div>

      {/* Merchant Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <MerchantTable merchants={data.merchants.map(m => ({
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
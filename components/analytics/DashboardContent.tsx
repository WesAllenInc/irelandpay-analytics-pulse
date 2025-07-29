'use client';

import React, { useState, useEffect } from 'react';
import { MerchantTable } from '@/components/analytics/MerchantTable';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { DashboardKPI, type KPI } from '@/components/analytics/DashboardKPI';
import { TimeframeSelector, type Timeframe } from '@/components/analytics/TimeframeSelector';

interface DashboardContentProps {
  initialData: {
    kpis: KPI[];
    volumeData: Array<{ x: string | number; y: number }>;
    profitData: Array<{ x: string | number; y: number }>;
    dailyData: Array<{ x: string | number; y: number }>;
    merchantStats: any[];
  };
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ initialData }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('Monthly');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const fetchChartDataForTimeframe = async (timeframe: Timeframe) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard-metrics?timeframe=${timeframe}`);
      if (response.ok) {
        const newData = await response.json();
        // Only update the chart data, keep KPI cards and other data static
        setData(prevData => ({
          ...prevData,
          volumeData: newData.volumeData,
          profitData: newData.profitData
        }));
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTimeframe !== 'Monthly') {
      fetchChartDataForTimeframe(selectedTimeframe);
    } else {
      // Reset to initial data for monthly view
      setData(initialData);
    }
  }, [selectedTimeframe]);

  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <TimeframeSelector
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={handleTimeframeChange}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <DashboardKPI kpis={data.kpis} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <MerchantChart
              title={`Total Volume (${selectedTimeframe})`}
              data={data.volumeData}
              type="bar"
              highlightIndex={selectedTimeframe === 'Monthly' ? data.volumeData.length - 1 : undefined}
              highlightColor="#EF4444"
            />
            <MerchantChart
              title={`Total Profit (${selectedTimeframe})`}
              data={data.profitData}
              type="line"
              highlightIndex={selectedTimeframe === 'Monthly' ? data.profitData.length - 1 : undefined}
              highlightColor="#EF4444"
            />
          </div>

          {/* Daily Deposit Chart */}
          <div className="mb-8">
            <MerchantChart
              title="Daily Deposits"
              data={data.dailyData}
              type="area"
            />
          </div>

          {/* Merchant Table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
            <MerchantTable merchants={data.merchantStats.map(m => ({
              name: m.name,
              volume: m.total_volume,
              profit: m.net_profit,
              bps: m.bps,
              merchantId: m.merchant_id
            }))} />
          </div>
        </>
      )}
    </div>
  );
}; 
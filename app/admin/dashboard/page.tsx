'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, TooltipProps
} from 'recharts';

interface DashboardData {
  currentMonth: string;
  volumeData: {
    totalVolume: number;
    projectedVolume: number;
    daysElapsed: number;
    totalDays: number;
    percentComplete: number;
  };
  profitData: {
    netProfit: number;
    forecastedProfit: number;
    avgBps: number;
  };
  monthlyTrends: {
    month: string;
    volume: number;
    profit: number;
  }[];
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      
      const [year, month] = selectedMonth.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(startDate);
      const daysInMonth = getDaysInMonth(startDate);
      const today = new Date();
      const daysElapsed = Math.min(
        today > endDate ? daysInMonth : today.getDate(),
        daysInMonth
      );
      
      // Get volume data for current month
      const { data: volumeData, error: volumeError } = await supabase
        .from('merchant_processing_volumes')
        .select('gross_volume, processing_month')
        .like('processing_month', `${selectedMonth}%`);
      
      if (volumeError) {
        console.error('Error fetching volume data:', volumeError);
      }
      
      // Get residual data for current month
      const { data: residualData, error: residualError } = await supabase
        .from('residuals')
        .select('net_residual, processing_month')
        .like('processing_month', `${selectedMonth}%`);
      
      if (residualError) {
        console.error('Error fetching residual data:', residualError);
      }
      
      // Get previous month's data for BPS calculation
      const prevMonth = new Date(parseInt(year), parseInt(month) - 2);
      const prevMonthStr = format(prevMonth, 'yyyy-MM');
      
      const { data: prevMonthVolumeData, error: prevVolumeError } = await supabase
        .from('merchant_processing_volumes')
        .select('gross_volume')
        .like('processing_month', `${prevMonthStr}%`);
      
      if (prevVolumeError) {
        console.error('Error fetching previous month volume data:', prevVolumeError);
      }
      
      const { data: prevMonthResidualData, error: prevResidualError } = await supabase
        .from('residuals')
        .select('net_residual')
        .like('processing_month', `${prevMonthStr}%`);
      
      if (prevResidualError) {
        console.error('Error fetching previous month residual data:', prevResidualError);
      }
      
      // Get trend data for past 6 months
      const sixMonthsAgo = new Date(parseInt(year), parseInt(month) - 7);
      const sixMonthsAgoStr = format(sixMonthsAgo, 'yyyy-MM');
      
      const { data: trendVolumeData, error: trendVolumeError } = await supabase
        .from('merchant_processing_volumes')
        .select('gross_volume, processing_month')
        .gte('processing_month', sixMonthsAgoStr);
      
      if (trendVolumeError) {
        console.error('Error fetching trend volume data:', trendVolumeError);
      }
      
      const { data: trendProfitData, error: trendProfitError } = await supabase
        .from('residuals')
        .select('net_residual, processing_month')
        .gte('processing_month', sixMonthsAgoStr);
      
      if (trendProfitError) {
        console.error('Error fetching trend profit data:', trendProfitError);
      }
      
      // Calculate metrics
      const totalVolume = volumeData?.reduce((sum, item) => sum + (item.gross_volume || 0), 0) || 0;
      const netProfit = residualData?.reduce((sum, item) => sum + (item.net_residual || 0), 0) || 0;
      
      // Calculate projections
      const percentComplete = daysElapsed / daysInMonth;
      const projectedVolume = totalVolume / percentComplete;
      
      // Calculate average BPS from previous month
      const prevTotalVolume = prevMonthVolumeData?.reduce((sum, item) => sum + (item.gross_volume || 0), 0) || 0;
      const prevTotalProfit = prevMonthResidualData?.reduce((sum, item) => sum + (item.net_residual || 0), 0) || 0;
      const avgBps = prevTotalVolume > 0 ? (prevTotalProfit / prevTotalVolume) * 10000 : 0;
      
      // Calculate forecasted profit
      const forecastedProfit = projectedVolume * avgBps / 10000;
      
      // Process trend data
      const monthlyTrends: Record<string, { volume: number, profit: number }> = {};
      
      if (trendVolumeData) {
        trendVolumeData.forEach(item => {
          const monthKey = item.processing_month.substring(0, 7);
          if (!monthlyTrends[monthKey]) {
            monthlyTrends[monthKey] = { volume: 0, profit: 0 };
          }
          monthlyTrends[monthKey].volume += item.gross_volume || 0;
        });
      }
      
      if (trendProfitData) {
        trendProfitData.forEach(item => {
          const monthKey = item.processing_month.substring(0, 7);
          if (!monthlyTrends[monthKey]) {
            monthlyTrends[monthKey] = { volume: 0, profit: 0 };
          }
          monthlyTrends[monthKey].profit += item.net_residual || 0;
        });
      }
      
      const trendData = Object.entries(monthlyTrends).map(([month, data]) => ({
        month,
        volume: data.volume,
        profit: data.profit
      })).sort((a, b) => a.month.localeCompare(b.month));
      
      setDashboardData({
        currentMonth: format(startDate, 'MMMM yyyy'),
        volumeData: {
          totalVolume,
          projectedVolume,
          daysElapsed,
          totalDays: daysInMonth,
          percentComplete: percentComplete * 100
        },
        profitData: {
          netProfit,
          forecastedProfit,
          avgBps
        },
        monthlyTrends: trendData
      });
      
      setIsLoading(false);
    }
    
    fetchDashboardData();
  }, [selectedMonth, supabase]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, 'MMM yyyy');
  };

  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading dashboard data...</div>;
  }

  if (!dashboardData) {
    return <div className="p-4 border rounded bg-red-50 text-red-800">Failed to load dashboard data</div>;
  }

  // Format chart data for recharts
  const chartData = dashboardData.monthlyTrends.map(item => ({
    month: formatMonthLabel(item.month),
    volume: item.volume,
    profit: item.profit
  }));
  
  // Custom tooltip formatter for currency values
  const CurrencyTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => {
            const colorClass = entry.name === 'Processing Volume' ? 'text-blue-600' : 'text-green-600';
            return (
              <p key={index} className={colorClass}>
                {entry.name}: {formatCurrency(entry.value as number)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">{dashboardData.currentMonth} Overview</h2>
        <div className="flex items-center space-x-2">
          <select
            value={selectedMonth.split('-')[1] || ''}
            onChange={(e) => {
              const year = selectedMonth.split('-')[0];
              setSelectedMonth(`${year}-${e.target.value}`);
            }}
            className="border rounded p-2"
            aria-label="Select month"
          >
            {[
              { value: '01', label: 'January' },
              { value: '02', label: 'February' },
              { value: '03', label: 'March' },
              { value: '04', label: 'April' },
              { value: '05', label: 'May' },
              { value: '06', label: 'June' },
              { value: '07', label: 'July' },
              { value: '08', label: 'August' },
              { value: '09', label: 'September' },
              { value: '10', label: 'October' },
              { value: '11', label: 'November' },
              { value: '12', label: 'December' }
            ].map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <select
            value={selectedMonth.split('-')[0] || ''}
            onChange={(e) => {
              const month = selectedMonth.split('-')[1];
              setSelectedMonth(`${e.target.value}-${month}`);
            }}
            className="border rounded p-2"
            aria-label="Select year"
          >
            {[
              new Date().getFullYear(),
              new Date().getFullYear() - 1,
              new Date().getFullYear() - 2
            ].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Processing Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.volumeData.totalVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData.volumeData.daysElapsed} of {dashboardData.volumeData.totalDays} days ({dashboardData.volumeData.percentComplete.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projected Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.volumeData.projectedVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current pace
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.profitData.netProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month to date
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Forecasted Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.profitData.forecastedProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg BPS: {dashboardData.profitData.avgBps.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales Volume</CardTitle>
            <CardDescription>
              Monthly processing volume trend
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => 
                    '$' + new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)
                  } 
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="volume"
                  name="Processing Volume"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
            <CardDescription>
              Monthly net profit trend
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => 
                    '$' + new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)
                  } 
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend />
                <Bar 
                  dataKey="profit" 
                  name="Net Profit" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

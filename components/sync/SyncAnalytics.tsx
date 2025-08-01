"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientComponentClient } from '@/lib/supabase/client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface SyncAnalyticsData {
  daily: Array<{
    date: string;
    duration: number;
    recordsProcessed: number;
    successRate: number;
  }>;
  avgDuration: number;
  successRate: number;
  dataAge: number;
  durationTrend: number;
  successTrend: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  description?: string;
}

function MetricCard({ title, value, unit, trend, description }: MetricCardProps) {
  const getTrendColor = (trend?: number) => {
    if (!trend) return 'text-gray-500';
    return trend > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getTrendIcon = (trend?: number) => {
    if (!trend) return null;
    return trend > 0 ? '↗' : '↘';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${getTrendColor(trend)}`}>
            <span className="mr-1">{getTrendIcon(trend)}</span>
            <span>{Math.abs(trend)}% from last week</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SyncAnalytics() {
  const [analytics, setAnalytics] = useState<SyncAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch sync history for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: syncHistory, error } = await supabase
        .from('sync_status')
        .select('*')
        .gte('started_at', thirtyDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch sync history:', error);
        return;
      }

      // Process data for analytics
      const processedData = processSyncData(syncHistory || []);
      setAnalytics(processedData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSyncData = (syncHistory: any[]): SyncAnalyticsData => {
    // Group by date
    const dailyData = new Map<string, {
      date: string;
      duration: number[];
      recordsProcessed: number[];
      successCount: number;
      totalCount: number;
    }>();

    syncHistory.forEach(sync => {
      const date = new Date(sync.started_at).toISOString().split('T')[0];
      const duration = sync.completed_at 
        ? new Date(sync.completed_at).getTime() - new Date(sync.started_at).getTime()
        : 0;
      
      const recordsProcessed = sync.results 
        ? (sync.results.merchants || 0) + (sync.results.transactions || 0) + (sync.results.residuals || 0)
        : 0;

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          duration: [],
          recordsProcessed: [],
          successCount: 0,
          totalCount: 0
        });
      }

      const dayData = dailyData.get(date)!;
      dayData.duration.push(duration);
      dayData.recordsProcessed.push(recordsProcessed);
      dayData.totalCount++;
      if (sync.status === 'completed') {
        dayData.successCount++;
      }
    });

    // Convert to chart format
    const daily = Array.from(dailyData.values()).map(day => ({
      date: day.date,
      duration: day.duration.length > 0 ? day.duration.reduce((a, b) => a + b, 0) / day.duration.length : 0,
      recordsProcessed: day.recordsProcessed.reduce((a, b) => a + b, 0),
      successRate: day.totalCount > 0 ? (day.successCount / day.totalCount) * 100 : 0
    }));

    // Calculate overall metrics
    const completedSyncs = syncHistory.filter(s => s.status === 'completed' && s.completed_at);
    const avgDuration = completedSyncs.length > 0 
      ? completedSyncs.reduce((sum, sync) => {
          const duration = new Date(sync.completed_at).getTime() - new Date(sync.started_at).getTime();
          return sum + duration;
        }, 0) / completedSyncs.length
      : 0;

    const successRate = syncHistory.length > 0 
      ? (syncHistory.filter(s => s.status === 'completed').length / syncHistory.length) * 100
      : 0;

    // Calculate data age (time since last successful sync)
    const lastSuccessfulSync = syncHistory
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
    
    const dataAge = lastSuccessfulSync 
      ? Math.floor((Date.now() - new Date(lastSuccessfulSync.completed_at).getTime()) / (1000 * 60))
      : 0;

    // Calculate trends (comparing last 7 days vs previous 7 days)
    const last7Days = daily.slice(-7);
    const previous7Days = daily.slice(-14, -7);
    
    const durationTrend = previous7Days.length > 0 && last7Days.length > 0
      ? ((last7Days.reduce((sum, day) => sum + day.duration, 0) / last7Days.length) - 
         (previous7Days.reduce((sum, day) => sum + day.duration, 0) / previous7Days.length)) / 
         (previous7Days.reduce((sum, day) => sum + day.duration, 0) / previous7Days.length) * 100
      : 0;

    const successTrend = previous7Days.length > 0 && last7Days.length > 0
      ? ((last7Days.reduce((sum, day) => sum + day.successRate, 0) / last7Days.length) - 
         (previous7Days.reduce((sum, day) => sum + day.successRate, 0) / previous7Days.length)) / 
         (previous7Days.reduce((sum, day) => sum + day.successRate, 0) / previous7Days.length) * 100
      : 0;

    return {
      daily,
      avgDuration,
      successRate,
      dataAge,
      durationTrend,
      successTrend
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-gray-200 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="h-80 bg-gray-200 animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No analytics data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const formatDataAge = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sync Performance (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: any, name: string) => [
                  name === 'duration' ? formatDuration(value) : value,
                  name === 'duration' ? 'Duration' : name === 'recordsProcessed' ? 'Records' : 'Success Rate'
                ]}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="duration" 
                stroke="#8884d8" 
                name="Duration" 
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="recordsProcessed" 
                stroke="#82ca9d" 
                name="Records" 
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="successRate" 
                stroke="#ffc658" 
                name="Success Rate" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Average Sync Time"
          value={formatDuration(analytics.avgDuration)}
          trend={analytics.durationTrend}
        />
        <MetricCard
          title="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          trend={analytics.successTrend}
        />
        <MetricCard
          title="Data Freshness"
          value={formatDataAge(analytics.dataAge)}
          description="Time since last successful sync"
        />
      </div>

      {/* Additional charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Records Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="recordsProcessed" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Successful', value: analytics.successRate, color: '#82ca9d' },
                    { name: 'Failed', value: 100 - analytics.successRate, color: '#ff6b6b' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                >
                  {[
                    { name: 'Successful', value: analytics.successRate, color: '#82ca9d' },
                    { name: 'Failed', value: 100 - analytics.successRate, color: '#ff6b6b' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
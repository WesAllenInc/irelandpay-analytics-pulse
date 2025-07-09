import React from 'react';
import { SyncMetrics, SyncPerformanceAnalysis } from '@/hooks/useSyncAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

interface SyncPerformanceChartProps {
  metrics: SyncMetrics | null;
  performanceAnalysis: SyncPerformanceAnalysis | null;
}

export function SyncPerformanceChart({ 
  metrics, 
  performanceAnalysis 
}: SyncPerformanceChartProps) {
  if (!metrics || !performanceAnalysis) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No performance data available</p>
      </div>
    );
  }

  // Format duration in a human-readable way
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  // Data for the sync performance chart
  const syncPerformanceData = [
    { name: 'Average Time', value: metrics.average_duration_seconds },
    { name: 'Longest Time', value: metrics.longest_sync_seconds }
  ];

  // Data for the sync volume chart
  const syncVolumeData = [
    { name: 'Merchants', value: performanceAnalysis.merchants_count },
    { name: 'Residuals', value: performanceAnalysis.residuals_count }
  ];

  // Data for the sync results chart
  const syncResultsData = [
    { name: 'Successful', value: metrics.successful_syncs },
    { name: 'Failed', value: metrics.failed_syncs }
  ];

  // Custom tooltip formatter for the charts
  const renderTooltip = (params: any) => {
    const { payload, label } = params;
    if (payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-background p-2 border rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          {label === 'Average Time' || label === 'Longest Time' ? (
            <p className="text-blue-500">{formatDuration(data.value)}</p>
          ) : (
            <p className="text-blue-500">{data.value.toLocaleString()}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="sync-time">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="sync-time">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-4 h-4" />
              <span>Sync Time</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="data-volume">
            <div className="flex items-center gap-2">
              <BarChartIcon className="w-4 h-4" />
              <span>Data Volume</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="sync-results">
            <div className="flex items-center gap-2">
              <BarChartIcon className="w-4 h-4" />
              <span>Sync Results</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sync-time" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-md">Sync Duration</CardTitle>
              <CardDescription>Average and longest sync times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={syncPerformanceData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => formatDuration(value)}
                      label={{ 
                        value: 'Duration (seconds)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip content={renderTooltip} />
                    <Legend />
                    <Bar dataKey="value" fill="#3b82f6" name="Duration" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  Last sync completed: {
                    performanceAnalysis.last_sync_completed_at
                      ? new Date(performanceAnalysis.last_sync_completed_at).toLocaleString()
                      : 'N/A'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data-volume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-md">Data Volume</CardTitle>
              <CardDescription>Number of records in each table</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={syncVolumeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => value.toLocaleString()}
                      label={{ 
                        value: 'Record Count', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip content={renderTooltip} />
                    <Legend />
                    <Bar dataKey="value" fill="#10b981" name="Records" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sync-results" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-md">Sync Results</CardTitle>
              <CardDescription>Success vs. failure rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={syncResultsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => value.toLocaleString()}
                      label={{ 
                        value: 'Count', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip content={renderTooltip} />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      fill="#10b981"
                      name="Count"
                    >
                      {syncPerformanceData.map((entry: {name: string, value: number}, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Successful' ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Success Rate: {metrics.sync_success_rate.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

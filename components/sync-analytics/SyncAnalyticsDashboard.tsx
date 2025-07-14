"use client";

import React from 'react';
import { useSyncAnalytics } from '@/hooks/useSyncAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCcw, CheckCircle, XCircle, Clock, BarChart } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { SyncQueueMetrics } from './SyncQueueMetrics';
import { SyncPerformanceChart } from './SyncPerformanceChart';
import { SyncRecommendations } from './SyncRecommendations';

interface SyncAnalyticsDashboardProps {
  className?: string;
  refreshInterval?: number;
}

export function SyncAnalyticsDashboard({ 
  className,
  refreshInterval = 60 * 1000 // 1 minute
}: SyncAnalyticsDashboardProps) {
  const { 
    metrics, 
    queueStats, 
    performanceAnalysis,
    isLoading, 
    error, 
    refresh 
  } = useSyncAnalytics(refreshInterval);
  
  // Format duration in a human-readable way
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  // Determine sync health status
  const getSyncHealthStatus = () => {
    if (!metrics) return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
    
    const { sync_success_rate } = metrics;
    
    if (sync_success_rate >= 95) {
      return { status: 'healthy', label: 'Healthy', color: 'bg-green-500' };
    } else if (sync_success_rate >= 80) {
      return { status: 'warning', label: 'Warning', color: 'bg-yellow-500' };
    } else {
      return { status: 'critical', label: 'Critical', color: 'bg-red-500' };
    }
  };

  const syncHealth = getSyncHealthStatus();

  // Check if there are any active jobs
  const hasActiveJobs = queueStats && 
    (queueStats.pending > 0 || queueStats.running > 0 || queueStats.retrying > 0);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Sync Analytics</span>
            <Button variant="ghost" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>Loading sync performance data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Sync Analytics</span>
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <Button onClick={refresh} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Sync Analytics Dashboard</CardTitle>
            <CardDescription>
              Monitor sync performance, queue status, and system health
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} title="Refresh data">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sync Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${syncHealth.color}`}></div>
                  <span className="font-medium">{syncHealth.label}</span>
                </div>
                <span className="text-2xl font-bold">
                  {metrics?.sync_success_rate?.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics?.sync_success_rate || 0} 
                className="h-2 mt-2" 
                indicatorColor={syncHealth.color.replace('bg-', 'bg-')}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Successful</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics?.successful_syncs || 0}</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Failed</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics?.failed_syncs || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Sync Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Duration</span>
                </div>
                <span className="text-2xl font-bold">
                  {formatDuration(metrics?.average_duration_seconds || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Active Sync Jobs Alert */}
        {hasActiveJobs && (
          <Alert className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4 text-blue-500" />
              <AlertTitle>Active Sync Jobs</AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              <div className="flex flex-wrap gap-3">
                {queueStats?.pending ? (
                  <span className="text-sm bg-blue-100 px-2 py-1 rounded-md">
                    {queueStats.pending} pending
                  </span>
                ) : null}
                
                {queueStats?.running ? (
                  <span className="text-sm bg-green-100 px-2 py-1 rounded-md">
                    {queueStats.running} running
                  </span>
                ) : null}
                
                {queueStats?.retrying ? (
                  <span className="text-sm bg-yellow-100 px-2 py-1 rounded-md">
                    {queueStats.retrying} retrying
                  </span>
                ) : null}
              </div>
              
              {queueStats?.oldest_pending && (
                <p className="text-xs mt-2">
                  Oldest pending job: {
                    formatDistanceToNow(new Date(queueStats.oldest_pending), { addSuffix: true })
                  }
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Detailed Stats Tabs */}
        <Tabs defaultValue="queue">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="queue">Queue Metrics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="queue" className="mt-4">
            <SyncQueueMetrics queueStats={queueStats} />
          </TabsContent>
          
          <TabsContent value="performance" className="mt-4">
            <SyncPerformanceChart 
              metrics={metrics}
              performanceAnalysis={performanceAnalysis}
            />
          </TabsContent>
          
          <TabsContent value="recommendations" className="mt-4">
            <SyncRecommendations 
              performanceAnalysis={performanceAnalysis}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

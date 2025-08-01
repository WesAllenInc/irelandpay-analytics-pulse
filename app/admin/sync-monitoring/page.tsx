"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClientComponentClient } from '@/lib/supabase/client';
import { SyncProgressDisplay } from '@/components/sync/SyncProgressDisplay';
import { useAdminCheck } from '@/hooks/use-admin-check';
import { redirect } from 'next/navigation';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';

interface SyncStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data_type: string;
  started_at: string;
  completed_at?: string;
  results?: any;
  error?: string;
}

interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageDuration: number;
  lastSyncTime?: string;
  nextScheduledSync?: string;
}

export default function SyncMonitoringPage() {
  const { isAdmin, loading } = useAdminCheck();
  const [activeSyncs, setActiveSyncs] = useState<SyncStatus[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (loading) return;
    
    if (!isAdmin) {
      redirect('/dashboard');
    }

    fetchSyncData();
    setupRealtimeSubscription();
  }, [isAdmin, loading]);

  const fetchSyncData = async () => {
    try {
      // Fetch active syncs
      const { data: activeData } = await supabase
        .from('sync_status')
        .select('*')
        .in('status', ['pending', 'running'])
        .order('started_at', { ascending: false });

      setActiveSyncs(activeData || []);

      // Fetch sync history
      const { data: historyData } = await supabase
        .from('sync_status')
        .select('*')
        .in('status', ['completed', 'failed'])
        .order('started_at', { ascending: false })
        .limit(50);

      setSyncHistory(historyData || []);

      // Calculate stats
      const stats = calculateSyncStats(historyData || []);
      setSyncStats(stats);
    } catch (error) {
      console.error('Failed to fetch sync data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('sync-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_status'
      }, () => {
        fetchSyncData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const calculateSyncStats = (history: SyncStatus[]): SyncStats => {
    const totalSyncs = history.length;
    const successfulSyncs = history.filter(s => s.status === 'completed').length;
    const failedSyncs = history.filter(s => s.status === 'failed').length;
    
    const completedSyncs = history.filter(s => s.status === 'completed' && s.completed_at);
    const totalDuration = completedSyncs.reduce((sum, sync) => {
      const start = new Date(sync.started_at);
      const end = new Date(sync.completed_at!);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    
    const averageDuration = completedSyncs.length > 0 ? totalDuration / completedSyncs.length : 0;
    const lastSyncTime = history[0]?.started_at;
    
    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageDuration,
      lastSyncTime
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sync Monitoring</h1>
        <Button onClick={fetchSyncData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats?.totalSyncs || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time sync operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStats?.totalSyncs ? Math.round((syncStats.successfulSyncs / syncStats.totalSyncs) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStats?.successfulSyncs || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(syncStats?.averageDuration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per sync operation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Syncs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSyncs.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Syncs</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="errors">Error Log</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeSyncs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No active syncs at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            activeSyncs.map((sync) => (
              <Card key={sync.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sync.data_type} Sync</CardTitle>
                    {getStatusBadge(sync.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <SyncProgressDisplay syncId={sync.id} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncHistory.map((sync) => (
                  <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sync.data_type}</span>
                        {getStatusBadge(sync.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started: {new Date(sync.started_at).toLocaleString()}
                      </p>
                      {sync.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Duration: {formatDuration(
                            new Date(sync.completed_at).getTime() - new Date(sync.started_at).getTime()
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {sync.results && (
                        <div className="text-sm text-muted-foreground">
                          {sync.results.merchants && `${sync.results.merchants} merchants`}
                          {sync.results.transactions && ` • ${sync.results.transactions} transactions`}
                          {sync.results.residuals && ` • ${sync.results.residuals} residuals`}
                        </div>
                      )}
                      {sync.error && (
                        <p className="text-sm text-red-600">{sync.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncHistory
                  .filter(sync => sync.status === 'failed')
                  .slice(0, 10)
                  .map((sync) => (
                    <div key={sync.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{sync.data_type} Sync Failed</p>
                          <p className="text-sm text-red-700">{sync.error}</p>
                          <p className="text-xs text-red-600 mt-1">
                            {new Date(sync.started_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Daily Syncs</h3>
                    <p className="text-sm text-muted-foreground">11:00 AM & 7:00 PM</p>
                    <p className="text-sm text-muted-foreground">Incremental updates</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Manual Syncs</h3>
                    <p className="text-sm text-muted-foreground">On-demand full sync</p>
                    <p className="text-sm text-muted-foreground">Available to admins</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
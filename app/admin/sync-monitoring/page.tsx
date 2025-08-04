'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
// import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ActiveSyncJob, 
  SyncJobHistory, 
  SyncFailureSummary,
  SyncType,
  SyncStatus 
} from '@/types/sync';
import { SyncProgressDisplay } from '@/components/sync/SyncProgressDisplay';
import { formatDistanceToNow, format } from 'date-fns';

export default function SyncMonitoringPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeSyncs, setActiveSyncs] = useState<ActiveSyncJob[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncJobHistory[]>([]);
  const [failureSummary, setFailureSummary] = useState<SyncFailureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAdmin) {
      redirect('/dashboard');
      return;
    }

    fetchSyncData();
    setupRealtimeSubscription();
  }, [isAdmin, authLoading]);

  const fetchSyncData = async () => {
    try {
      // Fetch active syncs
      const { data: activeData } = await supabase
        .from('active_sync_jobs')
        .select('*')
        .order('started_at', { ascending: false });

      setActiveSyncs(activeData || []);

      // Fetch sync history
      const { data: historyData } = await supabase
        .from('sync_job_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      setSyncHistory(historyData || []);

      // Fetch failure summary
      const { data: failureData } = await supabase
        .from('sync_failure_summary')
        .select('*');

      setFailureSummary(failureData || []);

    } catch (error) {
      console.error('Error fetching sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to sync job changes
    const subscription = supabase
      .channel('sync-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_jobs'
      }, () => {
        fetchSyncData(); // Refresh data when sync jobs change
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const getStatusColor = (status: SyncStatus): string => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSyncTypeIcon = (type: SyncType): string => {
    switch (type) {
      case 'initial': return '🚀';
      case 'daily': return '📅';
      case 'manual': return '👤';
      case 'historical': return '📊';
      default: return '🔄';
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sync Monitoring</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sync Monitoring</h1>
        <Button onClick={fetchSyncData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SyncStatusCard 
          title="Active Syncs"
          value={activeSyncs.length}
          description="Currently running"
          icon="🔄"
        />
        <LastSyncCard 
          lastSync={syncHistory[0]}
        />
        <NextSyncCard />
        <ErrorRateCard 
          failureSummary={failureSummary}
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Sync</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="errors">Error Log</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <ActiveSyncMonitor activeSyncs={activeSyncs} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <SyncHistoryTable syncHistory={syncHistory} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorLogViewer failureSummary={failureSummary} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <SyncScheduleManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Status Card Components
function SyncStatusCard({ title, value, description, icon }: {
  title: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function LastSyncCard({ lastSync }: { lastSync?: SyncJobHistory }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
        <span className="text-2xl">⏰</span>
      </CardHeader>
      <CardContent>
        {lastSync ? (
          <>
            <div className="text-2xl font-bold">
              {formatDistanceToNow(new Date(lastSync.started_at), { addSuffix: true })}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSync.sync_type} • {lastSync.status}
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">Never</div>
            <p className="text-xs text-muted-foreground">No syncs recorded</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NextSyncCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next Scheduled</CardTitle>
        <span className="text-2xl">📅</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">11:00 AM</div>
        <p className="text-xs text-muted-foreground">Daily sync</p>
      </CardContent>
    </Card>
  );
}

function ErrorRateCard({ failureSummary }: { failureSummary: SyncFailureSummary[] }) {
  const totalFailures = failureSummary.reduce((sum, item) => sum + item.failure_count, 0);
  const unresolvedFailures = failureSummary.reduce((sum, item) => sum + item.unresolved_count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
        <span className="text-2xl">⚠️</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{unresolvedFailures}</div>
        <p className="text-xs text-muted-foreground">
          {totalFailures} total failures
        </p>
      </CardContent>
    </Card>
  );
}

// Main Content Components
function ActiveSyncMonitor({ activeSyncs }: { activeSyncs: ActiveSyncJob[] }) {
  if (activeSyncs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No active syncs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeSyncs.map((sync) => (
        <Card key={sync.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>{getSyncTypeIcon(sync.sync_type)}</span>
                <CardTitle className="text-lg">
                  {sync.sync_type.charAt(0).toUpperCase() + sync.sync_type.slice(1)} Sync
                </CardTitle>
              </div>
              <Badge className={getStatusColor(sync.status)}>
                {sync.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <SyncProgressDisplay syncId={sync.id} />
            <div className="mt-4 text-sm text-muted-foreground">
              Started: {format(new Date(sync.started_at), 'MMM d, yyyy HH:mm')}
              {sync.duration_seconds && (
                <span className="ml-4">
                  Duration: {formatDuration(sync.duration_seconds)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SyncHistoryTable({ syncHistory }: { syncHistory: SyncJobHistory[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sync History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {syncHistory.map((sync) => (
            <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span>{getSyncTypeIcon(sync.sync_type)}</span>
                <div>
                  <p className="font-medium">{sync.sync_type} Sync</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(sync.started_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(sync.status)}>
                  {sync.status}
                </Badge>
                {sync.duration_seconds && (
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(sync.duration_seconds)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorLogViewer({ failureSummary }: { failureSummary: SyncFailureSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {failureSummary.map((item) => (
            <div key={item.item_type} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium capitalize">{item.item_type}</p>
                <p className="text-sm text-muted-foreground">
                  {item.failure_count} total failures
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-red-600">{item.unresolved_count} unresolved</p>
                <p className="text-sm text-muted-foreground">
                  Avg retries: {item.avg_retry_count.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SyncScheduleManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Daily Sync (Morning)</p>
              <p className="text-sm text-muted-foreground">11:00 AM daily</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Daily Sync (Evening)</p>
              <p className="text-sm text-muted-foreground">7:00 PM daily</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Monthly Archive</p>
              <p className="text-sm text-muted-foreground">1st of month at 2:00 AM</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
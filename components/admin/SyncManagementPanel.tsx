'use client';

import { useState, useEffect } from 'react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { adminService } from '@/lib/auth/admin-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Clock, 
  Calendar, 
  Database, 
  Activity, 
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatus {
  lastSyncTime: string;
  status: 'success' | 'failed' | 'running' | 'unknown';
  totalRecords: number;
  errors: string[];
  duration: number;
}

export function SyncManagementPanel() {
  const { adminData } = useAdminCheck();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchSyncStatus();
    fetchSyncHistory();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/sync/status');
      if (response.ok) {
        const data = await response.json();
        setLastSync(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const response = await fetch('/api/admin/sync/history');
      if (response.ok) {
        const data = await response.json();
        setSyncHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync history:', error);
    }
  };

  const handleManualSync = async () => {
    if (!adminData) return;

    setSyncing(true);
    
    try {
      // Log admin action
      await adminService.logAdminAction(
        adminData.user_id,
        'sync.manual.trigger',
        'sync',
        undefined,
        { triggered_at: new Date().toISOString() }
      );

      // Trigger sync
      const response = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      toast.success('Sync triggered successfully');
      
      // Refresh sync status
      await fetchSyncStatus();
    } catch (error) {
      toast.error('Failed to trigger sync');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getNextSyncTime = () => {
    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setHours(11, 0, 0, 0); // 11 AM
    
    if (now.getHours() >= 11) {
      nextSync.setDate(nextSync.getDate() + 1);
    }
    
    return nextSync.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ireland Pay CRM Sync</CardTitle>
              <CardDescription>
                Manage data synchronization with Ireland Pay CRM
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin Only
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sync Status */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Sync</p>
                <p className="text-xs text-muted-foreground">
                  {lastSync?.lastSyncTime || 'Never'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Next Scheduled</p>
                <p className="text-xs text-muted-foreground">
                  {getNextSyncTime()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Records</p>
                <p className="text-xs text-muted-foreground">
                  {lastSync?.totalRecords || '0'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sync Status</p>
                <div className="flex items-center gap-1">
                  {getStatusIcon(lastSync?.status || 'unknown')}
                  <span className="text-xs capitalize">
                    {lastSync?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Manual Sync Controls */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Manual Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Trigger an immediate sync with Ireland Pay CRM
                </p>
              </div>
              <Button
                onClick={handleManualSync}
                disabled={syncing}
                size="lg"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {syncing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Sync in Progress</AlertTitle>
                <AlertDescription>
                  Data synchronization is currently running. This may take several minutes to complete.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Sync History */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recent Sync History</h3>
            <div className="space-y-2">
              {syncHistory.slice(0, 5).map((sync, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sync.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(sync.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sync.merchants_count} merchants processed
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(sync.status) as any}>
                    {sync.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
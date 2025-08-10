'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseBrowserClient } from '@lib/supabase/client';
import { SyncProgressUpdate, SyncProgressDetails } from '@/types/sync';
import { formatDistanceToNow } from 'date-fns';

interface SyncProgressDisplayProps {
  syncId: string;
  className?: string;
}

export function SyncProgressDisplay({ syncId, className }: SyncProgressDisplayProps) {
  const [progress, setProgress] = useState<SyncProgressUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!syncId) return;

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`sync-progress-${syncId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_progress',
        filter: `sync_id=eq.${syncId}`
      }, (payload) => {
        if (payload.new) {
          const newProgress: SyncProgressUpdate = {
            phase: payload.new.phase,
            progress: payload.new.progress,
            message: payload.new.message,
            details: payload.new.details
          };
          setProgress(newProgress);
          setLoading(false);
        }
      })
      .subscribe();

    // Also fetch initial progress
    fetchInitialProgress();

    return () => {
      subscription.unsubscribe();
    };
  }, [syncId]);

  const fetchInitialProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*')
        .eq('sync_id', syncId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const initialProgress: SyncProgressUpdate = {
          phase: data.phase,
          progress: data.progress,
          message: data.message,
          details: data.details
        };
        setProgress(initialProgress);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch progress');
      setLoading(false);
    }
  };

  const getPhaseDisplayName = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      'initializing': 'Initializing',
      'merchants': 'Syncing Merchants',
      'merchants_incremental': 'Syncing New Merchants',
      'transactions': 'Syncing Transactions',
      'transactions_daily': 'Syncing Daily Transactions',
      'residuals': 'Syncing Residuals',
      'residuals_check': 'Checking Residuals',
      'residuals_skip': 'Skipping Residuals',
      'refreshing_views': 'Refreshing Views',
      'metrics_update': 'Updating Metrics',
      'historical_sync': 'Historical Sync',
      'merchants_complete': 'Merchants Complete',
      'transactions_complete': 'Transactions Complete',
      'residuals_complete': 'Residuals Complete',
      'refreshing_views_complete': 'Views Refreshed',
      'metrics_update_complete': 'Metrics Updated'
    };

    return phaseMap[phase] || phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getPhaseColor = (phase: string): string => {
    if (phase.includes('complete')) return 'bg-green-500';
    if (phase.includes('error') || phase.includes('failed')) return 'bg-red-500';
    if (phase.includes('skip')) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sync Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-2 w-full mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sync Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Sync Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No progress data available</div>
        </CardContent>
      </Card>
    );
  }

  const details = progress.details as SyncProgressDetails;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sync Progress</CardTitle>
          <Badge 
            variant={progress.progress >= 100 ? 'default' : 'secondary'}
            className={getPhaseColor(progress.phase)}
          >
            {progress.progress >= 100 ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                {getPhaseDisplayName(progress.phase)}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress.progress)}%
              </span>
            </div>
            <Progress 
              value={progress.progress} 
              className="h-2"
            />
          </div>

          {/* Message */}
          {progress.message && (
            <p className="text-sm text-muted-foreground">
              {progress.message}
            </p>
          )}

          {/* Details Grid */}
          {details && Object.keys(details).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {details.merchants !== undefined && (
                <div>
                  <p className="font-medium text-muted-foreground">Merchants</p>
                  <p className="text-lg font-semibold">{details.merchants}</p>
                </div>
              )}
              
              {details.transactions !== undefined && (
                <div>
                  <p className="font-medium text-muted-foreground">Transactions</p>
                  <p className="text-lg font-semibold">{details.transactions}</p>
                </div>
              )}
              
              {details.residuals !== undefined && (
                <div>
                  <p className="font-medium text-muted-foreground">Residuals</p>
                  <p className="text-lg font-semibold">{details.residuals}</p>
                </div>
              )}
              
              {details.volumes !== undefined && (
                <div>
                  <p className="font-medium text-muted-foreground">Volumes</p>
                  <p className="text-lg font-semibold">{details.volumes}</p>
                </div>
              )}
              
              {details.errors !== undefined && details.errors > 0 && (
                <div>
                  <p className="font-medium text-red-600">Errors</p>
                  <p className="text-lg font-semibold text-red-600">{details.errors}</p>
                </div>
              )}
              
              {details.processed_items !== undefined && details.total_items !== undefined && (
                <div>
                  <p className="font-medium text-muted-foreground">Progress</p>
                  <p className="text-lg font-semibold">
                    {details.processed_items}/{details.total_items}
                  </p>
                </div>
              )}
              
              {details.current_item && (
                <div className="col-span-2 md:col-span-4">
                  <p className="font-medium text-muted-foreground">Current Item</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {details.current_item}
                  </p>
                </div>
              )}
              
              {details.month_name && (
                <div className="col-span-2 md:col-span-4">
                  <p className="font-medium text-muted-foreground">Processing</p>
                  <p className="text-lg font-semibold">{details.month_name}</p>
                </div>
              )}
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
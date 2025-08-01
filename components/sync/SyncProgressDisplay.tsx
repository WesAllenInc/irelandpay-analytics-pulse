"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClientComponentClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SyncProgress } from '@/lib/sync/ireland-pay-sync-manager';

interface SyncProgressDisplayProps {
  syncId: string;
  onComplete?: () => void;
}

export function SyncProgressDisplay({ syncId, onComplete }: SyncProgressDisplayProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    let subscription: RealtimeChannel;

    const setupSubscription = async () => {
      // Get initial progress
      try {
        const { data, error } = await supabase
          .from('sync_progress')
          .select('*')
          .eq('sync_id', syncId)
          .single();

        if (data) {
          setProgress({
            syncId: data.sync_id,
            phase: data.phase,
            progress: data.progress,
            message: data.message,
            details: data.details,
            lastUpdate: new Date(data.last_update)
          });
        }
      } catch (error) {
        console.error('Failed to get initial progress:', error);
      } finally {
        setLoading(false);
      }

      // Subscribe to real-time updates
      subscription = supabase
        .channel(`sync-progress-${syncId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sync_progress',
          filter: `sync_id=eq.${syncId}`
        }, (payload) => {
          if (payload.new) {
            const newProgress: SyncProgress = {
              syncId: payload.new.sync_id,
              phase: payload.new.phase,
              progress: payload.new.progress,
              message: payload.new.message,
              details: payload.new.details,
              lastUpdate: new Date(payload.new.last_update)
            };
            
            setProgress(newProgress);
            
            // Call onComplete if sync is finished
            if (newProgress.phase === 'completed' || newProgress.phase === 'failed') {
              onComplete?.();
            }
          }
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [syncId, supabase, onComplete]);

  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sync Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No progress information available.</p>
        </CardContent>
      </Card>
    );
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'merchants':
        return 'bg-blue-500';
      case 'transactions':
        return 'bg-green-500';
      case 'residuals':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'merchants':
        return '🏪';
      case 'transactions':
        return '💳';
      case 'residuals':
        return '💰';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '🔄';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{getPhaseIcon(progress.phase)}</span>
            Sync Progress
          </CardTitle>
          <Badge className={getPhaseColor(progress.phase)}>
            {progress.phase.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress.progress)}%
              </span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
          
          {progress.message && (
            <div>
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </div>
          )}
          
          {progress.details && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {progress.details.merchants !== undefined && (
                <div className="text-center">
                  <p className="font-medium text-blue-600">Merchants</p>
                  <p className="text-2xl font-bold">{progress.details.merchants}</p>
                </div>
              )}
              {progress.details.transactions !== undefined && (
                <div className="text-center">
                  <p className="font-medium text-green-600">Transactions</p>
                  <p className="text-2xl font-bold">{progress.details.transactions}</p>
                </div>
              )}
              {progress.details.residuals !== undefined && (
                <div className="text-center">
                  <p className="font-medium text-purple-600">Residuals</p>
                  <p className="text-2xl font-bold">{progress.details.residuals}</p>
                </div>
              )}
              {progress.details.errors !== undefined && progress.details.errors > 0 && (
                <div className="text-center">
                  <p className="font-medium text-red-600">Errors</p>
                  <p className="text-2xl font-bold">{progress.details.errors}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Last updated: {progress.lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
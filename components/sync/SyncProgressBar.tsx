'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Database,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';

interface SyncProgress {
  status: 'idle' | 'connecting' | 'syncing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  details: {
    merchants?: { total: number; processed: number; failed: number };
    residuals?: { total: number; processed: number; failed: number };
    transactions?: { total: number; processed: number; failed: number };
  };
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface SyncProgressBarProps {
  onSyncComplete?: (result: any) => void;
  onSyncError?: (error: string) => void;
}

export function SyncProgressBar({ onSyncComplete, onSyncError }: SyncProgressBarProps) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    progress: 0,
    currentStep: 'Ready to sync',
    details: {}
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Simulate connection test
  const testConnection = async () => {
    setSyncProgress(prev => ({ ...prev, status: 'connecting', currentStep: 'Testing connection...' }));
    
    try {
      // Simulate API connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful connection
      setIsConnected(true);
      setConnectionError(null);
      setSyncProgress(prev => ({ 
        ...prev, 
        status: 'idle', 
        currentStep: 'Connection successful - Ready to sync',
        progress: 0 
      }));
    } catch (error) {
      setIsConnected(false);
      setConnectionError('Failed to connect to Ireland Pay CRM API');
      setSyncProgress(prev => ({ 
        ...prev, 
        status: 'error', 
        currentStep: 'Connection failed',
        error: 'Failed to connect to Ireland Pay CRM API'
      }));
    }
  };

  // Simulate sync process
  const startSync = async () => {
    if (!isConnected) {
      setConnectionError('Please test connection first');
      return;
    }

    setSyncProgress({
      status: 'syncing',
      progress: 0,
      currentStep: 'Initializing sync...',
      details: {},
      startTime: new Date()
    });

    try {
      // Step 1: Initialize (10%)
      await simulateStep('Initializing sync...', 10, 1000);
      
      // Step 2: Fetch merchants (30%)
      await simulateStep('Fetching merchants...', 30, 2000);
      setSyncProgress(prev => ({
        ...prev,
        details: { ...prev.details, merchants: { total: 150, processed: 0, failed: 0 } }
      }));
      
      // Step 3: Process merchants (60%)
      await simulateStep('Processing merchants...', 60, 3000);
      setSyncProgress(prev => ({
        ...prev,
        details: { 
          ...prev.details, 
          merchants: { total: 150, processed: 150, failed: 2 } 
        }
      }));
      
      // Step 4: Fetch residuals (80%)
      await simulateStep('Fetching residuals...', 80, 2000);
      setSyncProgress(prev => ({
        ...prev,
        details: { 
          ...prev.details, 
          residuals: { total: 500, processed: 0, failed: 0 } 
        }
      }));
      
      // Step 5: Process residuals (95%)
      await simulateStep('Processing residuals...', 95, 3000);
      setSyncProgress(prev => ({
        ...prev,
        details: { 
          ...prev.details, 
          residuals: { total: 500, processed: 500, failed: 5 } 
        }
      }));
      
      // Step 6: Complete (100%)
      await simulateStep('Finalizing sync...', 100, 1000);
      
      setSyncProgress(prev => ({
        ...prev,
        status: 'completed',
        currentStep: 'Sync completed successfully!',
        endTime: new Date()
      }));

      onSyncComplete?.(syncProgress.details);
      
    } catch (error) {
      setSyncProgress(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
      onSyncError?.(syncProgress.error || 'Sync failed');
    }
  };

  const simulateStep = async (step: string, progress: number, duration: number) => {
    setSyncProgress(prev => ({ ...prev, currentStep: step, progress }));
    await new Promise(resolve => setTimeout(resolve, duration));
  };

  const resetSync = () => {
    setSyncProgress({
      status: 'idle',
      progress: 0,
      currentStep: 'Ready to sync',
      details: {}
    });
  };

  const getStatusIcon = () => {
    switch (syncProgress.status) {
      case 'connecting':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (syncProgress.status) {
      case 'connecting':
      case 'syncing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return '';
    const end = endTime || new Date();
    const duration = Math.round((end.getTime() - startTime.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Ireland Pay CRM Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {connectionError && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}
            </div>
            <Button 
              onClick={testConnection}
              disabled={syncProgress.status === 'syncing'}
              variant="outline"
            >
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Sync Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{syncProgress.currentStep}</span>
              <span>{syncProgress.progress}%</span>
            </div>
            <Progress value={syncProgress.progress} className="h-2" />
          </div>

          {/* Sync Details */}
          {syncProgress.details.merchants && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Merchants</p>
                  <p className="text-xs text-muted-foreground">
                    {syncProgress.details.merchants.processed}/{syncProgress.details.merchants.total}
                    {syncProgress.details.merchants.failed > 0 && (
                      <span className="text-red-500 ml-1">({syncProgress.details.merchants.failed} failed)</span>
                    )}
                  </p>
                </div>
              </div>
              
              {syncProgress.details.residuals && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <FileText className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Residuals</p>
                    <p className="text-xs text-muted-foreground">
                      {syncProgress.details.residuals.processed}/{syncProgress.details.residuals.total}
                      {syncProgress.details.residuals.failed > 0 && (
                        <span className="text-red-500 ml-1">({syncProgress.details.residuals.failed} failed)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {syncProgress.startTime && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(syncProgress.startTime, syncProgress.endTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {syncProgress.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{syncProgress.error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={startSync}
              disabled={!isConnected || syncProgress.status === 'syncing'}
              className="flex-1"
            >
              {syncProgress.status === 'syncing' ? 'Syncing...' : 'Start Sync'}
            </Button>
            
            {syncProgress.status === 'completed' && (
              <Button 
                onClick={resetSync}
                variant="outline"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Network, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Loader2,
  Play,
  Pause
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface SyncProgress {
  status: 'idle' | 'connecting' | 'syncing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  details: Record<string, any>;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

interface SyncProgressBarProps {
  onSyncComplete?: (details: Record<string, any>) => void;
  onSyncError?: (error: string) => void;
  onSyncIdChange?: (syncId: string | null) => void;
}

export function SyncProgressBar({ onSyncComplete, onSyncError, onSyncIdChange }: SyncProgressBarProps) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    progress: 0,
    currentStep: 'Ready to sync',
    details: {}
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Test connection to Ireland Pay CRM API
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionError(null);
    
    try {
      setSyncProgress(prev => ({ ...prev, status: 'connecting', currentStep: 'Testing connection...' }));
      
      // Test the API connection using server-held credentials (no key in browser)
      const response = await fetch('/api/setup/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // no body required; server uses IRELANDPAY_CRM_BASE_URL
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsConnected(true);
        setConnectionError(null);
        setSyncProgress(prev => ({ 
          ...prev, 
          status: 'idle', 
          currentStep: 'Connection successful - Ready to sync',
          progress: 0 
        }));
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (error) {
      setIsConnected(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Ireland Pay CRM API';
      setConnectionError(errorMessage);
      setSyncProgress(prev => ({ 
        ...prev, 
        status: 'error', 
        currentStep: 'Connection failed',
        error: errorMessage
      }));
    } finally {
      setTestingConnection(false);
    }
  };

  // Start a real sync operation
  const startSync = async () => {
    // Auto-connect if not already connected
    if (!isConnected) {
      await testConnection();
      if (!isConnected) {
        return;
      }
    }

    setSyncing(true);
    setSyncProgress({
      status: 'syncing',
      progress: 0,
      currentStep: 'Initializing sync...',
      details: {},
      startTime: new Date()
    });

    try {
      // Start the sync via enhanced API (server reads API key)
      const response = await fetch('/api/sync-irelandpay-crm/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncType: 'initial' })
      });

      const result = await response.json();

      if (result.success) {
        const syncId = result.data?.syncId || result.job_id;
        setCurrentSyncId(syncId);
        onSyncIdChange?.(syncId);
        
        setSyncProgress(prev => ({
          ...prev,
          status: 'syncing',
          currentStep: 'Sync started successfully',
          progress: 10
        }));

        // Monitor the sync progress
        await monitorSyncProgress(syncId);
      } else {
        throw new Error(result.error || 'Failed to start sync');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start sync';
      setSyncProgress(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Sync failed',
        error: errorMessage,
        endTime: new Date()
      }));
      onSyncError?.(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Monitor sync progress using our new progress API
  const monitorSyncProgress = async (syncId: string) => {
    if (!syncId) return;

    const checkProgress = async () => {
      try {
        // Poll enhanced status API (returns sync_jobs and sync_progress)
        const response = await fetch(`/api/sync-irelandpay-crm/enhanced?syncId=${syncId}`);
        const result = await response.json();

        if (result.success && result.data) {
          const progressData = result.data;
          
          setSyncProgress(prev => ({
            ...prev,
            progress: progressData.overallProgress || 0,
            currentStep: progressData.currentActivity || 'Syncing...',
            details: {
              merchants: progressData.phases?.find(p => p.name === 'merchants')?.details || {},
              residuals: progressData.phases?.find(p => p.name === 'residuals')?.details || {},
              volumes: progressData.phases?.find(p => p.name === 'volumes')?.details || {},
              currentPhase: progressData.currentPhase,
              totalPhases: progressData.totalPhases,
              currentPhaseIndex: progressData.currentPhaseIndex
            }
          }));

          if (progressData.status === 'completed') {
            setSyncProgress(prev => ({
              ...prev,
              status: 'completed',
              progress: 100,
              currentStep: 'Sync completed successfully!',
              endTime: new Date()
            }));
            onSyncComplete?.(progressData);
            return;
          } else if (progressData.status === 'failed') {
            throw new Error('Sync failed');
          }

          // Continue monitoring
          setTimeout(checkProgress, 2000);
        } else {
          throw new Error(result.error || 'Failed to fetch progress');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync monitoring failed';
        setSyncProgress(prev => ({
          ...prev,
          status: 'error',
          currentStep: 'Sync failed',
          error: errorMessage,
          endTime: new Date()
        }));
        onSyncError?.(errorMessage);
      }
    };

    await checkProgress();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Connection Status */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Ireland Pay CRM Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={isConnected ? "default" : "secondary"} className="text-sm">
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
                {connectionError && (
                  <Alert className="mt-2 border-red-500/20 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700 dark:text-red-300">{connectionError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button 
                onClick={testConnection}
                disabled={testingConnection || syncing}
                variant="outline"
                className="bg-card/50 border-border/50 hover:bg-card/70"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Network className="h-4 w-4 mr-2" />
                )}
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sync Progress */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className={`h-5 w-5 ${syncProgress.status === 'syncing' ? 'animate-spin text-blue-500' : 'text-green-500'}`} />
              Sync Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{syncProgress.currentStep}</span>
                <span className="text-muted-foreground">{Math.round(syncProgress.progress)}%</span>
              </div>
              <Progress 
                value={syncProgress.progress} 
                className="h-2"
              />
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  syncProgress.status === 'completed' ? 'default' :
                  syncProgress.status === 'error' ? 'destructive' :
                  syncProgress.status === 'syncing' ? 'secondary' : 'outline'
                }
                className={
                  syncProgress.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20' :
                  syncProgress.status === 'error' ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' :
                  syncProgress.status === 'syncing' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' : ''
                }
              >
                {syncProgress.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                {syncProgress.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {syncProgress.status === 'syncing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {syncProgress.status.charAt(0).toUpperCase() + syncProgress.status.slice(1)}
              </Badge>
            </div>

            {/* Error Message */}
            {syncProgress.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{syncProgress.error}</AlertDescription>
              </Alert>
            )}

            {/* Sync Details */}
            {Object.keys(syncProgress.details).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {syncProgress.details.merchants && (
                  <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="font-medium text-blue-700 dark:text-blue-300">Merchants</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {syncProgress.details.merchants.total || 0}
                    </p>
                  </div>
                )}
                
                {syncProgress.details.residuals && (
                  <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-medium text-green-700 dark:text-green-300">Residuals</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {syncProgress.details.residuals.total || 0}
                    </p>
                  </div>
                )}
                
                {syncProgress.details.errors && syncProgress.details.errors > 0 && (
                  <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="font-medium text-red-700 dark:text-red-300">Errors</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {syncProgress.details.errors}
                    </p>
                  </div>
                )}
                
                {syncProgress.details.processed_items && syncProgress.details.total_items && (
                  <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="font-medium text-purple-700 dark:text-purple-300">Progress</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {syncProgress.details.processed_items}/{syncProgress.details.total_items}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={startSync}
                disabled={!isConnected || syncing || syncProgress.status === 'syncing'}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Sync
                  </>
                )}
              </Button>
              
              {syncProgress.status === 'completed' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSyncProgress({
                      status: 'idle',
                      progress: 0,
                      currentStep: 'Ready to sync',
                      details: {}
                    });
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Network
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
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
                disabled={syncProgress.status === 'syncing'}
                variant="outline"
                className="bg-card/50 border-border/50 hover:bg-card/70"
              >
                <Network className="h-4 w-4 mr-2" />
                Test Connection
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
              {getStatusIcon()}
              Sync Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{syncProgress.currentStep}</span>
                <span className="text-muted-foreground">{syncProgress.progress}%</span>
              </div>
              <div className="relative">
                <Progress value={syncProgress.progress} className="h-3 bg-muted/50" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${syncProgress.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Sync Details */}
            <AnimatePresence>
              {syncProgress.details.merchants && (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Merchants</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {syncProgress.details.merchants.processed}/{syncProgress.details.merchants.total}
                        {syncProgress.details.merchants.failed > 0 && (
                          <span className="text-red-500 ml-1">({syncProgress.details.merchants.failed} failed)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {syncProgress.details.residuals && (
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <FileText className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Residuals</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {syncProgress.details.residuals.processed}/{syncProgress.details.residuals.total}
                          {syncProgress.details.residuals.failed > 0 && (
                            <span className="text-red-500 ml-1">({syncProgress.details.residuals.failed} failed)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {syncProgress.startTime && (
                    <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Duration</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {formatDuration(syncProgress.startTime, syncProgress.endTime)}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {syncProgress.error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-700 dark:text-red-300">{syncProgress.error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={startSync}
                disabled={!isConnected || syncProgress.status === 'syncing'}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {syncProgress.status === 'syncing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Sync
                  </>
                )}
              </Button>
              
              {syncProgress.status === 'completed' && (
                <Button 
                  onClick={resetSync}
                  variant="outline"
                  className="bg-card/50 border-border/50 hover:bg-card/70"
                  size="lg"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
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
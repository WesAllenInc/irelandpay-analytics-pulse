'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

interface SyncHistoryItem {
  id: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'in_progress';
  duration: number;
  merchantsProcessed: number;
  merchantsFailed: number;
  residualsProcessed: number;
  residualsFailed: number;
  error?: string;
}

interface SyncHistoryProps {
  history?: SyncHistoryItem[];
}

export function SyncHistory({ history = [] }: SyncHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchSyncHistory();
  }, []);

  const fetchSyncHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from sync_status table
      const { data: syncStatusData, error: syncError } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (syncError) {
        console.error('Error fetching sync status:', syncError);
        setError('Failed to fetch sync history');
        return;
      }

      // Transform the data to match our interface
      const transformedHistory: SyncHistoryItem[] = (syncStatusData || []).map((sync: any) => {
        const startTime = new Date(sync.started_at);
        const endTime = sync.completed_at ? new Date(sync.completed_at) : new Date();
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        // Extract results from the JSONB field
        const results = sync.results || {};
        const merchants = results.merchants || {};
        const residuals = results.residuals || {};

        return {
          id: sync.id,
          timestamp: startTime,
          status: sync.status === 'completed' ? 'completed' : 
                 sync.status === 'failed' ? 'failed' : 'in_progress',
          duration,
          merchantsProcessed: merchants.total_merchants || 0,
          merchantsFailed: merchants.merchants_failed || 0,
          residualsProcessed: residuals.total_residuals || 0,
          residualsFailed: residuals.residuals_failed || 0,
          error: sync.error || undefined
        };
      });

      setSyncHistory(transformedHistory);
    } catch (err) {
      console.error('Error fetching sync history:', err);
      setError('Failed to fetch sync history');
    } finally {
      setLoading(false);
    }
  };

  const displayHistory = showAll ? syncHistory : syncHistory.slice(0, 3);

  const getStatusIcon = (status: SyncHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: SyncHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const calculateSuccessRate = (processed: number, failed: number) => {
    const total = processed + failed;
    if (total === 0) return 100;
    return Math.round((processed / total) * 100);
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

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-500" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sync history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-purple-500" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium mb-2 text-red-600">Error Loading History</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchSyncHistory} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-500" />
              Sync History
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchSyncHistory}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayHistory.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No sync history available</p>
              <p className="text-sm">Start your first sync to see history here</p>
            </motion.div>
          ) : (
            <>
              <div className="space-y-4">
                {displayHistory.map((item, index) => (
                  <motion.div 
                    key={item.id} 
                    className="border border-border/50 rounded-xl p-6 space-y-4 bg-card/30 backdrop-blur-sm"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <span className="font-medium text-foreground">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        <span className="text-sm text-muted-foreground font-mono">
                          {formatDuration(item.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Merchants</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {item.merchantsProcessed}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {calculateSuccessRate(item.merchantsProcessed, item.merchantsFailed)}% success
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Residuals</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          {item.residualsProcessed}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {calculateSuccessRate(item.residualsProcessed, item.residualsFailed)}% success
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                          {item.merchantsFailed + item.residualsFailed}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Total failures
                        </p>
                      </div>
                      
                      <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Duration</p>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {formatDuration(item.duration)}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Total time
                        </p>
                      </div>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                      {item.error && (
                        <motion.div 
                          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-red-700 dark:text-red-300">
                            <strong>Error:</strong> {item.error}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {syncHistory.length > 3 && (
                <motion.div 
                  className="text-center pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    variant="outline"
                    onClick={() => setShowAll(!showAll)}
                    className="w-full bg-card/50 border-border/50 hover:bg-card/70"
                    size="lg"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {syncHistory.length - 3} More
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
} 
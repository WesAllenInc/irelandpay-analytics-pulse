import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase-compat';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SyncStatus = {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  type: string;
  started_at: string;
  completed_at?: string;
  error?: string;
  details?: {
    merchants_total?: number;
    merchants_processed?: number;
    merchants_failed?: number;
    residuals_total?: number;
    residuals_processed?: number;
    residuals_failed?: number;
    transaction_id?: string;
    transaction_status?: string;
  };
};

export type SyncTransaction = {
  id: string;
  created_at: string;
  type: string;
  status: 'started' | 'committed' | 'rolled_back';
  metadata?: Record<string, any>;
};

export type SyncLogEntry = {
  id: string;
  sync_date: string;
  year: number;
  month: number;
  merchants_total: number;
  merchants_added: number;
  merchants_updated: number;
  merchants_failed: number;
  residuals_total: number;
  residuals_added: number;
  residuals_updated: number;
  residuals_failed: number;
  error_count: number;
  details?: Record<string, any>;
};

/**
 * Hook for monitoring the real-time status of IRIS CRM sync operations
 * 
 * @param {Object} options - Options for the hook
 * @param {boolean} options.subscribeToLogs - Whether to subscribe to sync logs
 * @param {boolean} options.subscribeToTransactions - Whether to subscribe to sync transactions
 * @returns Object containing current sync status, history, and active transactions
 */
export const useSyncStatus = ({ 
  subscribeToLogs = true,
  subscribeToTransactions = true
} = {}) => {
  const supabase = createClientComponentClient();
  
  const [currentSync, setCurrentSync] = useState<SyncStatus | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<SyncTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load initial data and setup subscriptions
  useEffect(() => {
    let syncStatusChannel: RealtimeChannel | null = null;
    let syncLogsChannel: RealtimeChannel | null = null;
    let syncTransactionsChannel: RealtimeChannel | null = null;
    
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get current/latest sync status
        const { data: latestSync, error: syncError } = await supabase
          .from('sync_status')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (syncError) throw syncError;
        if (latestSync && latestSync.length > 0) {
          setCurrentSync(latestSync[0]);
        }
        
        // Get sync history (logs)
        if (subscribeToLogs) {
          const { data: syncLogs, error: logsError } = await supabase
            .from('sync_logs')
            .select('*')
            .order('sync_date', { ascending: false })
            .limit(10);
            
          if (logsError) throw logsError;
          setSyncHistory(syncLogs || []);
        }
        
        // Get active transactions
        if (subscribeToTransactions) {
          const { data: transactions, error: transError } = await supabase
            .from('sync_transactions')
            .select('*')
            .in('status', ['started'])
            .order('created_at', { ascending: false });
            
          if (transError) throw transError;
          setActiveTransactions(transactions || []);
        }
        
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred loading sync status');
        console.error('Error loading sync status:', e);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Setup realtime subscriptions
    const setupSubscriptions = () => {
      // Subscribe to sync_status table changes
      syncStatusChannel = supabase
        .channel('sync-status-changes')
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'sync_status' },
          (payload: RealtimePostgresChangesPayload<SyncStatus>) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setCurrentSync(payload.new);
            }
          }
        )
        .subscribe();
      
      // Subscribe to sync_logs if requested
      if (subscribeToLogs) {
        syncLogsChannel = supabase
          .channel('sync-logs-changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'sync_logs' },
            (payload: RealtimePostgresChangesPayload<SyncLogEntry>) => {
              setSyncHistory(prev => [payload.new as SyncLogEntry, ...prev.slice(0, 9)]);
            }
          )
          .subscribe();
      }
      
      // Subscribe to sync_transactions if requested
      if (subscribeToTransactions) {
        syncTransactionsChannel = supabase
          .channel('sync-transactions-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sync_transactions' },
            (payload: RealtimePostgresChangesPayload<SyncTransaction>) => {
              if (payload.eventType === 'INSERT') {
                setActiveTransactions(prev => [payload.new, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                // If transaction is no longer active, remove it from active transactions
                if (payload.new.status !== 'started') {
                  setActiveTransactions(prev => 
                    prev.filter(t => t.id !== payload.new.id)
                  );
                } else {
                  // Update the transaction
                  setActiveTransactions(prev => 
                    prev.map(t => t.id === payload.new.id ? payload.new : t)
                  );
                }
              }
            }
          )
          .subscribe();
      }
    };
    
    loadInitialData();
    setupSubscriptions();
    
    // Cleanup subscriptions
    return () => {
      if (syncStatusChannel) supabase.removeChannel(syncStatusChannel);
      if (syncLogsChannel) supabase.removeChannel(syncLogsChannel);
      if (syncTransactionsChannel) supabase.removeChannel(syncTransactionsChannel);
    };
  }, [supabase, subscribeToLogs, subscribeToTransactions]);
  
  /**
   * Start a sync operation with the specified options
   * @param {Object} options - Sync options
   * @returns {Promise<boolean>} Success or failure
   */
  const startSync = async (options?: { year?: number; month?: number }) => {
    try {
      // Call the RPC function to start the sync
      const { data, error } = await supabase
        .rpc('start_sync', options || {});
        
      if (error) throw error;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start sync');
      console.error('Error starting sync:', e);
      return false;
    }
  };
  
  /**
   * Cancel an ongoing sync operation if possible
   * @returns {Promise<boolean>} Success or failure
   */
  const cancelSync = async (syncId?: string) => {
    try {
      // Call the RPC function to cancel the sync
      const { data, error } = await supabase
        .rpc('cancel_sync', { sync_id: syncId || currentSync?.id });
        
      if (error) throw error;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel sync');
      console.error('Error canceling sync:', e);
      return false;
    }
  };
  
  return {
    currentSync,
    syncHistory,
    activeTransactions,
    isLoading,
    error,
    startSync,
    cancelSync,
  };
};

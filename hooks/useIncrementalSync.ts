import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export interface SyncWatermark {
  id: number;
  data_type: string;
  last_sync_timestamp: string;
  sync_scope: string | null;
  record_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeMetrics {
  data_type: string;
  total_changes: number;
  inserts: number;
  updates: number;
  deletes: number;
  last_sync: string | null;
}

export interface IncrementalSyncOptions {
  dataType: string;
  syncScope?: string;
  fullSync?: boolean;
}

export function useIncrementalSync() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  /**
   * Get the watermarks for all data types or a specific type
   */
  const getWatermarks = useCallback(async (dataType?: string): Promise<SyncWatermark[]> => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('sync_watermarks').select('*');
      
      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { data, error } = await query.order('last_sync_timestamp', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching sync watermarks'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Get metrics about changes since last sync
   */
  const getChangeMetrics = useCallback(async (): Promise<ChangeMetrics[]> => {
    try {
      setLoading(true);
      setError(null);

      // Execute a stored procedure or query to get change metrics
      const { data, error } = await supabase.rpc('get_change_metrics');

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching change metrics'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Trigger an incremental sync operation
   */
  const triggerSync = useCallback(async (options: IncrementalSyncOptions): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      setSyncStatus('syncing');

      // Call the Edge Function to trigger the sync
      const { data, error } = await supabase.functions.invoke('trigger-incremental-sync', {
        body: {
          dataType: options.dataType,
          syncScope: options.syncScope,
          fullSync: options.fullSync || false
        }
      });

      if (error) throw error;

      // Check result
      if (data?.success) {
        toast({
          title: 'Sync Initiated',
          description: `${options.dataType} sync has been queued successfully`,
        });
        setSyncStatus('success');
        return true;
      } else {
        throw new Error(data?.message || 'Failed to initiate sync');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(err instanceof Error ? err : new Error('Error triggering sync'));
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: message,
      });
      setSyncStatus('error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Get changes for a specific table since last sync
   */
  const getChangesSince = useCallback(async (
    tableName: string, 
    sinceTimestamp?: string,
    limit = 100,
    offset = 0
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_changes_since', { 
        p_table_name: tableName,
        p_since_timestamp: sinceTimestamp,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching changes'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Get count of changes for a specific table
   */
  const getChangesCount = useCallback(async (
    tableName: string, 
    sinceTimestamp?: string
  ): Promise<number> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_changes_count', { 
        p_table_name: tableName,
        p_since_timestamp: sinceTimestamp
      });

      if (error) throw error;
      
      return data || 0;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching changes count'));
      return 0;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    loading,
    error,
    syncStatus,
    getWatermarks,
    getChangeMetrics,
    triggerSync,
    getChangesSince,
    getChangesCount
  };
}

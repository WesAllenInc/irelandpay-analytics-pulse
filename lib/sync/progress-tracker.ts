import { SyncProgressUpdate, SyncProgressDetails } from '@/types/sync';
import { createSupabaseServerClient } from '@/lib/supabase';

export class SyncProgressTracker {
  private progress = new Map<string, SyncProgressUpdate>();

  /**
   * Update progress for a sync job
   */
  async updateProgress(
    syncId: string,
    update: SyncProgressUpdate
  ): Promise<void> {
    const current = this.progress.get(syncId) || this.createInitialProgress(syncId);
    const updated = { ...current, ...update };

    this.progress.set(syncId, updated);

    // Broadcast to connected clients via Supabase Realtime
    await this.broadcastProgress(syncId, updated);

    // Persist to database
    await this.persistProgress(syncId, updated);
  }

  /**
   * Create initial progress state
   */
  private createInitialProgress(syncId: string): SyncProgressUpdate {
    return {
      phase: 'initializing',
      progress: 0,
      message: 'Starting sync...',
      details: {}
    };
  }

  /**
   * Broadcast progress via Supabase Realtime
   */
  private async broadcastProgress(syncId: string, progress: SyncProgressUpdate): Promise<void> {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase.rpc('update_sync_progress', {
      p_sync_id: syncId,
      p_phase: progress.phase,
      p_progress: progress.progress,
      p_message: progress.message,
      p_details: progress.details || {}
    });

    if (error) {
      console.error('Failed to broadcast progress:', error);
    }
  }

  /**
   * Persist progress to database
   */
  private async persistProgress(syncId: string, progress: SyncProgressUpdate): Promise<void> {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('sync_progress')
      .upsert({
        sync_id: syncId,
        phase: progress.phase,
        progress: progress.progress,
        message: progress.message,
        details: progress.details || {},
        last_update: new Date().toISOString()
      }, {
        onConflict: 'sync_id'
      });

    if (error) {
      console.error('Failed to persist progress:', error);
    }
  }

  /**
   * Get current progress for a sync job
   */
  async getProgress(syncId: string): Promise<SyncProgressUpdate | null> {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('sync_progress')
      .select('*')
      .eq('sync_id', syncId)
      .single();

    if (error) {
      console.error('Failed to get progress:', error);
      return null;
    }

    return data ? {
      phase: data.phase,
      progress: data.progress,
      message: data.message,
      details: data.details
    } : null;
  }

  /**
   * Update progress with detailed information
   */
  async updateProgressWithDetails(
    syncId: string,
    phase: string,
    progress: number,
    message?: string,
    details?: SyncProgressDetails
  ): Promise<void> {
    await this.updateProgress(syncId, {
      phase,
      progress,
      message,
      details
    });
  }

  /**
   * Mark a phase as complete
   */
  async completePhase(syncId: string, phase: string, message?: string): Promise<void> {
    await this.updateProgress(syncId, {
      phase: `${phase}_complete`,
      progress: 100,
      message: message || `${phase} completed successfully`,
      details: { completed_at: new Date().toISOString() }
    });
  }

  /**
   * Update progress for item processing
   */
  async updateItemProgress(
    syncId: string,
    phase: string,
    processedItems: number,
    totalItems: number,
    currentItem?: string
  ): Promise<void> {
    const progress = Math.round((processedItems / totalItems) * 100);
    const message = currentItem 
      ? `Processing ${currentItem} (${processedItems}/${totalItems})`
      : `Processed ${processedItems} of ${totalItems} items`;

    await this.updateProgressWithDetails(syncId, phase, progress, message, {
      processed_items: processedItems,
      total_items: totalItems,
      current_item: currentItem
    });
  }

  /**
   * Update progress for monthly data processing
   */
  async updateMonthlyProgress(
    syncId: string,
    currentMonth: number,
    totalMonths: number,
    year: number,
    month: number
  ): Promise<void> {
    const progress = Math.round((currentMonth / totalMonths) * 100);
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    await this.updateProgressWithDetails(syncId, 'historical_sync', progress, 
      `Processing ${monthName} (${currentMonth}/${totalMonths})`, {
        current_month: currentMonth,
        total_months: totalMonths,
        year,
        month,
        month_name: monthName
      }
    );
  }

  /**
   * Update progress for error handling
   */
  async updateErrorProgress(
    syncId: string,
    phase: string,
    errorCount: number,
    totalItems: number
  ): Promise<void> {
    const progress = Math.round(((totalItems - errorCount) / totalItems) * 100);
    
    await this.updateProgressWithDetails(syncId, phase, progress,
      `Encountered ${errorCount} errors, continuing with remaining items`, {
        errors: errorCount,
        total_items: totalItems,
        successful_items: totalItems - errorCount
      }
    );
  }

  /**
   * Clear progress for a sync job
   */
  async clearProgress(syncId: string): Promise<void> {
    this.progress.delete(syncId);
    
    const supabase = createSupabaseServerClient();
    await supabase
      .from('sync_progress')
      .delete()
      .eq('sync_id', syncId);
  }

  /**
   * Get all active progress updates
   */
  async getActiveProgress(): Promise<Map<string, SyncProgressUpdate>> {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('sync_progress')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) {
      console.error('Failed to get active progress:', error);
      return new Map();
    }

    const progressMap = new Map<string, SyncProgressUpdate>();
    data?.forEach(item => {
      progressMap.set(item.sync_id, {
        phase: item.phase,
        progress: item.progress,
        message: item.message,
        details: item.details
      });
    });

    return progressMap;
  }
}

// Singleton instance
let globalProgressTracker: SyncProgressTracker | null = null;

export function getGlobalProgressTracker(): SyncProgressTracker {
  if (!globalProgressTracker) {
    globalProgressTracker = new SyncProgressTracker();
  }
  return globalProgressTracker;
} 
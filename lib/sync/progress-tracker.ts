import { createClient } from '@/lib/supabase/server';
import { SyncProgress } from './ireland-pay-sync-manager';

export class SyncProgressTracker {
  private progress = new Map<string, SyncProgress>();
  
  async updateProgress(
    syncId: string,
    update: Partial<SyncProgress>
  ): Promise<void> {
    const current = this.progress.get(syncId) || this.createInitialProgress(syncId);
    const updated: SyncProgress = { 
      ...current, 
      ...update, 
      lastUpdate: new Date() 
    };
    
    this.progress.set(syncId, updated);
    
    // Broadcast to connected clients via Supabase Realtime
    await this.broadcastProgress(syncId, updated);
    
    // Persist to database
    await this.persistProgress(syncId, updated);
  }

  async getProgress(syncId: string): Promise<SyncProgress> {
    // First check in-memory cache
    const cached = this.progress.get(syncId);
    if (cached) {
      return cached;
    }

    // Fall back to database
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sync_progress')
      .select('*')
      .eq('sync_id', syncId)
      .single();

    if (error || !data) {
      return this.createInitialProgress(syncId);
    }

    const progress: SyncProgress = {
      syncId: data.sync_id,
      phase: data.phase,
      progress: data.progress,
      message: data.message,
      details: data.details,
      lastUpdate: new Date(data.last_update)
    };

    // Cache the result
    this.progress.set(syncId, progress);
    return progress;
  }

  private createInitialProgress(syncId: string): SyncProgress {
    return {
      syncId,
      phase: 'merchants',
      progress: 0,
      message: 'Initializing sync...',
      lastUpdate: new Date()
    };
  }

  private async broadcastProgress(syncId: string, progress: SyncProgress) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('sync_progress')
      .upsert({
        sync_id: syncId,
        phase: progress.phase,
        progress: progress.progress,
        message: progress.message,
        details: progress.details,
        last_update: progress.lastUpdate.toISOString()
      });
      
    if (error) {
      console.error('Failed to broadcast progress:', error);
    }
  }

  private async persistProgress(syncId: string, progress: SyncProgress) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('sync_progress')
      .upsert({
        sync_id: syncId,
        phase: progress.phase,
        progress: progress.progress,
        message: progress.message,
        details: progress.details,
        last_update: progress.lastUpdate.toISOString()
      });

    if (error) {
      console.error('Failed to persist progress:', error);
    }
  }

  async clearProgress(syncId: string): Promise<void> {
    this.progress.delete(syncId);
    
    const supabase = createClient();
    await supabase
      .from('sync_progress')
      .delete()
      .eq('sync_id', syncId);
  }

  async getAllActiveProgress(): Promise<SyncProgress[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('sync_progress')
      .select('*')
      .not('phase', 'in', ['completed', 'failed'])
      .order('last_update', { ascending: false });

    if (error) {
      console.error('Failed to get active progress:', error);
      return [];
    }

    return data?.map(item => ({
      syncId: item.sync_id,
      phase: item.phase,
      progress: item.progress,
      message: item.message,
      details: item.details,
      lastUpdate: new Date(item.last_update)
    })) || [];
  }
} 
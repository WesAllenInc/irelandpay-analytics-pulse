import { emailService } from '@/lib/email/email-service';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export interface SyncStats {
  merchantsCount: number;
  transactionsCount: number;
  residualsCount: number;
  duration: number;
  errors: string[];
}

export interface SyncResult {
  success: boolean;
  stats: SyncStats;
  error?: string;
  syncId: string;
}

export class EnhancedSyncManager {
  private supabase = createSupabaseServiceClient();

  /**
   * Perform sync with email notifications
   */
  async performSyncWithNotifications(
    syncType: 'daily' | 'manual' | 'initial'
  ): Promise<SyncResult> {
    const syncId = crypto.randomUUID();
    const startTime = new Date();
    let result: SyncResult;

    try {
      // Log sync start
      await this.logSyncStart(syncId, syncType);

      // Perform the actual sync
      if (syncType === 'initial') {
        result = await this.performInitialSync();
      } else {
        result = await this.performDailySync();
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Send success notification
      await emailService.sendSyncSuccess({
        syncId,
        syncType,
        startTime,
        endTime,
        stats: {
          merchantsNew: result.stats.merchantsCount,
          merchantsUpdated: 0, // This would be calculated from actual sync
          transactionsCount: result.stats.transactionsCount,
          residualsCount: result.stats.residualsCount,
          duration
        }
      });

      // Log successful sync
      await this.logSyncComplete(syncId, result);

      return {
        ...result,
        syncId
      };

    } catch (error) {
      // Get last successful sync for context
      const lastSuccess = await this.getLastSuccessfulSync();
      
      // Get recent logs
      const logs = await this.getRecentLogs(50);

      // Send failure notification
      await emailService.sendSyncFailure({
        syncId,
        syncType,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        },
        failedAt: new Date(),
        lastSuccessfulSync: lastSuccess?.completedAt,
        logs
      });

      // Log failed sync
      await this.logSyncFailure(syncId, error);

      throw error;
    }
  }

  /**
   * Perform initial sync (first time setup)
   */
  private async performInitialSync(): Promise<SyncResult> {
    const stats: SyncStats = {
      merchantsCount: 0,
      transactionsCount: 0,
      residualsCount: 0,
      duration: 0,
      errors: []
    };

    try {
      // 1. Sync merchants
      try {
        const merchantResult = await this.syncMerchants();
        stats.merchantsCount = merchantResult.added + merchantResult.updated;
        console.log(`Initial sync - Merchants: ${stats.merchantsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown merchant sync error';
        stats.errors.push(`Merchant sync failed: ${errorMsg}`);
        console.error('Initial sync - Merchant error:', error);
      }

      // 2. Sync transactions/volumes
      try {
        const transactionResult = await this.syncTransactions();
        stats.transactionsCount = transactionResult.count;
        console.log(`Initial sync - Transactions: ${stats.transactionsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown transaction sync error';
        stats.errors.push(`Transaction sync failed: ${errorMsg}`);
        console.error('Initial sync - Transaction error:', error);
      }

      // 3. Sync residuals
      try {
        const residualResult = await this.syncResiduals();
        stats.residualsCount = residualResult.count;
        console.log(`Initial sync - Residuals: ${stats.residualsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown residual sync error';
        stats.errors.push(`Residual sync failed: ${errorMsg}`);
        console.error('Initial sync - Residual error:', error);
      }

      // 4. Calculate residuals if needed
      try {
        await this.calculateResiduals();
        console.log('Initial sync - Residual calculations completed');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown residual calculation error';
        stats.errors.push(`Residual calculation failed: ${errorMsg}`);
        console.error('Initial sync - Residual calculation error:', error);
      }

      // Determine if sync was successful
      const hasErrors = stats.errors.length > 0;
      const hasSuccess = stats.merchantsCount > 0 || stats.transactionsCount > 0 || stats.residualsCount > 0;

      if (hasErrors && !hasSuccess) {
        throw new Error(`Initial sync failed: ${stats.errors.join('; ')}`);
      }

      return {
        success: true,
        stats
      };

    } catch (error) {
      return {
        success: false,
        stats,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform daily sync
   */
  private async performDailySync(): Promise<SyncResult> {
    const stats: SyncStats = {
      merchantsCount: 0,
      transactionsCount: 0,
      residualsCount: 0,
      duration: 0,
      errors: []
    };

    try {
      // 1. Sync merchants
      try {
        const merchantResult = await this.syncMerchants();
        stats.merchantsCount = merchantResult.added + merchantResult.updated;
        console.log(`Daily sync - Merchants: ${stats.merchantsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown merchant sync error';
        stats.errors.push(`Merchant sync failed: ${errorMsg}`);
        console.error('Daily sync - Merchant error:', error);
      }

      // 2. Sync transactions/volumes
      try {
        const transactionResult = await this.syncTransactions();
        stats.transactionsCount = transactionResult.count;
        console.log(`Daily sync - Transactions: ${stats.transactionsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown transaction sync error';
        stats.errors.push(`Transaction sync failed: ${errorMsg}`);
        console.error('Daily sync - Transaction error:', error);
      }

      // 3. Sync residuals
      try {
        const residualResult = await this.syncResiduals();
        stats.residualsCount = residualResult.count;
        console.log(`Daily sync - Residuals: ${stats.residualsCount}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown residual sync error';
        stats.errors.push(`Residual sync failed: ${errorMsg}`);
        console.error('Daily sync - Residual error:', error);
      }

      // 4. Calculate residuals if needed
      try {
        await this.calculateResiduals();
        console.log('Daily sync - Residual calculations completed');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown residual calculation error';
        stats.errors.push(`Residual calculation failed: ${errorMsg}`);
        console.error('Daily sync - Residual calculation error:', error);
      }

      // Determine if sync was successful
      const hasErrors = stats.errors.length > 0;
      const hasSuccess = stats.merchantsCount > 0 || stats.transactionsCount > 0 || stats.residualsCount > 0;

      if (hasErrors && !hasSuccess) {
        throw new Error(`Daily sync failed: ${stats.errors.join('; ')}`);
      }

      return {
        success: true,
        stats
      };

    } catch (error) {
      return {
        success: false,
        stats,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log sync start
   */
  private async logSyncStart(syncId: string, syncType: string): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          sync_id: syncId,
          sync_type: syncType,
          status: 'started',
          started_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log sync start:', error);
    }
  }

  /**
   * Log sync completion
   */
  private async logSyncComplete(syncId: string, result: SyncResult): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          merchants_count: result.stats.merchantsCount,
          transactions_count: result.stats.transactionsCount,
          residuals_count: result.stats.residualsCount,
          duration_ms: result.stats.duration,
          errors: result.stats.errors,
          error_message: result.error
        })
        .eq('sync_id', syncId);
    } catch (error) {
      console.error('Failed to log sync completion:', error);
    }
  }

  /**
   * Log sync failure
   */
  private async logSyncFailure(syncId: string, error: unknown): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('sync_id', syncId);
    } catch (logError) {
      console.error('Failed to log sync failure:', logError);
    }
  }

  /**
   * Get last successful sync
   */
  private async getLastSuccessfulSync(): Promise<{ completedAt: Date } | null> {
    try {
      const { data } = await this.supabase
        .from('sync_logs')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      return data ? { completedAt: new Date(data.completed_at) } : null;
    } catch (error) {
      console.error('Failed to get last successful sync:', error);
      return null;
    }
  }

  /**
   * Get recent logs
   */
  private async getRecentLogs(limit: number): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('sync_logs')
        .select('error_message, created_at')
        .not('error_message', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data?.map(log => 
        `${format(new Date(log.created_at), 'MMM d, h:mm a')}: ${log.error_message}`
      ) || [];
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  // Mock sync methods - these would be replaced with actual sync logic
  private async syncMerchants(): Promise<{ added: number; updated: number }> {
    // This would call your existing Ireland Pay CRM sync logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    return { added: 5, updated: 12 };
  }

  private async syncTransactions(): Promise<{ count: number }> {
    // This would call your existing transaction sync logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    return { count: 150 };
  }

  private async syncResiduals(): Promise<{ count: number }> {
    // This would call your existing residual sync logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    return { count: 25 };
  }

  private async calculateResiduals(): Promise<void> {
    // This would call your existing residual calculation logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
  }
}

// Create singleton instance
export const enhancedSyncManager = new EnhancedSyncManager(); 
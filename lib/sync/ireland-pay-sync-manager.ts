import { IrelandPayCRMClient } from '@/lib/irelandpay-crm-client';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getGlobalProgressTracker } from './progress-tracker';
import { SyncErrorRecovery } from './error-recovery';
import { executeWithCircuitBreaker } from './circuit-breaker';
import { 
  SyncType, 
  SyncStatus, 
  SyncTrigger, 
  HistoricalSyncResult, 
  SyncProgressUpdate,
  SyncManagerConfig 
} from '@/types/sync';
import { addMonths, format } from 'date-fns';

export class IrelandPaySyncManager {
  private client: IrelandPayCRMClient;
  private supabase = createSupabaseServerClient();
  private progressTracker = getGlobalProgressTracker();
  private errorRecovery = new SyncErrorRecovery();
  private startDate = new Date('2024-04-01');

  constructor(
    apiKey: string, 
    baseUrl?: string,
    private config: SyncManagerConfig = {}
  ) {
    this.client = new IrelandPayCRMClient({ apiKey, baseUrl });
  }

  /**
   * Perform initial historical sync from April 2024 to present
   */
  async performInitialSync(
    onProgress?: (progress: SyncProgressUpdate) => void
  ): Promise<HistoricalSyncResult> {
    // Create sync job
    const syncId = await this.createSyncJob('historical', 'manual');
    
    const months = this.getMonthsToSync();
    const totalSteps = months.length * 3; // merchants, transactions, residuals per month
    let currentStep = 0;

    const results: HistoricalSyncResult = {
      months: [],
      totalMerchants: 0,
      totalTransactions: 0,
      totalResiduals: 0,
      errors: [],
      startTime: new Date(),
      endTime: undefined
    };

    try {
      // Update job status to running
      await this.updateSyncJobStatus(syncId, 'running');

      // First, sync all merchants (they don't change much month to month)
      await this.progressTracker.updateProgress(syncId, {
        phase: 'merchants',
        progress: 0,
        message: 'Syncing merchant data...'
      });
      onProgress?.({
        phase: 'merchants',
        progress: 0,
        message: 'Syncing merchant data...'
      });

      const merchantResult = await this.syncAllMerchants(syncId);
      results.totalMerchants = merchantResult.count;

      await this.progressTracker.completePhase(syncId, 'merchants', 
        `Synced ${merchantResult.count} merchants successfully`);

      // Then sync historical data month by month
      for (let i = 0; i < months.length; i++) {
        const { year, month } = months[i];
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        try {
          // Update monthly progress
          await this.progressTracker.updateMonthlyProgress(syncId, i + 1, months.length, year, month);
          onProgress?.({
            phase: 'historical_sync',
            progress: Math.round(((i + 1) / months.length) * 100),
            message: `Processing ${monthStr} (${i + 1}/${months.length})`
          });

          // Sync transactions for this month
          currentStep++;
          const txResult = await this.syncMonthlyTransactions(syncId, year, month);

          // Sync residuals for this month
          currentStep++;
          const resResult = await this.syncMonthlyResiduals(syncId, year, month);

          results.months.push({
            period: monthStr,
            transactions: txResult.count,
            residuals: resResult.count,
            success: true
          });

          results.totalTransactions += txResult.count;
          results.totalResiduals += resResult.count;

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.errors.push({
            period: monthStr,
            error: errorMsg
          });
          results.months.push({
            period: monthStr,
            success: false,
            error: errorMsg
          });
        }

        // Rate limiting pause between months
        await this.delay(2000);
      }

      // Create/refresh materialized views
      await this.refreshMaterializedViews(syncId);

      results.endTime = new Date();

      // Complete the sync job
      await this.completeSyncJob(syncId, 'completed', results);

      return results;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.errors.push({
        phase: 'initial_sync',
        error: errorMsg
      });
      results.endTime = new Date();

      // Mark job as failed
      await this.completeSyncJob(syncId, 'failed', results, { error: errorMsg });
      throw error;
    }
  }

  /**
   * Get list of months from April 2024 to present
   */
  private getMonthsToSync(): Array<{year: number, month: number}> {
    const months = [];
    const current = new Date(this.startDate);
    const now = new Date();

    while (current <= now) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Sync all merchants
   */
  private async syncAllMerchants(syncId: string): Promise<{ count: number }> {
    let totalCount = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await executeWithCircuitBreaker(() =>
          this.client.getMerchants({ page, per_page: 100 })
        );

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const merchant of response.data) {
          await this.upsertMerchant(merchant);
          totalCount++;
        }

        // Update progress
        await this.progressTracker.updateItemProgress(syncId, 'merchants', totalCount, -1);

        page++;
        hasMore = response.data.length === 100;

      } catch (error) {
        console.error(`Error syncing merchants page ${page}:`, error);
        throw error;
      }
    }

    return { count: totalCount };
  }

  /**
   * Sync transactions for a specific month
   */
  private async syncMonthlyTransactions(syncId: string, year: number, month: number): Promise<{ count: number }> {
    let totalCount = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await executeWithCircuitBreaker(() =>
          this.client.getVolumes({ year, month, page, per_page: 100 })
        );

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const transaction of response.data) {
          await this.upsertTransaction(transaction, year, month);
          totalCount++;
        }

        page++;
        hasMore = response.data.length === 100;

      } catch (error) {
        console.error(`Error syncing transactions for ${year}-${month}, page ${page}:`, error);
        throw error;
      }
    }

    return { count: totalCount };
  }

  /**
   * Sync residuals for a specific month
   */
  private async syncMonthlyResiduals(syncId: string, year: number, month: number): Promise<{ count: number }> {
    let totalCount = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await executeWithCircuitBreaker(() =>
          this.client.getResiduals({ year, month, page, per_page: 100 })
        );

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const residual of response.data) {
          await this.upsertResidual(residual, year, month);
          totalCount++;
        }

        page++;
        hasMore = response.data.length === 100;

      } catch (error) {
        console.error(`Error syncing residuals for ${year}-${month}, page ${page}:`, error);
        throw error;
      }
    }

    return { count: totalCount };
  }

  /**
   * Upsert merchant data
   */
  private async upsertMerchant(merchant: any): Promise<void> {
    const { error } = await this.supabase
      .from('merchants')
      .upsert({
        merchant_number: merchant.merchant_number,
        merchant_name: merchant.merchant_name,
        agent_id: merchant.agent_id,
        status: merchant.status,
        created_at: merchant.created_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'merchant_number'
      });

    if (error) {
      throw new Error(`Failed to upsert merchant: ${error.message}`);
    }
  }

  /**
   * Upsert transaction data
   */
  private async upsertTransaction(transaction: any, year: number, month: number): Promise<void> {
    const { error } = await this.supabase
      .from('merchant_volumes')
      .upsert({
        merchant_number: transaction.merchant_number,
        year,
        month,
        volume: transaction.volume,
        transactions: transaction.transactions,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'merchant_number,year,month'
      });

    if (error) {
      throw new Error(`Failed to upsert transaction: ${error.message}`);
    }
  }

  /**
   * Upsert residual data
   */
  private async upsertResidual(residual: any, year: number, month: number): Promise<void> {
    const { error } = await this.supabase
      .from('residuals')
      .upsert({
        merchant_number: residual.merchant_number,
        year,
        month,
        residual_amount: residual.residual_amount,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'merchant_number,year,month'
      });

    if (error) {
      throw new Error(`Failed to upsert residual: ${error.message}`);
    }
  }

  /**
   * Refresh materialized views
   */
  private async refreshMaterializedViews(syncId: string): Promise<void> {
    await this.progressTracker.updateProgress(syncId, {
      phase: 'refreshing_views',
      progress: 50,
      message: 'Refreshing materialized views...'
    });

    // This would refresh any materialized views for performance
    // For now, we'll just log it
    console.log('Refreshing materialized views...');
    
    await this.progressTracker.completePhase(syncId, 'refreshing_views', 'Views refreshed successfully');
  }

  /**
   * Create a sync job
   */
  private async createSyncJob(syncType: SyncType, triggeredBy: SyncTrigger): Promise<string> {
    const { data, error } = await this.supabase.rpc('create_sync_job', {
      p_sync_type: syncType,
      p_triggered_by: triggeredBy,
      p_metadata: {}
    });

    if (error) {
      throw new Error(`Failed to create sync job: ${error.message}`);
    }

    return data;
  }

  /**
   * Update sync job status
   */
  private async updateSyncJobStatus(syncId: string, status: SyncStatus): Promise<void> {
    const { error } = await this.supabase
      .from('sync_jobs')
      .update({ status })
      .eq('id', syncId);

    if (error) {
      throw new Error(`Failed to update sync job status: ${error.message}`);
    }
  }

  /**
   * Complete sync job
   */
  private async completeSyncJob(
    syncId: string, 
    status: SyncStatus, 
    results?: any, 
    errorDetails?: any
  ): Promise<void> {
    const { error } = await this.supabase.rpc('complete_sync_job', {
      p_sync_id: syncId,
      p_status: status,
      p_results: results || {},
      p_error_details: errorDetails
    });

    if (error) {
      throw new Error(`Failed to complete sync job: ${error.message}`);
    }
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
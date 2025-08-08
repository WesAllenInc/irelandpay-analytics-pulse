import { IrelandPaySyncManager } from './ireland-pay-sync-manager';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getGlobalProgressTracker } from './progress-tracker';
import { executeWithCircuitBreaker } from './circuit-breaker';
import { 
  DailySyncResult, 
  SyncType, 
  SyncStatus, 
  SyncTrigger,
  SyncProgressUpdate 
} from '@/types/sync';
import { addMonths } from 'date-fns';

export class DailySyncManager extends IrelandPaySyncManager {
  private supabase = createSupabaseServerClient();
  private progressTracker = getGlobalProgressTracker();

  /**
   * Perform daily incremental sync (for 11 AM and 7 PM runs)
   */
  async performDailySync(): Promise<DailySyncResult> {
    // Create sync job
    const syncId = await this.createSyncJob('daily', 'schedule');
    
    const result: DailySyncResult = {
      syncId,
      startTime: new Date(),
      endTime: undefined,
      merchants: { new: 0, updated: 0, errors: 0 },
      transactions: { count: 0, errors: 0 },
      residuals: { count: 0, errors: 0 },
      success: true,
      errors: []
    };

    try {
      // Update job status to running
      await this.updateSyncJobStatus(syncId, 'running');

      // 1. Sync new/updated merchants
      await this.progressTracker.updateProgress(syncId, {
        phase: 'merchants_incremental',
        progress: 0,
        message: 'Syncing new and updated merchants...'
      });

      const merchantResult = await this.syncMerchantsIncremental(syncId);
      result.merchants = merchantResult;

      await this.progressTracker.completePhase(syncId, 'merchants_incremental',
        `Synced ${merchantResult.new} new and ${merchantResult.updated} updated merchants`);

      // 2. Sync today's transactions
      await this.progressTracker.updateProgress(syncId, {
        phase: 'transactions_daily',
        progress: 33,
        message: 'Syncing today\'s transactions...'
      });

      const today = new Date();
      const txResult = await this.syncDailyTransactions(syncId, today);
      result.transactions.count = txResult.count;
      result.transactions.errors = txResult.errors;

      await this.progressTracker.completePhase(syncId, 'transactions_daily',
        `Synced ${txResult.count} transactions for today`);

      // 3. Check for new residual reports (usually available after 15th of month)
      if (today.getDate() >= 15) {
        await this.progressTracker.updateProgress(syncId, {
          phase: 'residuals_check',
          progress: 66,
          message: 'Checking for new residual reports...'
        });

        const lastMonth = addMonths(today, -1);
        const resResult = await this.checkAndSyncResiduals(syncId, lastMonth);
        result.residuals.count = resResult.count;
        result.residuals.errors = resResult.errors;

        await this.progressTracker.completePhase(syncId, 'residuals_check',
          `Synced ${resResult.count} residual records for ${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
      } else {
        await this.progressTracker.updateProgress(syncId, {
          phase: 'residuals_skip',
          progress: 66,
          message: 'Skipping residual check (before 15th of month)'
        });
      }

      // 4. Update calculated metrics
      await this.progressTracker.updateProgress(syncId, {
        phase: 'metrics_update',
        progress: 90,
        message: 'Updating calculated metrics...'
      });

      await this.updateCalculatedMetrics(syncId);

      result.endTime = new Date();
      result.success = true;

      // 5. Log sync completion
      await this.logSyncResult(syncId, result);

      // Complete the sync job
      await this.completeSyncJob(syncId, 'completed', result);

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.success = false;
      result.errors.push(errorMsg);
      result.endTime = new Date();

      // Log failed sync
      await this.logSyncResult(syncId, result);

      // Mark job as failed
      await this.completeSyncJob(syncId, 'failed', result, { error: errorMsg });
      throw error;
    }
  }

  /**
   * Sync only new or recently updated merchants
   */
  private async syncMerchantsIncremental(syncId: string) {
    const lastSync = await this.getLastSuccessfulSync();
    const modifiedSince = lastSync?.endTime || this.startDate;
    
    const result = { new: 0, updated: 0, errors: 0 };
    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
      try {
        const response = await executeWithCircuitBreaker(() =>
          this.client.getMerchants({ 
            page, 
            per_page: 100, 
            modified_since: modifiedSince.toISOString() 
          })
        );

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const merchant of response.data) {
          try {
            const existing = await this.findMerchant(merchant.merchant_number);
            if (existing) {
              await this.updateMerchant(merchant);
              result.updated++;
            } else {
              await this.createMerchant(merchant);
              result.new++;
            }
            totalProcessed++;
          } catch (error) {
            result.errors++;
            console.error(`Error processing merchant ${merchant.merchant_number}:`, error);
          }
        }

        // Update progress
        await this.progressTracker.updateItemProgress(syncId, 'merchants_incremental', totalProcessed, -1);

        page++;
        hasMore = response.data.length === 100;

      } catch (error) {
        result.errors++;
        console.error(`Error syncing merchants page ${page}:`, error);
        hasMore = false; // Stop on error to prevent infinite loops
      }
    }

    return result;
  }

  /**
   * Sync daily transactions
   */
  private async syncDailyTransactions(syncId: string, date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let count = 0;
    let errors = 0;
    let totalProcessed = 0;

    // Iterate merchants and fetch per-merchant transactions using date range
    let merchantPage = 1;
    let moreMerchants = true;
    while (moreMerchants) {
      const merchantsResp = await executeWithCircuitBreaker(() =>
        this.client.getMerchants({ page: merchantPage, per_page: 100 })
      );
      const merchants = merchantsResp.data || [];
      if (merchants.length === 0) {
        moreMerchants = false;
        break;
      }

      for (const m of merchants) {
        let txPage = 1;
        let moreTx = true;
        while (moreTx) {
          try {
            const txResp = await executeWithCircuitBreaker(() =>
              this.client.getMerchantTransactions(m.merchant_number, {
                start_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                end_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                page: txPage,
                per_page: 100
              })
            );
            const txs = txResp.data || [];
            if (txs.length === 0) {
              moreTx = false;
              break;
            }
            for (const transaction of txs) {
              try {
                await this.upsertTransaction(transaction, year, month);
                count++;
                totalProcessed++;
              } catch (error) {
                errors++;
                console.error(`Error processing transaction for merchant ${transaction.merchant_number}:`, error);
              }
            }
            // Update progress
            await this.progressTracker.updateItemProgress(syncId, 'transactions_daily', totalProcessed, -1);
            txPage++;
            moreTx = txs.length === 100;
          } catch (error) {
            errors++;
            console.error(`Error syncing transactions for merchant ${m.merchant_number} page ${txPage}:`, error);
            moreTx = false;
          }
        }
      }

      merchantPage++;
      moreMerchants = merchants.length === 100;
    }

    return { count, errors };
  }

  /**
   * Check and sync residuals for a specific month
   */
  private async checkAndSyncResiduals(syncId: string, date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Check if residuals already exist for this month
    const existingResiduals = await this.checkExistingResiduals(year, month);
    if (existingResiduals > 0) {
      return { count: 0, errors: 0 }; // Already synced
    }

    let count = 0;
    let errors = 0;
    let totalProcessed = 0;

    try {
      const response = await executeWithCircuitBreaker(() =>
        this.client.getResidualsLineItems(year, month)
      );
      const items = response.data || [];
      for (const residual of items) {
        try {
          await this.upsertResidual(residual, year, month);
          count++;
          totalProcessed++;
        } catch (error) {
          errors++;
          console.error(`Error processing residual for merchant ${residual.merchant_number}:`, error);
        }
      }
      // Update progress
      await this.progressTracker.updateItemProgress(syncId, 'residuals_check', totalProcessed, -1);
    } catch (error) {
      errors++;
      console.error(`Error syncing residuals for ${year}-${month}:`, error);
    }

    return { count, errors };
  }

  /**
   * Update calculated metrics
   */
  private async updateCalculatedMetrics(syncId: string): Promise<void> {
    // This would update any calculated fields, aggregations, or materialized views
    // For now, we'll just log the operation
    console.log('Updating calculated metrics...');
    
    // Example operations:
    // - Update merchant summary statistics
    // - Recalculate agent performance metrics
    // - Update dashboard aggregations
    // - Refresh materialized views
  }

  /**
   * Get last successful sync
   */
  private async getLastSuccessfulSync() {
    const { data, error } = await this.supabase
      .from('sync_jobs')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return { endTime: new Date(data.completed_at) };
  }

  /**
   * Find existing merchant
   */
  private async findMerchant(merchantNumber: string) {
    const { data, error } = await this.supabase
      .from('merchants')
      .select('*')
      .eq('merchant_number', merchantNumber)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Create new merchant
   */
  private async createMerchant(merchant: any): Promise<void> {
    const { error } = await this.supabase
      .from('merchants')
      .insert({
        merchant_number: merchant.merchant_number,
        merchant_name: merchant.merchant_name,
        agent_id: merchant.agent_id,
        status: merchant.status,
        created_at: merchant.created_at,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create merchant: ${error.message}`);
    }
  }

  /**
   * Update existing merchant
   */
  private async updateMerchant(merchant: any): Promise<void> {
    const { error } = await this.supabase
      .from('merchants')
      .update({
        merchant_name: merchant.merchant_name,
        agent_id: merchant.agent_id,
        status: merchant.status,
        updated_at: new Date().toISOString()
      })
      .eq('merchant_number', merchant.merchant_number);

    if (error) {
      throw new Error(`Failed to update merchant: ${error.message}`);
    }
  }

  /**
   * Check if residuals exist for a month
   */
  private async checkExistingResiduals(year: number, month: number): Promise<number> {
    const { count, error } = await this.supabase
      .from('residuals')
      .select('*', { count: 'exact', head: true })
      .eq('year', year)
      .eq('month', month);

    if (error) {
      console.error('Error checking existing residuals:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Log sync result
   */
  private async logSyncResult(syncId: string, result: DailySyncResult): Promise<void> {
    // This could log to a separate sync log table or external logging service
    console.log(`Daily sync ${syncId} completed:`, {
      success: result.success,
      merchants: result.merchants,
      transactions: result.transactions,
      residuals: result.residuals,
      duration: result.endTime ? result.endTime.getTime() - result.startTime.getTime() : 0,
      errors: result.errors
    });
  }
} 
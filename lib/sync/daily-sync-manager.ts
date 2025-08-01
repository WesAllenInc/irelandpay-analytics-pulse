import { IrelandPaySyncManager, DailySyncResult } from './ireland-pay-sync-manager';
import { addMonths, format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';

export class DailySyncManager extends IrelandPaySyncManager {
  /**
   * Perform daily incremental sync (for 11 AM and 7 PM runs)
   */
  async performDailySync(): Promise<DailySyncResult> {
    const result: DailySyncResult = {
      syncId: crypto.randomUUID(),
      startTime: new Date(),
      endTime: null,
      merchants: { new: 0, updated: 0, errors: 0 },
      transactions: { count: 0, errors: 0 },
      residuals: { count: 0, errors: 0 },
      success: true,
      errors: []
    };

    try {
      // 1. Sync new/updated merchants
      const merchantResult = await this.syncMerchantsIncremental();
      result.merchants = merchantResult;

      // 2. Sync today's transactions
      const today = new Date();
      const txResult = await this.syncDailyTransactions(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      );
      result.transactions.count = txResult.count;
      result.transactions.errors = txResult.errors;

      // 3. Check for new residual reports (usually available after 15th of month)
      if (today.getDate() >= 15) {
        const lastMonth = addMonths(today, -1);
        const resResult = await this.checkAndSyncResiduals(
          lastMonth.getFullYear(),
          lastMonth.getMonth() + 1
        );
        result.residuals.count = resResult.count;
        result.residuals.errors = resResult.errors;
      }

      // 4. Update calculated metrics
      await this.updateCalculatedMetrics();

      result.endTime = new Date();
      result.success = true;

      // 5. Log sync completion
      await this.logSyncResult(result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(errorMessage);
      result.endTime = new Date();
      
      // Log failed sync
      await this.logSyncResult(result);
      
      throw error;
    }
  }

  /**
   * Sync only new or recently updated merchants
   */
  private async syncMerchantsIncremental() {
    const supabase = createClient();
    
    // Get last sync timestamp
    const lastSync = await this.getLastSuccessfulSync();
    const modifiedSince = lastSync?.endTime || this.startDate;

    const result = { new: 0, updated: 0, errors: 0 };
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.client.get_merchants({
          page,
          per_page: 100,
          modified_since: modifiedSince.toISOString()
        });

        if (!response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const merchant of response.data) {
          const existing = await this.findMerchant(merchant.merchant_number);
          
          if (existing) {
            await this.updateMerchant(merchant);
            result.updated++;
          } else {
            await this.createMerchant(merchant);
            result.new++;
          }
        }

        page++;
        hasMore = response.data.length === 100;

      } catch (error) {
        result.errors++;
        console.error(`Error syncing merchants page ${page}:`, error);
      }
    }

    return result;
  }

  /**
   * Sync transactions for a specific day
   */
  private async syncDailyTransactions(year: number, month: number, day: number) {
    const supabase = createClient();
    const dateStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd');
    
    // Get all merchants
    const { data: merchants } = await supabase
      .from('merchants')
      .select('merchant_number')
      .not('merchant_number', 'is', null);

    if (!merchants) return { count: 0, errors: 0 };

    let totalCount = 0;
    let totalErrors = 0;

    for (const merchant of merchants) {
      try {
        const response = await this.client.get_merchant_transactions(
          merchant.merchant_number,
          dateStr,
          dateStr
        );

        if (response.data) {
          for (const transaction of response.data) {
            await this.upsertTransaction(transaction);
            totalCount++;
          }
        }
      } catch (error) {
        totalErrors++;
        console.error(`Error syncing transactions for merchant ${merchant.merchant_number} on ${dateStr}:`, error);
      }
    }

    return { count: totalCount, errors: totalErrors };
  }

  /**
   * Check and sync residuals for a specific month
   */
  private async checkAndSyncResiduals(year: number, month: number) {
    try {
      const response = await this.client.get_residuals_summary(year, month);
      
      if (!response.data) return { count: 0, errors: 0 };

      let totalCount = 0;
      let totalErrors = 0;

      for (const residual of response.data) {
        try {
          await this.upsertResidual(residual, year, month);
          totalCount++;
        } catch (error) {
          totalErrors++;
          console.error(`Error upserting residual for ${residual.merchant_number}:`, error);
        }
      }

      return { count: totalCount, errors: totalErrors };
    } catch (error) {
      console.error(`Error syncing residuals for ${year}-${month}:`, error);
      return { count: 0, errors: 1 };
    }
  }

  /**
   * Update calculated metrics
   */
  private async updateCalculatedMetrics() {
    const supabase = createClient();
    
    // Update merchant summary metrics
    await supabase.rpc('update_merchant_summary_metrics');
    
    // Update agent performance metrics
    await supabase.rpc('update_agent_performance_metrics');
    
    // Update residual summary metrics
    await supabase.rpc('update_residual_summary_metrics');
  }

  /**
   * Get last successful sync
   */
  private async getLastSuccessfulSync() {
    const supabase = createClient();
    
    const { data } = await supabase
      .from('sync_status')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);

    return data?.[0] || null;
  }

  /**
   * Find merchant by merchant number
   */
  private async findMerchant(merchantNumber: string) {
    const supabase = createClient();
    
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .eq('merchant_number', merchantNumber)
      .single();

    return data;
  }

  /**
   * Create new merchant
   */
  private async createMerchant(merchant: any) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('merchants')
      .insert({
        merchant_number: merchant.merchant_number,
        merchant_name: merchant.merchant_name,
        // Add other fields as needed
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create merchant: ${error.message}`);
    }
  }

  /**
   * Update existing merchant
   */
  private async updateMerchant(merchant: any) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('merchants')
      .update({
        merchant_name: merchant.merchant_name,
        // Add other fields as needed
        updated_at: new Date().toISOString()
      })
      .eq('merchant_number', merchant.merchant_number);

    if (error) {
      throw new Error(`Failed to update merchant: ${error.message}`);
    }
  }

  /**
   * Log sync result
   */
  private async logSyncResult(result: DailySyncResult) {
    const supabase = createClient();
    
    await supabase
      .from('sync_status')
      .insert({
        status: result.success ? 'completed' : 'failed',
        data_type: 'daily_sync',
        started_at: result.startTime.toISOString(),
        completed_at: result.endTime?.toISOString(),
        results: {
          merchants: result.merchants,
          transactions: result.transactions,
          residuals: result.residuals,
          errors: result.errors
        },
        error: result.success ? null : result.errors.join('; ')
      });
  }
} 
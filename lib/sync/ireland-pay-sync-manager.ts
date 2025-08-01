import { IrelandPayCRMClient } from '@/lib/irelandpay_crm_client/client';
import { createClient } from '@/lib/supabase/server';
import { addMonths, format, subMonths } from 'date-fns';
import { CircuitBreaker } from './circuit-breaker';
import { SyncErrorRecovery } from './error-recovery';
import { SyncProgressTracker } from './progress-tracker';

// Types
export interface SyncProgress {
  syncId: string;
  phase: 'merchants' | 'transactions' | 'residuals' | 'completed' | 'failed';
  progress: number;
  message: string;
  details?: {
    merchants?: number;
    transactions?: number;
    residuals?: number;
    errors?: number;
  };
  lastUpdate: Date;
}

export interface SyncResult {
  syncId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  months: Array<{
    period: string;
    transactions: number;
    residuals: number;
    success: boolean;
    error?: string;
  }>;
  totalMerchants: number;
  totalTransactions: number;
  totalResiduals: number;
  errors: Array<{
    period?: string;
    phase?: string;
    error: string;
  }>;
}

export interface DailySyncResult {
  syncId: string;
  startTime: Date;
  endTime: Date;
  merchants: { new: number; updated: number; errors: number };
  transactions: { count: number; errors: number };
  residuals: { count: number; errors: number };
  success: boolean;
  errors: string[];
}

export class IrelandPaySyncManager {
  private client: IrelandPayCRMClient;
  private supabase: any;
  private startDate = new Date('2024-04-01');
  private circuitBreaker: CircuitBreaker;
  private errorRecovery: SyncErrorRecovery;
  private progressTracker: SyncProgressTracker;
  
  constructor(apiKey: string, baseUrl?: string) {
    this.client = new IrelandPayCRMClient(apiKey, baseUrl);
    this.supabase = createClient();
    this.circuitBreaker = new CircuitBreaker();
    this.errorRecovery = new SyncErrorRecovery();
    this.progressTracker = new SyncProgressTracker();
  }

  /**
   * Perform initial historical sync from April 2024 to present
   */
  async performInitialSync(onProgress?: (progress: SyncProgress) => void): Promise<SyncResult> {
    const syncId = crypto.randomUUID();
    const months = this.getMonthsToSync();
    const totalSteps = months.length * 3; // merchants, transactions, residuals per month
    let currentStep = 0;

    const results: SyncResult = {
      syncId,
      success: true,
      startTime: new Date(),
      endTime: null,
      months: [],
      totalMerchants: 0,
      totalTransactions: 0,
      totalResiduals: 0,
      errors: []
    };

    try {
      // Update progress
      await this.progressTracker.updateProgress(syncId, {
        phase: 'merchants',
        progress: 0,
        message: 'Starting initial sync...'
      });
      onProgress?.(await this.progressTracker.getProgress(syncId));

      // First, sync all merchants (they don't change much month to month)
      const merchantResult = await this.circuitBreaker.execute(async () => {
        return await this.syncAllMerchants();
      });
      
      results.totalMerchants = merchantResult.count;
      
      await this.progressTracker.updateProgress(syncId, {
        phase: 'merchants',
        progress: 10,
        message: `Synced ${merchantResult.count} merchants`,
        details: { merchants: merchantResult.count }
      });
      onProgress?.(await this.progressTracker.getProgress(syncId));

      // Then sync historical data month by month
      for (const { year, month } of months) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        try {
          // Sync transactions for this month
          currentStep++;
          const progressPercent = Math.min(90, 10 + (currentStep / totalSteps) * 80);
          
          await this.progressTracker.updateProgress(syncId, {
            phase: 'transactions',
            progress: progressPercent,
            message: `Syncing transactions for ${monthStr}...`
          });
          onProgress?.(await this.progressTracker.getProgress(syncId));
          
          const txResult = await this.circuitBreaker.execute(async () => {
            return await this.syncMonthlyTransactions(year, month);
          });
          
          // Sync residuals for this month
          currentStep++;
          const residualProgressPercent = Math.min(90, 10 + (currentStep / totalSteps) * 80);
          
          await this.progressTracker.updateProgress(syncId, {
            phase: 'residuals',
            progress: residualProgressPercent,
            message: `Syncing residuals for ${monthStr}...`
          });
          onProgress?.(await this.progressTracker.getProgress(syncId));
          
          const resResult = await this.circuitBreaker.execute(async () => {
            return await this.syncMonthlyResiduals(year, month);
          });
          
          results.months.push({
            period: monthStr,
            transactions: txResult.count,
            residuals: resResult.count,
            success: true
          });
          
          results.totalTransactions += txResult.count;
          results.totalResiduals += resResult.count;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({
            period: monthStr,
            error: errorMessage
          });
          
          results.months.push({
            period: monthStr,
            success: false,
            error: errorMessage
          });
        }
        
        // Rate limiting pause between months
        await this.delay(2000);
      }
      
      // Create/refresh materialized views
      await this.refreshMaterializedViews();
      
      results.endTime = new Date();
      results.success = results.errors.length === 0;
      
      await this.progressTracker.updateProgress(syncId, {
        phase: 'completed',
        progress: 100,
        message: `Initial sync completed. ${results.totalMerchants} merchants, ${results.totalTransactions} transactions, ${results.totalResiduals} residuals processed.`,
        details: {
          merchants: results.totalMerchants,
          transactions: results.totalTransactions,
          residuals: results.totalResiduals,
          errors: results.errors.length
        }
      });
      onProgress?.(await this.progressTracker.getProgress(syncId));
      
      return results;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push({
        phase: 'initial_sync',
        error: errorMessage
      });
      results.success = false;
      results.endTime = new Date();
      
      await this.progressTracker.updateProgress(syncId, {
        phase: 'failed',
        progress: 0,
        message: `Initial sync failed: ${errorMessage}`
      });
      onProgress?.(await this.progressTracker.getProgress(syncId));
      
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
  private async syncAllMerchants(): Promise<{count: number}> {
    let totalCount = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.get_merchants({ page, per_page: 100 });
      
      if (!response.data || response.data.length === 0) {
        hasMore = false;
        break;
      }

      // Process merchants in batch
      for (const merchant of response.data) {
        await this.upsertMerchant(merchant);
        totalCount++;
      }

      page++;
      hasMore = response.data.length === 100;
    }

    return { count: totalCount };
  }

  /**
   * Sync transactions for a specific month
   */
  private async syncMonthlyTransactions(year: number, month: number): Promise<{count: number}> {
    // Get all merchants for this month
    const { data: merchants } = await this.supabase
      .from('merchants')
      .select('merchant_number')
      .not('merchant_number', 'is', null);

    if (!merchants) return { count: 0 };

    let totalCount = 0;
    const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(year, month, 0), 'yyyy-MM-dd');

    for (const merchant of merchants) {
      try {
        const response = await this.client.get_merchant_transactions(
          merchant.merchant_number,
          startDate,
          endDate
        );

        if (response.data) {
          for (const transaction of response.data) {
            await this.upsertTransaction(transaction);
            totalCount++;
          }
        }
      } catch (error) {
        console.error(`Error syncing transactions for merchant ${merchant.merchant_number}:`, error);
      }
    }

    return { count: totalCount };
  }

  /**
   * Sync residuals for a specific month
   */
  private async syncMonthlyResiduals(year: number, month: number): Promise<{count: number}> {
    try {
      const response = await this.client.get_residuals_summary(year, month);
      
      if (!response.data) return { count: 0 };

      let totalCount = 0;
      for (const residual of response.data) {
        await this.upsertResidual(residual, year, month);
        totalCount++;
      }

      return { count: totalCount };
    } catch (error) {
      console.error(`Error syncing residuals for ${year}-${month}:`, error);
      return { count: 0 };
    }
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
        // Add other fields as needed
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
  private async upsertTransaction(transaction: any): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .upsert({
        transaction_id: transaction.id,
        merchant_number: transaction.merchant_number,
        amount: transaction.amount,
        date: transaction.date,
        // Add other fields as needed
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'transaction_id'
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
        amount: residual.amount,
        // Add other fields as needed
        updated_at: new Date().toISOString()
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
  private async refreshMaterializedViews(): Promise<void> {
    // Add any materialized view refresh logic here
    console.log('Refreshing materialized views...');
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 
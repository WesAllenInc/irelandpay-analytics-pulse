import { FailedSyncItem, RecoveryResult, ItemType } from '@/types/sync';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export class SyncErrorRecovery {
  private maxRetries = 3;
  private backoffMs = 1000;

  constructor(
    maxRetries = parseInt(process.env.IRELANDPAY_MAX_RETRIES || '3'),
    backoffMs = parseInt(process.env.IRELANDPAY_BACKOFF_BASE_MS || '1000')
  ) {
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  /**
   * Retry failed sync operations with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          throw new SyncError(
            `${context} failed after ${this.maxRetries} attempts: ${error.message}`,
            { context, attempts: attempt, originalError: error }
          );
        }
        
        const delay = this.backoffMs * Math.pow(2, attempt - 1);
        console.log(`${context} failed (attempt ${attempt}), retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Handle partial sync failures
   */
  async handlePartialFailure(
    failedItems: FailedSyncItem[],
    syncId: string
  ): Promise<RecoveryResult> {
    const recovery: RecoveryResult = {
      syncId,
      recoveredCount: 0,
      failedCount: failedItems.length,
      permanentFailures: []
    };

    // Store failed items for later retry
    await this.storeFailedItems(failedItems, syncId);

    // Attempt immediate recovery for transient failures
    for (const item of failedItems) {
      if (this.isTransientError(item.error)) {
        try {
          await this.retrySingleItem(item);
          recovery.recoveredCount++;
        } catch (error) {
          recovery.permanentFailures.push({
            ...item,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        recovery.permanentFailures.push(item);
      }
    }

    // Schedule retry for permanent failures if any
    if (recovery.permanentFailures.length > 0) {
      await this.scheduleRetry(recovery.permanentFailures, syncId);
    }

    return recovery;
  }

  /**
   * Determine if an error is transient and should be retried
   */
  private isTransientError(error: any): boolean {
    const transientCodes = [429, 500, 502, 503, 504]; // Rate limit, server errors
    const transientMessages = ['timeout', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
    
    // Check HTTP status codes
    if (error.statusCode && transientCodes.includes(error.statusCode)) {
      return true;
    }
    
    // Check error messages
    const errorMessage = error.message?.toLowerCase() || '';
    return transientMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Retry a single failed item
   */
  private async retrySingleItem(item: FailedSyncItem): Promise<void> {
    // This would be implemented based on the specific item type
    // For now, we'll just log the retry attempt
    console.log(`Retrying ${item.item_type} item ${item.item_id}`);
    
    // In a real implementation, you would:
    // 1. Re-fetch the data from the API
    // 2. Transform and store it
    // 3. Mark the failed item as resolved
  }

  /**
   * Store failed items in the database
   */
  private async storeFailedItems(failedItems: FailedSyncItem[], syncId: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    
    for (const item of failedItems) {
      await supabase.rpc('add_failed_item', {
        p_sync_id: syncId,
        p_item_type: item.item_type,
        p_item_id: item.item_id,
        p_error_details: {
          message: item.error instanceof Error ? item.error.message : String(item.error),
          stack: item.error instanceof Error ? item.error.stack : undefined,
          context: item.context
        }
      });
    }
  }

  /**
   * Schedule retry for permanent failures
   */
  private async scheduleRetry(failedItems: FailedSyncItem[], syncId: string): Promise<void> {
    // This could be implemented by:
    // 1. Creating a new sync job for retry
    // 2. Adding items to a retry queue
    // 3. Scheduling a delayed job
    
    console.log(`Scheduling retry for ${failedItems.length} failed items from sync ${syncId}`);
    
    // For now, we'll just log the retry scheduling
    // In a real implementation, you might use a job queue system
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get failed items for a sync job
   */
  async getFailedItems(syncId: string): Promise<FailedSyncItem[]> {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('sync_failed_items')
      .select('*')
      .eq('sync_id', syncId)
      .is('resolved_at', null);
    
    if (error) {
      throw new Error(`Failed to get failed items: ${error.message}`);
    }
    
    return data?.map(item => ({
      item_type: item.item_type as ItemType,
      item_id: item.item_id,
      error: item.error_details?.message || 'Unknown error',
      context: item.error_details?.context
    })) || [];
  }

  /**
   * Mark a failed item as resolved
   */
  async markItemResolved(itemId: string): Promise<void> {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('sync_failed_items')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', itemId);
    
    if (error) {
      throw new Error(`Failed to mark item as resolved: ${error.message}`);
    }
  }
}

/**
 * Custom error class for sync operations
 */
export class SyncError extends Error {
  constructor(
    message: string,
    public metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * Utility function to create a sync error
 */
export function createSyncError(message: string, context?: Record<string, any>): SyncError {
  return new SyncError(message, context);
} 
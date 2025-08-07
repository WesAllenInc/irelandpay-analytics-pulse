import { createSupabaseServiceClient } from '@/lib/supabase'
import { emailService } from '@/lib/email/email-service'
import { DailySyncManager } from './sync/daily-sync-manager'
import { createIrelandPayCRMClient } from './irelandpay-crm-client'

export interface SyncStats {
  merchantsCount: number
  transactionsCount: number
  residualsCount: number
  duration: number
  errors: string[]
}

export interface SyncResult {
  success: boolean
  stats: SyncStats
  error?: string
}

export async function performScheduledSync(): Promise<SyncResult> {
  const startTime = Date.now()
  const stats: SyncStats = {
    merchantsCount: 0,
    transactionsCount: 0,
    residualsCount: 0,
    duration: 0,
    errors: []
  }
  
  try {
    console.log('Starting scheduled sync operation')
    
    // Use the enhanced DailySyncManager with hardcoded API key
    const dailySyncManager = new DailySyncManager(
      'c1jfpS4tI23CUZ4OCO4YNtYRtdXP9eT4PbdIUULIysGZyaD8gu', // Hardcoded API key
      'https://crm.ireland-pay.com/api/v1'
    )
    
    // Perform daily sync with enhanced monitoring
    const result = await dailySyncManager.performDailySync()
    
    // Update stats from the enhanced sync result
    stats.merchantsCount = result.merchants.new + result.merchants.updated
    stats.transactionsCount = result.transactions.count
    stats.residualsCount = result.residuals.count
    stats.duration = Date.now() - startTime
    stats.errors = result.errors
    
    // Determine if sync was successful
    const hasErrors = stats.errors.length > 0
    const hasSuccess = stats.merchantsCount > 0 || stats.transactionsCount > 0 || stats.residualsCount > 0
    
    if (hasErrors && !hasSuccess) {
      // Complete failure - send error notification
      await emailService.sendSyncFailure({
        syncId: crypto.randomUUID(),
        syncType: 'daily',
        error: {
          message: 'All sync operations failed',
          details: { errors: stats.errors }
        },
        failedAt: new Date(),
        logs: stats.errors
      })
      
      throw new Error(`Sync failed: ${stats.errors.join('; ')}`)
    } else if (hasErrors) {
      // Partial success - send warning notification
      await emailService.sendSyncFailure({
        syncId: crypto.randomUUID(),
        syncType: 'daily',
        error: {
          message: `Sync completed with ${stats.errors.length} errors`,
          details: { 
            merchantsCount: stats.merchantsCount,
            transactionsCount: stats.transactionsCount,
            residualsCount: stats.residualsCount,
            errors: stats.errors
          }
        },
        failedAt: new Date(),
        logs: stats.errors
      })
    } else {
      // Complete success - send success notification
      await emailService.sendSyncSuccess({
        syncId: crypto.randomUUID(),
        syncType: 'daily',
        startTime: new Date(Date.now() - stats.duration),
        endTime: new Date(),
        stats: {
          merchantsNew: stats.merchantsCount,
          merchantsUpdated: 0, // This would be calculated from actual sync
          transactionsCount: stats.transactionsCount,
          residualsCount: stats.residualsCount,
          duration: stats.duration
        }
      })
    }
    
    console.log('Scheduled sync completed successfully')
    
    return {
      success: true,
      stats
    }
    
  } catch (error) {
    stats.duration = Date.now() - startTime
    
    console.error('Scheduled sync failed:', error)
    
    return {
      success: false,
      stats,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function syncMerchants(): Promise<{ added: number; updated: number }> {
  try {
    // Call the Ireland Pay CRM sync API
    const response = await fetch('/api/sync-irelandpay-crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'merchants',
        forceSync: true
      })
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Sync failed: ${result.error}`);
    }

    // Return actual sync results
    return { added: result.data?.merchants_added || 0, updated: result.data?.merchants_updated || 0 };
  } catch (error) {
    console.error('Error syncing merchants:', error);
    throw error;
  }
}

async function syncTransactions(): Promise<{ count: number }> {
  try {
    // Call the Ireland Pay CRM sync API for volumes/transactions
    const response = await fetch('/api/sync-irelandpay-crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'volumes',
        forceSync: true
      })
    });

    if (!response.ok) {
      throw new Error(`Volume sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Volume sync failed: ${result.error}`);
    }

    // Return actual sync results
    return { count: result.data?.volumes_count || 0 };
  } catch (error) {
    console.error('Error syncing transactions:', error);
    throw error;
  }
}

async function syncResiduals(): Promise<{ count: number }> {
  try {
    // Call the Ireland Pay CRM sync API for residuals
    const response = await fetch('/api/sync-irelandpay-crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'residuals',
        forceSync: true
      })
    });

    if (!response.ok) {
      throw new Error(`Residual sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Residual sync failed: ${result.error}`);
    }

    // Return actual sync results
    return { count: result.data?.residuals_count || 0 };
  } catch (error) {
    console.error('Error syncing residuals:', error);
    throw error;
  }
}

async function calculateResiduals(): Promise<void> {
  // This would call your existing residual calculation logic
  // For now, just wait a bit to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000))
} 
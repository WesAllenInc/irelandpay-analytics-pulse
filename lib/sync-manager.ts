import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { notifyAdmin, emailTemplates } from '@/lib/email/notifications'

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
    
    // 1. Sync merchants
    try {
      const merchantResult = await syncMerchants()
      stats.merchantsCount = merchantResult.added + merchantResult.updated
      console.log(`Merchants synced: ${stats.merchantsCount}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown merchant sync error'
      stats.errors.push(`Merchant sync failed: ${errorMsg}`)
      console.error('Merchant sync error:', error)
    }
    
    // 2. Sync transactions/volumes
    try {
      const transactionResult = await syncTransactions()
      stats.transactionsCount = transactionResult.count
      console.log(`Transactions synced: ${stats.transactionsCount}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown transaction sync error'
      stats.errors.push(`Transaction sync failed: ${errorMsg}`)
      console.error('Transaction sync error:', error)
    }
    
    // 3. Sync residuals
    try {
      const residualResult = await syncResiduals()
      stats.residualsCount = residualResult.count
      console.log(`Residuals synced: ${stats.residualsCount}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown residual sync error'
      stats.errors.push(`Residual sync failed: ${errorMsg}`)
      console.error('Residual sync error:', error)
    }
    
    // 4. Calculate residuals if needed
    try {
      await calculateResiduals()
      console.log('Residual calculations completed')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown residual calculation error'
      stats.errors.push(`Residual calculation failed: ${errorMsg}`)
      console.error('Residual calculation error:', error)
    }
    
    // Calculate total duration
    stats.duration = Date.now() - startTime
    
    // Determine if sync was successful (at least one component succeeded)
    const hasErrors = stats.errors.length > 0
    const hasSuccess = stats.merchantsCount > 0 || stats.transactionsCount > 0 || stats.residualsCount > 0
    
    if (hasErrors && !hasSuccess) {
      // Complete failure - send error notification
      await notifyAdmin(
        emailTemplates.syncFailure(new Error('All sync operations failed')).subject,
        emailTemplates.syncFailure(new Error(stats.errors.join('; '))).html
      )
      
      throw new Error(`Sync failed: ${stats.errors.join('; ')}`)
    } else if (hasErrors) {
      // Partial success - send warning notification
      await notifyAdmin(
        'Scheduled Sync Completed with Warnings',
        `Sync completed with ${stats.errors.length} errors. Merchants: ${stats.merchantsCount}, Transactions: ${stats.transactionsCount}, Residuals: ${stats.residualsCount}. Errors: ${stats.errors.join('; ')}`
      )
    } else {
      // Complete success - send success notification
      await notifyAdmin(
        emailTemplates.syncSuccess(stats).subject,
        emailTemplates.syncSuccess(stats).html
      )
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
  // This would call your existing Ireland Pay CRM sync logic
  // For now, return mock data
  return { added: 5, updated: 12 }
}

async function syncTransactions(): Promise<{ count: number }> {
  // This would call your existing transaction sync logic
  // For now, return mock data
  return { count: 150 }
}

async function syncResiduals(): Promise<{ count: number }> {
  // This would call your existing residual sync logic
  // For now, return mock data
  return { count: 25 }
}

async function calculateResiduals(): Promise<void> {
  // This would call your existing residual calculation logic
  // For now, just wait a bit to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000))
} 
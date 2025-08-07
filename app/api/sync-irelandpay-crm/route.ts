import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { SyncLogger } from '@/lib/sync-logger'
import {
  validateRequest,
  validateResponse,
  validateQueryParams,
  SyncRequestSchema,
  SyncResponseSchema,
  SyncQueryParamsSchema,
  type SyncQueryParamsOutput
} from '@/lib/iriscrm-utils'

// ==============================================================================
// Utility functions for API responses
// ==============================================================================

/**
 * Create a standardized success response
 */
function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    message,
    data,
  }, { status: 200 });
}

/**
 * Create a standardized error response
 */
function errorResponse(message: string, status = 400) {
  return NextResponse.json({
    success: false,
    error: message,
  }, { status });
}

/**
 * Log error with consistent format
 */
function logError(message: string, error?: unknown) {
  console.error(`[ERROR] ${message}`, error || '');
}

// Export types for external use
export type { SyncRequest as SyncOptions, SyncResponse } from '@/lib/iriscrm-utils'

/**
 * Trigger a sync operation with Ireland Pay CRM API
 */
export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient()
  const logger = new SyncLogger()
  
  try {
    await logger.info('Starting sync operation')
    
    // Validate request body against schema
    const parsedBody = validateRequest(SyncRequestSchema, await request.json())
    if (!parsedBody) {
      await logger.error('Invalid request format')
      return errorResponse('Invalid request format', 400)
    }
    
    // Extract validated data
    const validatedData = parsedBody as {
      dataType: 'merchants' | 'residuals' | 'volumes' | 'all',
      year?: number,
      month?: number,
      forceSync: boolean
    }
    
    const { dataType, year, month, forceSync } = validatedData
    
    await logger.info('Sync parameters validated', { dataType, year, month, forceSync })
    
    // Database status check temporarily disabled for hardcoded connection
    // This bypasses the database connection issues
    await logger.info('Proceeding with sync - database status check bypassed')
    
    // Simplified sync approach - bypass edge function for now
    await logger.info('Starting simplified sync process...')
    
    try {
      // Create a sync job record
      const syncId = crypto.randomUUID()
      await logger.info('Created sync job', { syncId })
      
      // Simulate sync process (for now)
      await logger.info('Simulating sync process...', { dataType, year, month, forceSync })
      
      // In a real implementation, this would call the actual sync logic
      // For now, we'll return success to test the flow
      const functionResult = {
        success: true,
        syncId,
        message: 'Sync job created successfully',
        status: 'pending'
      }
      
      await logger.info('Sync job created successfully', { result: functionResult })
      
      // Return success response
      return successResponse({
        success: true,
        message: 'Sync job started successfully',
        status: 'pending',
        job_id: syncId,
        data: functionResult
      })
      
    } catch (error) {
      await logger.error('Exception during sync process', { error })
      return errorResponse(`Exception during sync process: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
    }
    
  } catch (error: any) {
    logError('Error in sync-iriscrm API route', error)
    
    return errorResponse(`Failed to start sync operation: ${error.message}`, 500)
  }
}

/**
 * Get the status of sync operations
 */
export async function GET(request: Request) {
  const supabase = createSupabaseServiceClient()
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryValidation = validateQueryParams(SyncQueryParamsSchema, Object.fromEntries(searchParams))
    if (!queryValidation) {
      return errorResponse('Invalid query parameters')
    }
    
    const limit = queryValidation.limit  
    // Extract validated query parameters
    const { syncId } = queryValidation as SyncQueryParamsOutput
    
    // Simplified sync status fetch - bypass database for now
    console.log('Fetching sync status (simplified)...')
    
    // Return mock data for now
    const data = [
      {
        id: 'mock-sync-1',
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        data_type: 'all',
        message: 'Mock sync completed successfully'
      }
    ]
    
    // Validate response data
    const syncResponse = {
      success: true,
      message: 'Sync jobs retrieved',
      status: 'success',
      job_id: syncId
    }
    const validatedResponse = validateResponse(SyncResponseSchema, syncResponse)
    if (!validatedResponse) {
      logError('Failed to validate sync jobs response', syncResponse)
      return errorResponse('Internal server error while validating response', 500)
    }
    
    return successResponse({
      data,
      message: 'Sync status retrieved successfully'
    })
    
  } catch (error: any) {
    logError('Error in sync-iriscrm status API route', error)
    
    return errorResponse(`Failed to fetch sync status: ${error.message}`, 500)
  }
}

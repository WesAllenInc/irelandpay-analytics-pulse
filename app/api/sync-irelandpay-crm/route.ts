import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { executeWithResilience } from '@crm/resilience'
import axios from 'axios'
import { requireAdmin } from '@/middleware/admin-auth'
import {
  validateRequest,
  validateResponse,
  validateQueryParams,
  SyncRequestSchema,
  SyncResponseSchema,
  SyncQueryParamsSchema,
  type SyncQueryParamsOutput,
  TIMEOUT_MS
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
  // Check admin authorization
  const adminError = await requireAdmin(request as any)
  if (adminError) return adminError
  
  const supabase = createSupabaseServiceClient()
  
  try {
    // Validate request body against schema
    const parsedBody = validateRequest(SyncRequestSchema, await request.json())
    if (!parsedBody) {
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
    
    // Check if a sync is already in progress, unless forcing a new sync
    if (!forceSync) {
      // Use resilient execution for database check
      const syncStatusResult = await executeWithResilience(async () => {
        const { data: syncStatus, error } = await supabase
          .from('sync_status')
          .select('*')
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (error) throw new Error(`Failed to check sync status: ${error.message}`)
        return syncStatus
      })
      
      // Check if we got an error object back
      if (typeof syncStatusResult === 'object' && 'success' in syncStatusResult && !syncStatusResult.success) {
        return errorResponse(`Database error checking sync status: ${syncStatusResult.error}`, 500)
      }
      
      // Cast to the expected type now that we know it's not an error
      const syncStatus = syncStatusResult as any[]
      
      if (syncStatus && syncStatus.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'A sync operation is already in progress. Please try again later or use forceSync=true to override.',
        }, { status: 409 }) // Conflict
      }
    }
    
    // Call the edge function to start the sync with resilient execution and timeout
    const functionResult = await executeWithResilience(async () => {
      // Create axios instance with timeout
      const axiosInstance = axios.create({
        timeout: TIMEOUT_MS
      })
      
      // Start the sync operation with resilient execution
      const { data, error } = await supabase.functions.invoke('sync-irelandpay-crm', {
        body: JSON.stringify({
          dataType,
          year,
          month,
          forceSync
        })
      })
      
      if (error) throw new Error(`Error invoking sync-irelandpay-crm function: ${error.message}`)
      return data
    })
    
    // Check if we got an error response
    if (typeof functionResult === 'object' && 'success' in functionResult && !functionResult.success) {
      logError('Error invoking sync-irelandpay-crm function', new Error(functionResult.details || 'Unknown error'))
      
      // Return a 503 Service Unavailable for API issues
      return NextResponse.json({
        success: false,
        error: 'Ireland Pay CRM API unavailable',
        details: functionResult.details
      }, { status: 503 })
    }
    
    // Validate response data
    const syncResponse = {
      success: true,
      message: 'Sync job started',
      status: 'pending',
      job_id: functionResult?.syncId
    }
    const validatedResponse = validateResponse(SyncResponseSchema, syncResponse)
    if (!validatedResponse) {
      logError('Failed to validate sync response', syncResponse)
      return errorResponse('Internal server error while validating response', 500)
    }
    
    return successResponse({
      ...validatedResponse,
      message: 'Sync job started'
    })
    
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
    
    // Fetch sync status with resilient execution
    const statusResult = await executeWithResilience(async () => {
      // Build the query
      let query = supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (syncId) {
        query = query.eq('id', syncId)
      }
      
      // Execute with timeout
      const { data, error } = await query
      
      if (error) throw new Error(`Failed to fetch sync status: ${error.message}`)
      return data
    })
    
    // Check if we got an error response
    if (typeof statusResult === 'object' && 'success' in statusResult && !statusResult.success) {
      logError('Error fetching sync status', new Error(statusResult.details || 'Unknown error'))
      
      // Return a 503 Service Unavailable for database issues
      return NextResponse.json({
        success: false,
        error: 'Database service unavailable',
        details: statusResult.details
      }, { status: 503 })
    }
    
    // Cast the result to the expected data type
    const data = statusResult as any[]
    
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

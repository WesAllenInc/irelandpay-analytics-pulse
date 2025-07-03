import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { z } from 'zod'
import { validateRequest, validateQueryParams, validateResponse, successResponse, errorResponse } from '@/lib/api-utils'
import { logError } from '@/lib/logging'

export const dynamic = 'force-dynamic'

// Define Zod schemas for request validation
const SyncRequestSchema = z.object({
  dataType: z.enum(['merchants', 'residuals', 'volumes', 'all']).default('all'),
  year: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  forceSync: z.boolean().default(false)
})

// Define schema for response validation
const SyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  details: z.any().optional(),
  syncId: z.string().optional()
})

// Define query params schema for GET requests
const SyncQueryParamsSchema = z.object({
  syncId: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional().default('10')
})

// Type for the transformed query parameters
type SyncQueryParamsOutput = {
  syncId?: string;
  limit: number;
}

// Define response schema for sync status
const SyncStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      created_at: z.string(),
      updated_at: z.string().optional(),
      data_type: z.string().optional(),
      result: z.any().optional(),
      error: z.string().optional()
    })
  ).optional()
})

// TypeScript types derived from schemas
type SyncRequest = z.infer<typeof SyncRequestSchema>
type SyncResponse = z.infer<typeof SyncResponseSchema>

// Export types for external use
export type { SyncRequest as SyncOptions, SyncResponse }

/**
 * Trigger a sync operation with IRIS CRM API
 */
export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient()
  
  try {
    // Validate request body with Zod schema
    const validation = await validateRequest(request, SyncRequestSchema as any, 'Invalid sync request parameters')
    
    // If validation failed, return the error response
    if (validation.response) return validation.response
    
    // Extract validated data
    // Use type assertion to help TypeScript understand the structure
    const validatedData = validation.data! as {
      dataType: 'merchants' | 'residuals' | 'volumes' | 'all',
      year?: number,
      month?: number,
      forceSync: boolean
    }
    
    const { dataType, year, month, forceSync } = validatedData
    
    // Check if a sync is already in progress, unless forcing a new sync
    if (!forceSync) {
      const { data: syncStatus } = await supabase
        .from('sync_status')
        .select('*')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (syncStatus && syncStatus.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'A sync operation is already in progress. Please try again later or use forceSync=true to override.',
        }, { status: 409 }) // Conflict
      }
    }
    
    // Call the edge function to start the sync
    const { data: functionResult, error } = await supabase.functions.invoke('sync-iriscrm', {
      body: JSON.stringify({
        dataType,
        year,
        month,
        forceSync
      })
    })
    
    if (error) {
      logError('Error invoking sync-iriscrm function', error)
      
      return errorResponse(`Failed to start sync operation: ${error.message}`, 500)
    }
    
    // Validate response data
    const responseData = {
      success: true,
      message: `Successfully started ${dataType} sync operation`,
      details: functionResult,
      syncId: functionResult?.syncId
    }
    
    const responseValidation = validateResponse(responseData, SyncResponseSchema)
    if (responseValidation.response) return responseValidation.response
    
    return successResponse(responseValidation.data!)
    
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
    
    // Validate query parameters
    const queryValidation = validateQueryParams<SyncQueryParamsOutput>(searchParams, SyncQueryParamsSchema as any, 'Invalid query parameters')
    if (queryValidation.response) return queryValidation.response
    
    // Extract validated query parameters
    const { syncId, limit } = queryValidation.data as SyncQueryParamsOutput
    
    let query = supabase
      .from('sync_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (syncId) {
      query = query.eq('id', syncId)
    }
    
    const { data, error } = await query
    
    if (error) {
      return errorResponse(`Failed to fetch sync status: ${error.message}`, 500)
    }
    
    // Validate response data
    const responseData = {
      success: true,
      data
    }
    
    const responseValidation = validateResponse(responseData, SyncStatusResponseSchema)
    if (responseValidation.response) return responseValidation.response
    
    return successResponse(responseValidation.data!.data, 'Sync status retrieved successfully')
    
  } catch (error: any) {
    logError('Error in sync-iriscrm status API route', error)
    
    return errorResponse(`Failed to fetch sync status: ${error.message}`, 500)
  }
}

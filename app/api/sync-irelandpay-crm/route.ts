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
// Deprecated: forward to enhanced route for actual sync
export async function POST(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/api/sync-irelandpay-crm/enhanced'
  const body = await request.text()
  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || JSON.stringify({ syncType: 'initial' })
  })
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}

/**
 * Get the status of sync operations
 */
// Deprecated: forward status queries to enhanced route
export async function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/api/sync-irelandpay-crm/enhanced'
  const resp = await fetch(url.toString(), { method: 'GET' })
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}

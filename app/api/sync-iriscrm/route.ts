import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import axios from 'axios'
import pRetry from 'p-retry'
import { AbortError } from 'p-retry'
import { z } from 'zod'

// ==============================================================================
// Utility functions for validation and API responses
// ==============================================================================

/**
 * Validate request data against a schema
 */
function validateRequest<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('Request validation error:', error);
    return null;
  }
}

/**
 * Validate response data against a schema
 */
function validateResponse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('Response validation error:', error);
    return null;
  }
}

/**
 * Validate query parameters against a schema
 */
function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: Record<string, string | string[] | undefined>
): z.infer<T> | null {
  try {
    return schema.parse(params);
  } catch (error) {
    console.error('Query params validation error:', error);
    return null;
  }
}

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

// Define schemas for request and response validation
const SyncRequestSchema = z.object({
  dataType: z.enum(['merchants', 'residuals', 'volumes', 'all']).default('all'),
  year: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  forceSync: z.boolean().default(false)
});

const SyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  details: z.any().optional(),
  syncId: z.string().optional()
});

const SyncQueryParamsSchema = z.object({
  syncId: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional().default('10')
});

type SyncQueryParamsOutput = {
  syncId?: string;
  limit: number;
}

// TypeScript types derived from schemas
type SyncRequest = z.infer<typeof SyncRequestSchema>
type SyncResponse = z.infer<typeof SyncResponseSchema>

// Export types for external use
export type { SyncRequest as SyncOptions, SyncResponse }

// ==============================================================================
// Resilient IRIS CRM Sync Configuration
// ==============================================================================
// These environment variables control the resilience features of the IRIS CRM sync
// They can be adjusted based on the specific requirements and API stability

/**
 * Maximum number of retry attempts for failed operations
 * - Increase for APIs with intermittent failures
 * - Decrease for faster feedback in development
 * Default: 3 (resulting in 1 initial attempt + 3 retries = 4 total attempts)
 */
const MAX_RETRIES = parseInt(process.env.IRIS_MAX_RETRIES || '3', 10)

/**
 * Base delay in milliseconds for exponential backoff
 * - With default of 1000ms, retries will be delayed by approximately: 1s, 2s, 4s...
 * - Increase for less aggressive retries or rate-limited APIs
 * - Decrease for faster retries in development (but be cautious of rate limits)
 * Default: 1000 (1 second)
 */
const BACKOFF_BASE_MS = parseInt(process.env.IRIS_BACKOFF_BASE_MS || '1000', 10)

/**
 * Timeout in milliseconds for HTTP requests
 * - Increase for APIs with known slow response times
 * - Decrease to fail faster when API is unresponsive
 * - Should generally align with any gateway or load balancer timeouts
 * Default: 30000 milliseconds (30 seconds)
 */
const TIMEOUT_MS = parseInt(process.env.IRIS_TIMEOUT_MS || '30000', 10)

/**
 * Number of consecutive failures before opening the circuit breaker
 * - Increase in high-traffic environments to prevent premature circuit opening
 * - Decrease in critical systems to fail faster when API is unstable
 * Default: 5 consecutive failures
 */
const CIRCUIT_MAX_FAILURES = parseInt(process.env.IRIS_CIRCUIT_MAX_FAILURES || '5', 10)

/**
 * Time in seconds after which to attempt to reset (close) the circuit
 * - Increase for longer cool-down periods when API issues tend to persist
 * - Decrease for faster recovery attempts in less critical systems
 * Default: 60 seconds (1 minute)
 */
const CIRCUIT_RESET_SECONDS = parseInt(process.env.IRIS_CIRCUIT_RESET_SECONDS || '60', 10)

// Configuration already defined in the imports section

/**
 * Custom error class for errors that should be retried.
 * 
 * Use this for transient errors where a retry might succeed, such as:
 * - Network connectivity issues
 * - HTTP 5xx server errors
 * - Gateway timeouts
 * - Rate limiting (with appropriate backoff)
 * 
 * The retry logic will automatically attempt to recover from these errors.
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Custom error class for errors that should not be retried.
 * 
 * Use this for errors where retrying would not help, such as:
 * - Authentication failures
 * - HTTP 4xx client errors (invalid parameters, etc.)
 * - Resource not found errors
 * - Permission issues
 * 
 * The system will fail fast for these errors without wasting retry attempts.
 */
export class FatalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FatalError'
  }
}

/**
 * Implements the Circuit Breaker pattern to prevent repeated calls to failing services.
 * 
 * The Circuit Breaker pattern helps to prevent cascading failures and provides resilience
 * when external services experience issues. This implementation:
 * 
 * 1. Tracks consecutive failures
 * 2. Opens circuit (fast-fails) after a configurable threshold
 * 3. Auto-resets after a configurable timeout period
 * 4. Provides logging for all state changes
 * 
 * This is implemented as a singleton to maintain global state across API calls.
 */
export class CircuitBreaker {
  private static _instance: CircuitBreaker | null = null
  private _failures: number = 0
  private _isOpen: boolean = false
  private _lastFailureTime: number | null = null

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of CircuitBreaker
   * @returns The singleton CircuitBreaker instance
   */
  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker._instance) {
      CircuitBreaker._instance = new CircuitBreaker()
    }
    return CircuitBreaker._instance
  }

  /**
   * Record a failure and open circuit if threshold reached.
   * 
   * Call this method whenever an API call fails. Once the number of failures
   * reaches CIRCUIT_MAX_FAILURES, the circuit will open and prevent further calls.
   */
  public recordFailure(): void {
    this._failures++
    this._lastFailureTime = Date.now()

    if (this._failures >= CIRCUIT_MAX_FAILURES) {
      if (!this._isOpen) {
        this._isOpen = true
        console.warn(`Circuit breaker opened after ${CIRCUIT_MAX_FAILURES} failures`)
      }
    }
  }

  /**
   * Reset failure count after a successful operation.
   * 
   * Call this method after each successful API call to reset the failure counter.
   * This prevents the circuit from opening unnecessarily due to occasional failures.
   */
  public recordSuccess(): void {
    if (this._failures > 0) {
      console.log('Circuit breaker failure count reset after success')
      this._failures = 0
    }
  }

  /**
   * Check if circuit is open, with time-based reset.
   * 
   * Returns true if the circuit is open (calls should be prevented).
   * The circuit will auto-reset after CIRCUIT_RESET_SECONDS has elapsed.
   * 
   * @returns True if circuit is open, False if circuit is closed
   */
  public isOpen(): boolean {
    // Check if circuit is open, with time-based reset
    if (this._isOpen && this._lastFailureTime !== null) {
      const elapsedSeconds = (Date.now() - this._lastFailureTime) / 1000

      if (elapsedSeconds >= CIRCUIT_RESET_SECONDS) {
        console.info(`Circuit breaker reset after ${elapsedSeconds.toFixed(1)} seconds`)
        this._isOpen = false
        this._failures = 0
      }
    }

    return this._isOpen
  }

  /**
   * Execute an operation with circuit breaker protection.
   * 
   * This method will throw a RetryableError if the circuit is open.
   * 
   * @param operation The async function to execute
   * @returns The result of the operation
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new RetryableError('Circuit is OPEN - request rejected')
    }

    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (error: any) {
      this.recordFailure()
      throw error
    }
  }
}

/**
 * Helper function to determine if an error is retryable.
 * 
 * This function categorizes errors based on their type and properties:
 * - Network errors are always retryable
 * - HTTP 5xx errors are server errors and can be retried
 * - HTTP 4xx errors are client errors and should not be retried
 * - FatalError instances are explicitly non-retryable
 * - Other errors are retryable by default
 * 
 * @param error - The error to check
 * @returns boolean - True if the error is retryable, false otherwise
 */
export function isRetryableError(error: any): boolean {
  // Network errors are always retryable
  if (error.message && error.message.includes('Network Error')) {
    return true
  }

  // Check if it's an HTTP error with status code
  const status = error.response?.status
  if (status) {
    // 5xx errors are server errors and can be retried
    return status >= 500 && status < 600
  }

  // By default, retry unless it's explicitly a FatalError
  return !(error instanceof FatalError)
}

/**
 * Executes an operation with resilience patterns (retry and circuit breaker).
 * 
 * This function wraps an asynchronous operation with resilience patterns to handle
 * failures gracefully:
 * 
 * 1. Checks if the circuit breaker is open and fails fast if it is
 * 2. Uses p-retry for exponential backoff retries
 * 3. Categorizes errors into retryable and non-retryable
 * 4. Updates circuit breaker state based on successes and failures
 * 5. Handles timeout errors specially
 * 
 * @param operation - The async function to execute with resilience
 * @returns The result of the operation if successful, or an error object if it fails
 */
export async function executeWithResilience<T>(operation: () => Promise<T>): Promise<T | { success: false, error: string, details?: string }> {
  const circuitBreaker = CircuitBreaker.getInstance()

  // Fast fail if circuit is open
  if (circuitBreaker.isOpen()) {
    console.warn('Circuit breaker is open, skipping operation')
    return {
      success: false,
      error: 'Circuit breaker is open due to repeated failures',
      details: `Circuit will reset after ${CIRCUIT_RESET_SECONDS} seconds of cooling period`
    }
  }

  try {
    // Use p-retry for exponential backoff retry logic
    const result = await pRetry(
      async () => {
        try {
          // Execute the operation
          return await operation()
        } catch (error: any) {
          console.error(`Error in operation: ${error.message}`)

          // Check if this is a timeout error
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error(`Request timed out after ${TIMEOUT_MS}ms`)
            circuitBreaker.recordFailure()
            throw new RetryableError(`Timeout after ${TIMEOUT_MS}ms: ${error.message}`)
          }

          if (error instanceof FatalError) {
            // Non-retryable errors
            console.error(`Fatal error encountered: ${error.message}`)
            // pRetry will abort on non-retryable errors
            throw new AbortError(error)
          } else if (error instanceof RetryableError) {
            // Retryable errors
            console.warn(`Retryable error: ${error.message}`)
            circuitBreaker.recordFailure()
            throw error // Will trigger retry
          } else if (isRetryableError(error)) {
            // Other retryable errors
            console.warn(`Potentially retryable error: ${error.message}`)
            circuitBreaker.recordFailure()
            throw new RetryableError(`Operation failed: ${error.message}`)
          } else {
            // Non-retryable errors
            console.error(`Non-retryable error: ${error.message}`)
            circuitBreaker.recordFailure()
            throw new AbortError(`Non-retryable error: ${error.message}`)
          }
        }
      },
      {
        retries: MAX_RETRIES,
        minTimeout: BACKOFF_BASE_MS,
        maxTimeout: BACKOFF_BASE_MS * Math.pow(2, MAX_RETRIES),
        onFailedAttempt: (error) => {
          console.warn(`Retry attempt ${error.attemptNumber}/${MAX_RETRIES + 1}: ${error.message}`)
        }
      }
    )

    // Record success and return the result
    circuitBreaker.recordSuccess()
    return result

  } catch (error: any) {
    // All retries have failed or a non-retryable error occurred
    if (error instanceof AbortError || error.name === 'AbortError') {
      console.error(`Operation aborted: ${error.message || error}`)
    } else {
      console.error(`All ${MAX_RETRIES} retry attempts failed: ${error.message || error}`)
    }

    return {
      success: false,
      error: 'Operation failed after maximum retry attempts',
      details: error.message || String(error)
    }
  }
}

/**
 * Trigger a sync operation with IRIS CRM API
 */
export async function POST(request: Request) {
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
      const { data, error } = await supabase.functions.invoke('sync-iriscrm', {
        body: JSON.stringify({
          dataType,
          year,
          month,
          forceSync
        })
      })
      
      if (error) throw new Error(`Error invoking sync-iriscrm function: ${error.message}`)
      return data
    })
    
    // Check if we got an error response
    if (typeof functionResult === 'object' && 'success' in functionResult && !functionResult.success) {
      logError('Error invoking sync-iriscrm function', new Error(functionResult.details || 'Unknown error'))
      
      // Return a 503 Service Unavailable for API issues
      return NextResponse.json({
        success: false,
        error: 'IRIS API unavailable',
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

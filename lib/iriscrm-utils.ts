import { z } from 'zod'
import pRetry from 'p-retry'

// ==============================================================================
// Utility functions for validation and API responses
// ==============================================================================

/**
 * Validate request data against a schema
 */
export function validateRequest<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
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
export function validateResponse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> | null {
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
export function validateQueryParams<T extends z.ZodType>(
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

// Define schemas for request and response validation
export const SyncRequestSchema = z.object({
  dataType: z.enum(['merchants', 'residuals', 'volumes', 'all']).default('all'),
  year: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  forceSync: z.boolean().default(false)
});

export const SyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  details: z.any().optional(),
  syncId: z.string().optional()
});

export const SyncQueryParamsSchema = z.object({
  syncId: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional().default('10')
});

export type SyncQueryParamsOutput = {
  syncId?: string;
  limit: number;
}

// TypeScript types derived from schemas
export type SyncRequest = z.infer<typeof SyncRequestSchema>
export type SyncResponse = z.infer<typeof SyncResponseSchema>

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
export const MAX_RETRIES = parseInt(process.env.IRIS_MAX_RETRIES || '3', 10)

/**
 * Base delay in milliseconds for exponential backoff
 * - With default of 1000ms, retries will be delayed by approximately: 1s, 2s, 4s...
 * - Increase for less aggressive retries or rate-limited APIs
 * - Decrease for faster retries in development (but be cautious of rate limits)
 * Default: 1000 (1 second)
 */
export const BACKOFF_BASE_MS = parseInt(process.env.IRIS_BACKOFF_BASE_MS || '1000', 10)

/**
 * Timeout in milliseconds for HTTP requests
 * - Increase for APIs with known slow response times
 * - Decrease to fail faster when API is unresponsive
 * - Should generally align with any gateway or load balancer timeouts
 * Default: 30000 milliseconds (30 seconds)
 */
export const TIMEOUT_MS = parseInt(process.env.IRIS_TIMEOUT_MS || '30000', 10)

/**
 * Number of consecutive failures before opening the circuit breaker
 * - Increase in high-traffic environments to prevent premature circuit opening
 * - Decrease in critical systems to fail faster when API is unstable
 * Default: 5 consecutive failures
 */
export const CIRCUIT_MAX_FAILURES = parseInt(process.env.IRIS_CIRCUIT_MAX_FAILURES || '5', 10)

/**
 * Time in seconds after which to attempt to reset (close) the circuit
 * - Increase for longer cool-down periods when API issues tend to persist
 * - Decrease for faster recovery attempts in less critical systems
 * Default: 60 seconds (1 minute)
 */
export const CIRCUIT_RESET_SECONDS = parseInt(process.env.IRIS_CIRCUIT_RESET_SECONDS || '60', 10)

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
   * Call this method whenever an API call succeeds. This resets the failure
   * count and allows the circuit to close if it was open.
   */
  public recordSuccess(): void {
    this._failures = 0
    if (this._isOpen) {
      this._isOpen = false
      console.info('Circuit breaker closed after successful operation')
    }
  }

  /**
   * Check if the circuit is currently open.
   * 
   * @returns true if the circuit is open (failing), false if closed (working)
   */
  public isOpen(): boolean {
    if (!this._isOpen) return false

    // Check if enough time has passed to attempt reset
    if (this._lastFailureTime) {
      const timeSinceLastFailure = (Date.now() - this._lastFailureTime) / 1000
      if (timeSinceLastFailure >= CIRCUIT_RESET_SECONDS) {
        console.info('Attempting to close circuit breaker after timeout')
        this._isOpen = false
        this._failures = 0
        return false
      }
    }

    return true
  }

  /**
   * Execute an operation with circuit breaker protection.
   * 
   * @param operation The async operation to execute
   * @returns The result of the operation, or throws an error if circuit is open
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open - service is failing')
    }

    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }
}

/**
 * Check if an error should be retried.
 * 
 * This function determines whether an error is transient and should be retried,
 * or if it's a permanent error that should fail immediately.
 * 
 * @param error The error to check
 * @returns true if the error should be retried, false otherwise
 */
export function isRetryableError(error: any): boolean {
  // Don't retry our custom error types
  if (error instanceof FatalError) return false
  if (error instanceof RetryableError) return true

  // Don't retry authentication errors
  if (error?.status === 401 || error?.status === 403) return false

  // Don't retry client errors (4xx) except for specific cases
  if (error?.status >= 400 && error?.status < 500) {
    // Retry rate limiting (429) and some gateway errors (408, 413, 414, 415, 416, 417, 418, 421, 422, 424, 425, 426, 428, 429, 431, 451)
    if ([408, 413, 414, 415, 416, 417, 418, 421, 422, 424, 425, 426, 428, 429, 431, 451].includes(error.status)) {
      return true
    }
    return false
  }

  // Retry server errors (5xx) and network errors
  if (error?.status >= 500 || error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND') {
    return true
  }

  // Retry timeout errors
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    return true
  }

  // Default to not retrying unknown errors
  return false
}

/**
 * Execute an operation with full resilience features.
 * 
 * This function combines retry logic with circuit breaker protection to provide
 * maximum resilience for external API calls.
 * 
 * @param operation The async operation to execute
 * @returns The result of the operation or an error object
 */
export async function executeWithResilience<T>(operation: () => Promise<T>): Promise<T | { success: false, error: string, details?: string }> {
  const circuitBreaker = CircuitBreaker.getInstance()

  try {
    // Check circuit breaker first
    if (circuitBreaker.isOpen()) {
      return {
        success: false,
        error: 'Service temporarily unavailable due to repeated failures',
        details: 'Circuit breaker is open'
      }
    }

    // Execute with retry logic
    const result = await pRetry(
      async () => {
        return await circuitBreaker.execute(operation)
      },
      {
        retries: MAX_RETRIES,
        factor: 2,
        minTimeout: BACKOFF_BASE_MS,
        maxTimeout: BACKOFF_BASE_MS * Math.pow(2, MAX_RETRIES),
        onFailedAttempt: (error: any) => {
          console.warn(`Attempt ${error.attemptNumber} failed:`, error.message)
          if (error.attemptNumber === MAX_RETRIES) {
            console.error('All retry attempts failed')
          }
        }
      }
    )

    return result
  } catch (error: any) {
    console.error('Operation failed after all resilience measures:', error)
    
    return {
      success: false,
      error: 'Operation failed after maximum retry attempts',
      details: error.message || String(error)
    }
  }
} 
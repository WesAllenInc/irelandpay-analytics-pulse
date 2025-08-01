/**
 * Resilience utilities for CRM API operations.
 * Includes Circuit Breaker pattern, retry logic, and error categorization.
 */

// Configuration constants
const MAX_RETRIES = parseInt(process.env.IRIS_MAX_RETRIES || '3');
const BACKOFF_BASE_MS = parseInt(process.env.IRIS_BACKOFF_BASE_MS || '1000');
const CIRCUIT_MAX_FAILURES = parseInt(process.env.IRIS_CIRCUIT_MAX_FAILURES || '5');
const CIRCUIT_RESET_SECONDS = parseInt(process.env.IRIS_CIRCUIT_RESET_SECONDS || '60');

/**
 * Custom error types for better error handling
 */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

/**
 * Implements the Circuit Breaker pattern to prevent repeated calls to failing services.
 */
export class CircuitBreaker {
  private static _instance: CircuitBreaker | null = null;
  private _failures: number = 0;
  private _isOpen: boolean = false;
  private _lastFailureTime: number | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of CircuitBreaker
   */
  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker._instance) {
      CircuitBreaker._instance = new CircuitBreaker();
    }
    return CircuitBreaker._instance;
  }

  /**
   * Record a failure and open circuit if threshold reached.
   */
  public recordFailure(): void {
    this._failures++;
    this._lastFailureTime = Date.now();

    if (this._failures >= CIRCUIT_MAX_FAILURES) {
      if (!this._isOpen) {
        this._isOpen = true;
        console.warn(`Circuit breaker opened after ${CIRCUIT_MAX_FAILURES} failures`);
      }
    }
  }

  /**
   * Reset failure count after a successful operation.
   */
  public recordSuccess(): void {
    if (this._failures > 0) {
      console.info('Circuit breaker failure count reset after success');
      this._failures = 0;
    }
  }

  /**
   * Check if circuit is open and should reset if timeout has passed.
   */
  public isOpen(): boolean {
    if (!this._isOpen) {
      return false;
    }

    // Check if enough time has passed to attempt reset
    if (this._lastFailureTime && (Date.now() - this._lastFailureTime) > CIRCUIT_RESET_SECONDS * 1000) {
      console.info('Circuit breaker attempting reset after timeout');
      this._isOpen = false;
      this._failures = 0;
      return false;
    }

    return true;
  }

  /**
   * Execute an operation with circuit breaker protection.
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new RetryableError('Circuit breaker is open - service is failing');
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}

/**
 * Check if an error should be retried.
 */
export function isRetryableError(error: any): boolean {
  // Don't retry our custom error types
  if (error instanceof FatalError) return false;
  if (error instanceof RetryableError) return true;

  // Don't retry authentication errors
  if (error?.status === 401 || error?.status === 403) return false;

  // Don't retry client errors (4xx) except for specific cases
  if (error?.status >= 400 && error?.status < 500) {
    // Retry rate limiting (429) and some gateway errors
    if ([408, 413, 414, 415, 416, 417, 418, 421, 422, 424, 425, 426, 428, 429, 431, 451].includes(error.status)) {
      return true;
    }
    return false;
  }

  // Retry server errors (5xx) and network errors
  if (error?.status >= 500 || error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND') {
    return true;
  }

  // Retry timeout errors
  if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
    return true;
  }

  // Default to not retrying unknown errors
  return false;
}

/**
 * Simple exponential backoff delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an operation with full resilience features.
 */
export async function executeWithResilience<T>(
  operation: () => Promise<T>
): Promise<T | { success: false; error: string; details?: string }> {
  const circuitBreaker = CircuitBreaker.getInstance();

  try {
    // Check circuit breaker first
    if (circuitBreaker.isOpen()) {
      return {
        success: false,
        error: 'Service temporarily unavailable due to repeated failures',
        details: 'Circuit breaker is open'
      };
    }

    // Execute with retry logic
    let lastError: any;
    
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const result = await circuitBreaker.execute(operation);
        return result;
      } catch (error: any) {
        lastError = error;
        
        // If it's not retryable or this is the last attempt, break
        if (!isRetryableError(error) || attempt === MAX_RETRIES + 1) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delayMs = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delayMs}ms...`);
        
        await delay(delayMs);
      }
    }

    // If we get here, all retries failed
    console.error('All retry attempts failed');
    throw lastError;
    
  } catch (error: any) {
    console.error('Operation failed after all resilience measures:', error);
    
    return {
      success: false,
      error: 'Operation failed after maximum retry attempts',
      details: error.message || String(error)
    };
  }
} 
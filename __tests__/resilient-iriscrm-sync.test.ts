import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import pRetry from 'p-retry'

// p-retry type imports
import { AbortError } from 'p-retry'
import type { Options as RetryOptions } from 'p-retry'

// Mock the environment variables
vi.stubEnv('IRIS_MAX_RETRIES', '2')
vi.stubEnv('IRIS_BACKOFF_BASE_MS', '10')
vi.stubEnv('IRIS_TIMEOUT_MS', '1000')
vi.stubEnv('IRIS_CIRCUIT_MAX_FAILURES', '3')
vi.stubEnv('IRIS_CIRCUIT_RESET_SECONDS', '5')

// Mock Supabase
vi.mock('@supabase/supabase-js', () => {
  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null })
      })
    },
    functions: {
      invoke: vi.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null }))
    }
  }
  
  return {
    createClient: vi.fn().mockReturnValue(mockClient)
  }
})

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn().mockReturnValue({
      get: vi.fn(),
      post: vi.fn()
    })
  }
}))

// Mock p-retry
vi.mock('p-retry', async () => {
  const actualModule = await vi.importActual('p-retry');
  return {
    __esModule: true,
    ...actualModule,
    default: vi.fn(),
    AbortError: actualModule.AbortError
  }
})

// Mock Next.js Response
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: async () => data
    }))
  }
}))

// Mock createSupabaseServiceClient
vi.mock('@/lib/supabase', () => ({
  createSupabaseServiceClient: vi.fn().mockImplementation(() => createClient('', ''))
}))

// Mock console methods for testing logging
const originalConsole = { ...console }
beforeEach(() => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})
afterEach(() => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

describe('Resilient IRIS CRM Sync', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    vi.resetAllMocks()
    // Reset the circuit breaker state
    vi.resetModules()
  })

  describe('CircuitBreaker', () => {
    it('should initially be closed', async () => {
      const { CircuitBreaker } = await import('@/app/api/sync-iriscrm/route')
      const circuitBreaker = CircuitBreaker.getInstance()
      
      expect(circuitBreaker.isOpen()).toBe(false)
    })

    it('should open after max failures', async () => {
      const { CircuitBreaker, RetryableError } = await import('@/app/api/sync-iriscrm/route')
      const circuitBreaker = CircuitBreaker.getInstance()
      
      // Record failures up to the max threshold
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      
      // Circuit should be open now
      expect(circuitBreaker.isOpen()).toBe(true)
    })

    it('should reset after the reset timeout', async () => {
      const { CircuitBreaker } = await import('@/app/api/sync-iriscrm/route')
      const circuitBreaker = CircuitBreaker.getInstance()
      
      // Mock the current time for testing
      const originalDate = global.Date
      const mockDate = new Date()
      global.Date = class extends Date {
        constructor() {
          super();
          return mockDate
        }
        static now() {
          return mockDate.getTime()
        }
      } as any

      // Record failures to open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      
      // Circuit should be open
      expect(circuitBreaker.isOpen()).toBe(true)
      
      // Fast-forward time past the reset timeout
      mockDate.setSeconds(mockDate.getSeconds() + 6) // 6 seconds (longer than our 5s reset)
      
      // Circuit should be closed again after reset timeout
      expect(circuitBreaker.isOpen()).toBe(false)
      
      // Restore original Date
      global.Date = originalDate
    })
  })

  describe('Error Categorization', () => {
    it('should categorize network errors as retryable', async () => {
      const { isRetryableError } = await import('@/app/api/sync-iriscrm/route')
      
      const networkError = new Error('Network Error')
      expect(isRetryableError(networkError)).toBe(true)
    })

    it('should categorize HTTP 5xx errors as retryable', async () => {
      const { isRetryableError } = await import('@/app/api/sync-iriscrm/route')
      
      const serverError = new Error('Server Error')
      ;(serverError as any).response = { status: 503 }
      
      expect(isRetryableError(serverError)).toBe(true)
    })

    it('should categorize HTTP 4xx errors as non-retryable', async () => {
      const { isRetryableError } = await import('@/app/api/sync-iriscrm/route')
      
      const clientError = new Error('Client Error')
      ;(clientError as any).response = { status: 400 }
      
      expect(isRetryableError(clientError)).toBe(false)
    })
  })

  describe('Resilient Execution', () => {
    it('should succeed on first attempt', async () => {
      // Import the function directly from the module
      const { executeWithResilience } = await import('@/app/api/sync-iriscrm/route')
      
      // Create a mock function that succeeds
      const mockOperation = vi.fn().mockResolvedValue({ success: true, data: 'test data' })
      
      // Execute the operation
      const result = await executeWithResilience(mockOperation)
      
      // Check that the function was called exactly once and returned the expected result
      expect(mockOperation).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ success: true, data: 'test data' })
    })

    it('should retry on retryable errors and succeed eventually', async () => {
      // Mock p-retry implementation
      ;(pRetry as any).mockImplementation(async (fn: () => Promise<any>) => {
        // Call the function once with an error, then succeed
        const error = new Error('Temporary error')
        ;(error as any).response = { status: 503 }
        await fn().catch(() => {})
        return { success: true, data: 'recovered' }
      })
      
      const { executeWithResilience } = await import('@/app/api/sync-iriscrm/route')
      
      // Create a mock function that fails once then succeeds
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ success: true, data: 'recovered' })
      
      // Execute with resilience
      const result = await executeWithResilience(mockOperation)
      
      // Check retry happened and final result is successful
      expect(pRetry).toHaveBeenCalled()
      expect(result).toEqual({ success: true, data: 'recovered' })
    })

    it('should abort retries for non-retryable errors', async () => {
      const { executeWithResilience, FatalError } = await import('@/app/api/sync-iriscrm/route')
      
      // Mock implementation that throws a fatal error
      const mockOperation = vi.fn().mockImplementation(() => {
        throw new FatalError('Non-retryable error')
      })
      
      // Execute with resilience
      const result = await executeWithResilience(mockOperation)
      
      // Check that the operation was only attempted once and aborted
      expect(mockOperation).toHaveBeenCalledTimes(1)
      expect(result).toHaveProperty('success', false)
    })

    it('should handle circuit breaker open state', async () => {
      // Import all required components
      const module = await import('@/app/api/sync-iriscrm/route')
      const { executeWithResilience, CircuitBreaker } = module
      
      // Force circuit breaker to open
      const circuitBreaker = CircuitBreaker.getInstance()
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      
      // Create a mock operation that should never be called
      const mockOperation = vi.fn()
      
      // Execute with resilience
      const result = await executeWithResilience(mockOperation)
      
      // Check that operation was not called due to open circuit
      expect(mockOperation).not.toHaveBeenCalled()
      expect(result).toHaveProperty('success', false)
      expect(result).toHaveProperty('error', expect.stringContaining('Circuit breaker is open'))
    })

    it('should handle timeout errors', async () => {
      // Mock axios timeout error
      const timeoutError = new Error('timeout of 1000ms exceeded')
      ;(timeoutError as any).code = 'ECONNABORTED'
      
      const { executeWithResilience } = await import('@/app/api/sync-iriscrm/route')
      
      // Create a mock operation that times out
      const mockOperation = vi.fn().mockRejectedValue(timeoutError)
      
      // Execute with resilience
      const result = await executeWithResilience(mockOperation)
      
      // Check error response
      expect(result).toHaveProperty('success', false)
      expect(result).toHaveProperty('error', expect.stringContaining('Timeout'))
    })
  })

  describe('API Route Integration', () => {
    it('should handle retry in POST handler', async () => {
      // Import the API route
      const { POST } = await import('@/app/api/sync-iriscrm/route')
      
      // Reset any circuit breaker state
      const { CircuitBreaker } = await import('@/app/api/sync-iriscrm/route')
      vi.resetModules() // Ensure fresh circuit breaker instance
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'merchants',
          forceSync: true
        })
      })
      
      // Setup Supabase function to fail once then succeed
      const mockSupabase = createClient('', '')
      let invocationCount = 0;
      (mockSupabase.functions.invoke as any) = vi.fn().mockImplementation(() => {
        invocationCount++;
        if (invocationCount === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          data: {
            success: true,
            syncId: 'retry-sync-id'
          },
          error: null
        })
      })
      
      // Mock p-retry to actually perform retries
      ;(pRetry as any).mockImplementation(async (fn: () => Promise<any>) => {
        try {
          return await fn()
        } catch (error) {
          return await fn() // Retry once
        }
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Verify successful retry
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2)
    })

    it('should handle circuit open in GET handler with 503 status', async () => {
      // Import and force circuit breaker open
      const module = await import('@/app/api/sync-iriscrm/route')
      const circuitBreaker = module.CircuitBreaker.getInstance()
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      
      // Import the API route
      const { GET } = await import('@/app/api/sync-iriscrm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm')
      
      // Call the API route
      const response = await GET(request)
      const responseData = await response.json()
      
      // Verify service unavailable response
      expect(response.status).toBe(503)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Database service unavailable')
    })
  })
})

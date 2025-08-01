import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

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

// Mock Next.js Response
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: async () => data
    }))
  }
}))

// Mock the new modular imports
vi.mock('@lib/supabase-client', () => ({
  makeSupabaseServerClient: vi.fn().mockImplementation(() => createClient('', ''))
}))

vi.mock('@crm/resilience', () => ({
  executeWithResilience: vi.fn().mockImplementation(async (operation) => {
    try {
      return await operation();
    } catch (error) {
      return {
        success: false,
        error: 'Operation failed',
        details: error.message
      };
    }
  }),
  CircuitBreaker: {
    getInstance: vi.fn().mockReturnValue({
      isOpen: vi.fn().mockReturnValue(false),
      recordFailure: vi.fn(),
      recordSuccess: vi.fn(),
      execute: vi.fn().mockImplementation(async (operation) => {
        return await operation();
      })
    })
  },
  RetryableError: class RetryableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RetryableError';
    }
  },
  FatalError: class FatalError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FatalError';
    }
  },
  isRetryableError: vi.fn().mockReturnValue(true)
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

  describe('API Route Integration', () => {
    it('should handle successful POST request', async () => {
      // Import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'merchants',
          forceSync: true
        })
      })
      
      // Setup Supabase function to succeed
      const mockSupabase = createClient('', '')
      ;(mockSupabase.functions.invoke as any) = vi.fn().mockResolvedValue({
        data: {
          success: true,
          syncId: 'test-sync-id'
        },
        error: null
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Verify successful response
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('should handle successful GET request', async () => {
      // Import the API route
      const { GET } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm')
      
      // Setup Supabase query to return data
      const mockSupabase = createClient('', '')
      ;(mockSupabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: '1', status: 'completed' }],
              error: null
            })
          })
        })
      })
      
      // Call the API route
      const response = await GET(request)
      const responseData = await response.json()
      
      // Verify successful response
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('should handle invalid request format', async () => {
      // Import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request with invalid body
      const request = new Request('http://localhost:3000/api/sync-iriscrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invalidField: 'invalid'
        })
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Verify error response
      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })

    it('should handle sync already in progress', async () => {
      // Import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'merchants',
          forceSync: false
        })
      })
      
      // Setup Supabase to return in-progress sync
      const mockSupabase = createClient('', '')
      ;(mockSupabase.from as any) = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: '1', status: 'in_progress' }],
                error: null
              })
            })
          })
        })
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Verify conflict response
      expect(response.status).toBe(409)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('already in progress')
    })
  })
})

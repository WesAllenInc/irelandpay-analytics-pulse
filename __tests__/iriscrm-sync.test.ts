import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

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
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
    }
  }
  
  return {
    createClient: vi.fn().mockReturnValue(mockClient)
  }
})

// Mock fetch
global.fetch = vi.fn()

// Mock createSupabaseServiceClient
vi.mock('@/lib/supabase', () => ({
  createSupabaseServiceClient: vi.fn().mockImplementation(() => createClient('', ''))
}))

describe('IRIS CRM Sync API', () => {
  // Set up mocks before each test
  beforeEach(() => {
    vi.resetAllMocks()
    
    // Mock successful fetch response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Sync started successfully',
        details: {
          syncId: 'mock-sync-id'
        }
      })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/sync-irelandpay-crm', () => {
    it('should start a new sync operation', async () => {
      // Dynamically import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request with sync options
      const request = new Request('http://localhost:3000/api/sync-irelandpay-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'all',
          year: 2025,
          month: 7
        })
      })
      
      // Mock Supabase response for sync status check
      const mockSupabase = createClient('', '')
      mockSupabase.from('sync_status').select().eq().order().limit().execute.mockResolvedValueOnce({
        data: [], // No in-progress syncs
        error: null
      })
      
      // Mock functions invoke call
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Sync started successfully',
          syncId: 'mock-sync-id'
        },
        error: null
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('Successfully started all sync operation')
      expect(mockSupabase.from).toHaveBeenCalledWith('sync_status')
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('sync-iriscrm', {
        body: expect.any(String)
      })
    })

    it('should return conflict error if a sync is already in progress', async () => {
      // Dynamically import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-irelandpay-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType: 'merchants' })
      })
      
      // Mock an existing in-progress sync
      const mockSupabase = createClient('', '')
      mockSupabase.from('sync_status').select().eq().order().limit().execute.mockResolvedValueOnce({
        data: [{
          id: 'in-progress-sync-id',
          status: 'in_progress',
          data_type: 'merchants',
          started_at: new Date().toISOString()
        }],
        error: null
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(409) // Conflict status
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('A sync operation is already in progress')
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled()
    })

    it('should force sync even if one is already in progress when forceSync=true', async () => {
      // Dynamically import the API route
      const { POST } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request with forceSync option
      const request = new Request('http://localhost:3000/api/sync-irelandpay-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'residuals',
          forceSync: true
        })
      })
      
      // Mock Supabase responses
      const mockSupabase = createClient('', '')
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          syncId: 'forced-sync-id'
        },
        error: null
      })
      
      // Call the API route
      const response = await POST(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('sync-iriscrm', {
        body: expect.stringContaining('forceSync')
      })
    })
  })

  describe('GET /api/sync-iriscrm', () => {
    it('should fetch sync status history', async () => {
      // Dynamically import the API route
      const { GET } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm')
      
      // Mock sync history data
      const mockSyncHistory = [
        {
          id: 'sync-1',
          status: 'completed',
          data_type: 'all',
          started_at: '2025-07-01T12:00:00Z',
          completed_at: '2025-07-01T12:05:00Z',
          results: { merchants: { total_merchants: 150 }, residuals: { total_residuals: 300 } }
        },
        {
          id: 'sync-2',
          status: 'failed',
          data_type: 'merchants',
          started_at: '2025-06-30T08:00:00Z',
          completed_at: '2025-06-30T08:01:00Z',
          error: 'API request failed'
        }
      ]
      
      // Mock Supabase response
      const mockSupabase = createClient('', '')
      mockSupabase.from('sync_status').select().order().limit().execute.mockResolvedValueOnce({
        data: mockSyncHistory,
        error: null
      })
      
      // Call the API route
      const response = await GET(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockSyncHistory)
      expect(mockSupabase.from).toHaveBeenCalledWith('sync_status')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should fetch specific sync status by ID', async () => {
      // Dynamically import the API route
      const { GET } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request with syncId parameter
      const request = new Request('http://localhost:3000/api/sync-iriscrm?syncId=specific-sync-id')
      
      // Mock specific sync data
      const mockSyncData = {
        id: 'specific-sync-id',
        status: 'completed',
        data_type: 'residuals',
        started_at: '2025-07-02T10:00:00Z',
        completed_at: '2025-07-02T10:03:00Z',
        results: { residuals: { total_residuals: 250 } }
      }
      
      // Mock Supabase response
      const mockSupabase = createClient('', '')
      mockSupabase.from('sync_status').select().eq().order().limit().execute.mockResolvedValueOnce({
        data: [mockSyncData],
        error: null
      })
      
      // Call the API route
      const response = await GET(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual([mockSyncData])
      expect(mockSupabase.from).toHaveBeenCalledWith('sync_status')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'specific-sync-id')
    })

    it('should handle errors when fetching sync status', async () => {
      // Dynamically import the API route
      const { GET } = await import('@/app/api/sync-irelandpay-crm/route')
      
      // Mock request
      const request = new Request('http://localhost:3000/api/sync-iriscrm')
      
      // Mock Supabase error
      const mockSupabase = createClient('', '')
      mockSupabase.from('sync_status').select().order().limit().execute.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error occurred' }
      })
      
      // Call the API route
      const response = await GET(request)
      const responseData = await response.json()
      
      // Assertions
      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Failed to fetch sync status')
    })
  })
})

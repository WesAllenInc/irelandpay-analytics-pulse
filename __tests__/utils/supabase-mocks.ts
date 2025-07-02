/**
 * Supabase mock utilities for testing
 * Provides mock implementations of Supabase client functions
 */

import { vi } from 'vitest';

/**
 * Creates a mock Supabase response
 * @param data The data to include in the response
 * @param error The error to include in the response (if any)
 */
export function mockSupabaseResponse<T>(data: T | null = null, error: Error | null = null) {
  return { data, error };
}

/**
 * Creates a mock Supabase client with configurable responses
 * @param mockResponses Optional mock responses for specific queries
 */
export function createMockSupabaseClient(mockResponses: Record<string, any> = {}) {
  // Default mock data
  const defaultMockData = {
    // Auth mocks
    auth: {
      getUser: vi.fn().mockResolvedValue(mockResponses.getUser || { 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null 
      }),
      signIn: vi.fn().mockResolvedValue(mockResponses.signIn || { data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue(mockResponses.signOut || { error: null }),
    },
    
    // Query builder mocks with chainable methods
    from: vi.fn().mockImplementation((table) => {
      // Use table-specific mocks if provided, otherwise use default
      const tableMocks = mockResponses[table] || {};
      
      return {
        select: vi.fn().mockImplementation((selection) => ({
          eq: vi.fn().mockImplementation((column, value) => ({
            single: vi.fn().mockResolvedValue(tableMocks.single || { data: null, error: null }),
            limit: vi.fn().mockImplementation((limit) => ({
              order: vi.fn().mockImplementation((column, options) => ({
                data: tableMocks.data || [],
                error: tableMocks.error || null
              })),
              data: tableMocks.data || [],
              error: tableMocks.error || null
            })),
            data: tableMocks.data || [],
            error: tableMocks.error || null
          })),
          gte: vi.fn().mockImplementation((column, value) => ({
            lte: vi.fn().mockImplementation((column, value) => ({
              data: tableMocks.data || [],
              error: tableMocks.error || null
            })),
            data: tableMocks.data || [],
            error: tableMocks.error || null
          })),
          filter: vi.fn().mockImplementation((column, operator, value) => ({
            data: tableMocks.data || [],
            error: tableMocks.error || null
          })),
          order: vi.fn().mockImplementation((column, options) => ({
            data: tableMocks.data || [],
            error: tableMocks.error || null
          })),
          limit: vi.fn().mockImplementation((limit) => ({
            data: tableMocks.data || [],
            error: tableMocks.error || null
          })),
          data: tableMocks.data || [],
          error: tableMocks.error || null
        })),
        insert: vi.fn().mockImplementation((data) => ({
          select: vi.fn().mockImplementation((selection) => ({
            data: tableMocks.insertData || data,
            error: tableMocks.insertError || null
          })),
          data: tableMocks.insertData || data,
          error: tableMocks.insertError || null
        })),
        update: vi.fn().mockImplementation((data) => ({
          eq: vi.fn().mockImplementation((column, value) => ({
            data: tableMocks.updateData || data,
            error: tableMocks.updateError || null
          })),
          data: tableMocks.updateData || data,
          error: tableMocks.updateError || null
        })),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation((column, value) => ({
            data: tableMocks.deleteData || null,
            error: tableMocks.deleteError || null
          })),
          data: tableMocks.deleteData || null,
          error: tableMocks.deleteError || null
        })),
      };
    }),
    
    // Storage mocks with more comprehensive bucket operations
    storage: {
      from: vi.fn().mockImplementation((bucket) => ({
        upload: vi.fn().mockResolvedValue(mockResponses.upload || { data: { path: `${bucket}/file.xlsx` }, error: null }),
        download: vi.fn().mockResolvedValue(mockResponses.download || { data: new Blob(), error: null }),
        list: vi.fn().mockResolvedValue(mockResponses.list || { data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: `https://mock-url.com/${bucket}/file.xlsx` } }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: `https://mock-url.com/${bucket}/signed/file.xlsx` }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
        move: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
      createBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
      getBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: 'uploads', id: 'uploads' }], error: null }),
      updateBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
      emptyBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
      deleteBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  };
  
  return defaultMockData;
}

/**
 * Sample merchant data for tests
 */
export const sampleMerchantData = {
  merchants: [
    {
      id: 'm1',
      merchant_id: '12345',
      dba_name: 'Merchant One',
      processor: 'Stripe',
      merchant_processing_volumes: [
        { gross_volume: 100000, processing_month: '2025-06-01' },
        { gross_volume: 120000, processing_month: '2025-05-01' },
      ],
      residuals: [
        { net_residual: 1500, final_residual: 1200, agent_bps: 120, processing_month: '2025-06-01' },
        { net_residual: 1800, final_residual: 1440, agent_bps: 120, processing_month: '2025-05-01' },
      ]
    },
    {
      id: 'm2',
      merchant_id: '67890',
      dba_name: 'Merchant Two',
      processor: 'Square',
      merchant_processing_volumes: [
        { gross_volume: 50000, processing_month: '2025-06-01' },
        { gross_volume: 45000, processing_month: '2025-05-01' },
      ],
      residuals: [
        { net_residual: 750, final_residual: 600, agent_bps: 120, processing_month: '2025-06-01' },
        { net_residual: 675, final_residual: 540, agent_bps: 120, processing_month: '2025-05-01' },
      ]
    }
  ]
};

/**
 * Sample agent data for tests
 */
export const sampleAgentData = {
  id: 'a1',
  agent_id: 'AG001',
  agent_name: 'Test Agent',
  email: 'test@example.com',
  status: 'active',
  created_at: '2024-01-01T00:00:00.000Z',
};

/**
 * Sample volume trend data for tests
 */
export const sampleVolumeTrend = [
  { 
    processing_month: '2025-07-01',
    gross_volume: 150000, 
    merchant: { agent_id: 'a1' } 
  },
  { 
    processing_month: '2025-06-01',
    gross_volume: 140000, 
    merchant: { agent_id: 'a1' } 
  },
  { 
    processing_month: '2025-05-01',
    gross_volume: 130000, 
    merchant: { agent_id: 'a1' } 
  }
];

/**
 * Helper to mock createSupabaseBrowserClient
 */
export const mockCreateSupabaseBrowserClient = (mockClient: any) => {
  vi.mock('@/lib/supabase', () => ({
    createSupabaseBrowserClient: vi.fn().mockReturnValue(mockClient)
  }));
};

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  vi.resetAllMocks();
}

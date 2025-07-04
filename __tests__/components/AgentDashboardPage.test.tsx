import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentDashboardPage from '@/app/agent/page';
import { sampleAgentData, sampleMerchantData, sampleVolumeTrend } from '../utils/supabase-mocks';
import { act } from 'react-dom/test-utils';

// Mock the components used inside AgentDashboardPage
vi.mock('@/components/agent/AgentVolumeChart', () => ({
  default: () => <div data-testid="mock-volume-chart">Volume Chart</div>,
}));

vi.mock('@/components/agent/AgentMerchantTable', () => ({
  default: ({ merchants }: { merchants: any[] }) => (
    <div data-testid="mock-merchant-table">
      Merchant Table with {merchants.length} merchants
    </div>
  ),
}));

// Mock date-fns format function to return consistent date strings
vi.mock('date-fns', () => ({
  format: vi.fn().mockImplementation((date, formatString) => {
    if (formatString === 'yyyy-MM') return '2025-07';
    if (formatString === 'yyyy-MM-dd') return '2025-04-01';
    return '2025-07-01';
  }),
}));

// Define a mock Supabase client using vi.hoisted to ensure it's initialized before vi.mock runs
const mockSupabaseClient = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  storage: {
    from: vi.fn()
  }
}));

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  createSupabaseBrowserClient: vi.fn().mockReturnValue(mockSupabaseClient)
}));

// Mock console.error to avoid test output pollution
vi.spyOn(console, 'error').mockImplementation(() => {});




describe('AgentDashboardPage Component', () => {
  // Helper to create mock responses for different test cases
  function setupMockResponses(overrides = {}) {
    // Default data
    const defaultData = {
      getUser: { data: { user: { email: 'test@example.com' } }, error: null },
      agents: {
        data: sampleAgentData,
        error: null
      },
      merchants: {
        data: sampleMerchantData.merchants,
        error: null
      },
      volumeTrend: {
        data: sampleVolumeTrend,
        error: null
      }
    };

    // Override defaults with any test-specific data
    const mockData = { ...defaultData, ...overrides };
    
    // Reset all mocks before setting up new ones
    vi.clearAllMocks();
    
    // Setup the auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue(mockData.getUser);
    
    // Setup the database query builder mocks with chainable methods
    mockSupabaseClient.from.mockImplementation((table) => {
      // Agent query mocks
      if (table === 'agents') {
        const selectFn = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockData.agents)
          })
        });
        return { select: selectFn };
      }
      
      // Merchant query mocks
      if (table === 'merchants') {
        const selectFn = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockData.merchants)
        });
        return { select: selectFn };
      }
      
      // Volume trend query mocks
      if (table === 'merchant_processing_volumes') {
        const selectFn = vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockData.volumeTrend)
          })
        });
        return { select: selectFn };
      }
      
      // Default fallback for any other tables
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };
    });
    
    // Setup the storage mock
    mockSupabaseClient.storage.from.mockImplementation((bucket) => ({
      upload: vi.fn().mockResolvedValue({ data: { path: `${bucket}/file.xlsx` }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: `https://mock-url.com/${bucket}/file.xlsx` } })
    }));
  }

  beforeEach(() => {
    // Setup the default mock responses
    setupMockResponses();
    
    // Reset all timers
    vi.useFakeTimers({ now: new Date('2025-07-15') });
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders loading state initially', async () => {
    await act(async () => {
      render(<AgentDashboardPage />);
    });
    expect(screen.getByText('Loading agent data...')).toBeInTheDocument();
  });

  it('renders error state when agent data is not found', async () => {
    setupMockResponses({
      agents: {
        data: null,
        error: { message: 'Agent not found' }
      }
    });
    
    await act(async () => {
      render(<AgentDashboardPage />);
    });

    // Force effect to run
    await act(async () => {
      // Allow all pending promises to resolve
      await Promise.resolve();
      // Advance timers if there are any setTimeout/setInterval
      vi.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/No Agent Data Found/i)).toBeInTheDocument();
      expect(screen.getByText(/Please contact an administrator/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders dashboard with agent data when data is loaded successfully', async () => {
    // Make sure we have valid successful response data
    setupMockResponses({
      agents: {
        data: { ...sampleAgentData, name: 'Test Agent' },
        error: null
      },
      merchants: {
        data: sampleMerchantData.merchants,
        error: null
      },
      volumeTrend: {
        data: sampleVolumeTrend,
        error: null
      }
    });
    
    await act(async () => {
      render(<AgentDashboardPage />);
    });

    // Force effect to run completely
    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
    });

    await waitFor(() => {
      // Check that the main components are rendered
      expect(screen.getByText(/Agent Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Agent/i)).toBeInTheDocument();
      expect(screen.getByTestId('mock-merchant-table')).toBeInTheDocument();
      expect(screen.getByTestId('mock-volume-chart')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles error when fetching merchant data', async () => {
    setupMockResponses({
      merchants: { data: null, error: { message: 'Failed to fetch merchant data' } }
    });
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await act(async () => {
      render(<AgentDashboardPage />);
    });

    // Force effect to run completely
    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching merchant data:',
        expect.objectContaining({ message: 'Failed to fetch merchant data' })
      );
      expect(screen.getByText(/Error loading merchant data/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    consoleSpy.mockRestore();
  });

  it('handles error when fetching volume trend data', async () => {
    setupMockResponses({
      volumeTrend: { data: null, error: { message: 'Failed to fetch volume data' } }
    });
    
    // Spy on console.error to verify it's called
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Use act to properly handle async state updates
    await act(async () => {
      render(<AgentDashboardPage />);
    });
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching volume trend:', 
        expect.objectContaining({ message: 'Failed to fetch volume data' })
      );
      // Dashboard should still render without volume trend data
      expect(screen.getByText(/Agent Dashboard/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    consoleSpy.mockRestore();
  });

  it('calculates forecasted values correctly based on day of month', async () => {
    setupMockResponses();
    
    // Use act to properly handle async state updates
    await act(async () => {
      render(<AgentDashboardPage />);
    });
    
    await waitFor(() => {
      // On July 15th (day 15 of 31), forecasted values should be approximately 2x MTD values
      const mtdVolumeText = screen.getByText(/\$150,000/i);
      const forecastVolumeText = screen.getByText(/Forecast: \$310,000/i);
      
      expect(mtdVolumeText).toBeInTheDocument();
      expect(forecastVolumeText).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('formats merchant table data correctly', async () => {
    setupMockResponses();
    
    // Use act to properly handle async state updates
    await act(async () => {
      render(<AgentDashboardPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-merchant-table')).toHaveTextContent('Merchant Table with 2 merchants');
    }, { timeout: 2000 });
  });
});

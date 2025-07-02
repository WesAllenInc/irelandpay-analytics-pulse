import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentMerchantTable from '@/components/agent/AgentMerchantTable';

// Mock sample merchant data
const sampleMerchants = [
  {
    merchantName: 'Merchant One',
    volume: 10000,
    agentBps: 120,
    residualEarned: 1200,
    forecastedVolume: 20000,
    forecastedResidual: 2400
  },
  {
    merchantName: 'Merchant Two',
    volume: 5000,
    agentBps: 100,
    residualEarned: 500,
    forecastedVolume: 10000,
    forecastedResidual: 1000
  },
  {
    merchantName: 'Another Business',
    volume: 15000,
    agentBps: 150,
    residualEarned: 2250,
    forecastedVolume: 30000,
    forecastedResidual: 4500
  }
];

describe('AgentMerchantTable Component', () => {
  // Mock URL.createObjectURL and document methods for CSV export tests
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let appendChildMock: ReturnType<typeof vi.fn>;
  let removeChildMock: ReturnType<typeof vi.fn>;
  let clickMock: ReturnType<typeof vi.fn>;
  let createElement: typeof document.createElement;
  
  // Setup mocks
  beforeEach(() => {
    // Save original createElement to restore later
    createElement = document.createElement;
    
    // Mock link element and its methods
    const mockLink = {
      setAttribute: vi.fn(),
      style: {},
      click: vi.fn()
    };
    
    // Mock document methods
    document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === 'a') {
        return mockLink;
      }
      return createElement(tag);
    });
    
    clickMock = mockLink.click;
    appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
    removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body);
    createObjectURLMock = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    
    // Mock Date.prototype.toISOString for consistent filename in tests
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = vi.fn(() => '2023-07-15T12:00:00.000Z');
    
    return () => {
      Date.prototype.toISOString = originalToISOString;
    };
  });
  
  // Clean up mocks
  afterEach(() => {
    document.createElement = createElement;
    vi.restoreAllMocks();
  });
  
  it('renders the merchant table with correct data', () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Check that all merchant names are displayed
    expect(screen.getByText('Merchant One')).toBeInTheDocument();
    expect(screen.getByText('Merchant Two')).toBeInTheDocument();
    expect(screen.getByText('Another Business')).toBeInTheDocument();
    
    // Check formatted values are displayed
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('120.00')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
  });
  
  it('filters merchants based on search term', () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Initially all merchants should be visible
    expect(screen.getAllByRole('row')).toHaveLength(4); // 3 merchants + 1 header row
    
    // Search for "Merchant"
    const searchInput = screen.getByPlaceholderText('Search merchants...');
    fireEvent.change(searchInput, { target: { value: 'Merchant' } });
    
    // Now only 2 merchants should be visible (those with "Merchant" in the name)
    expect(screen.getAllByRole('row')).toHaveLength(3); // 2 merchants + 1 header row
    expect(screen.getByText('Merchant One')).toBeInTheDocument();
    expect(screen.getByText('Merchant Two')).toBeInTheDocument();
    expect(screen.queryByText('Another Business')).not.toBeInTheDocument();
    
    // Search for "Another"
    fireEvent.change(searchInput, { target: { value: 'Another' } });
    
    // Now only 1 merchant should be visible
    expect(screen.getAllByRole('row')).toHaveLength(2); // 1 merchant + 1 header row
    expect(screen.queryByText('Merchant One')).not.toBeInTheDocument();
    expect(screen.queryByText('Merchant Two')).not.toBeInTheDocument();
    expect(screen.getByText('Another Business')).toBeInTheDocument();
    
    // Search for a non-existent term
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    
    // Should show "No merchants found" message
    expect(screen.getByText('No merchants found')).toBeInTheDocument();
  });
  
  it('handles case-insensitive search correctly', () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Search with lowercase
    const searchInput = screen.getByPlaceholderText('Search merchants...');
    fireEvent.change(searchInput, { target: { value: 'merchant' } });
    
    // Should find both merchants with "Merchant" in name
    expect(screen.getAllByRole('row')).toHaveLength(3); // 2 merchants + 1 header row
    expect(screen.getByText('Merchant One')).toBeInTheDocument();
    expect(screen.getByText('Merchant Two')).toBeInTheDocument();
    
    // Search with mixed case
    fireEvent.change(searchInput, { target: { value: 'MeRcHaNt' } });
    
    // Should still find both merchants
    expect(screen.getAllByRole('row')).toHaveLength(3); // 2 merchants + 1 header row
    expect(screen.getByText('Merchant One')).toBeInTheDocument();
    expect(screen.getByText('Merchant Two')).toBeInTheDocument();
  });
  
  it('exports CSV with correct data when export button is clicked', async () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Find and click export button
    const exportButton = screen.getByText('Export').closest('button');
    expect(exportButton).not.toBeNull();
    fireEvent.click(exportButton!);
    
    // Verify CSV generation and download
    await waitFor(() => {
      // Verify Blob was created with correct content type
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURLMock.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/csv;charset=utf-8;');
      
      // Verify link was created and clicked
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(appendChildMock).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(removeChildMock).toHaveBeenCalled();
    });
  });
  
  it('exports only filtered data when search is active', async () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Apply a filter first
    const searchInput = screen.getByPlaceholderText('Search merchants...');
    fireEvent.change(searchInput, { target: { value: 'Merchant' } });
    
    // Now export with filter applied
    const exportButton = screen.getByText('Export').closest('button');
    fireEvent.click(exportButton!);
    
    // Create a spy to capture the Blob content
    const originalBlob = global.Blob;
    const mockBlob = vi.fn().mockImplementation((content) => {
      return {
        content,
        type: 'text/csv;charset=utf-8;',
        size: 0,
        slice: vi.fn()
      };
    });
    global.Blob = mockBlob as any;
    
    // Click export again with the mock in place
    fireEvent.click(exportButton!);
    
    // Check that only the filtered merchants are in the CSV
    expect(mockBlob).toHaveBeenCalled();
    const csvContent = mockBlob.mock.calls[0][0][0];
    expect(csvContent).toContain('Merchant One');
    expect(csvContent).toContain('Merchant Two');
    expect(csvContent).not.toContain('Another Business');
    
    // Restore original Blob
    global.Blob = originalBlob;
  });
  
  it('shows empty state when no merchants are provided', () => {
    render(<AgentMerchantTable merchants={[]} />);
    expect(screen.getByText('No merchants found')).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    render(<AgentMerchantTable merchants={sampleMerchants} />);
    
    // Check formatting of various currency values
    expect(screen.getByText('$10,000.00')).toBeInTheDocument(); // volume for Merchant One
    expect(screen.getByText('$5,000.00')).toBeInTheDocument(); // volume for Merchant Two
    expect(screen.getByText('$15,000.00')).toBeInTheDocument(); // volume for Another Business
    
    expect(screen.getByText('$1,200.00')).toBeInTheDocument(); // residual for Merchant One
    expect(screen.getByText('$500.00')).toBeInTheDocument(); // residual for Merchant Two
  });
});

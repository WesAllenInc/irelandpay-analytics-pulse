import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UploadExcel from '@/components/UploadExcel';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-file.xlsx' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com/test-file.xlsx' } })
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })
  }))
}));

// Mock the toast component
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

// Mock the ExcelUploadStatus component
vi.mock('@/components/ExcelUploadStatus', () => ({
  ExcelUploadStatus: vi.fn(({ onClose }) => (
    <div data-testid="excel-upload-status">
      <button data-testid="close-button" onClick={onClose}>Close</button>
    </div>
  ))
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('UploadExcel Component', () => {
  let mockFile: File;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock File object
    const blob = new Blob(['test file content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mockFile = new File([blob], 'test-file.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        merchants: 10,
        metrics: 50
      })
    });
  });

  it('renders the upload form correctly', () => {
    render(<UploadExcel />);
    
    // Check if the component renders correctly
    expect(screen.getByText(/Upload Merchant Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Excel File/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepted formats/i)).toBeInTheDocument();
  });

  it('allows selecting a file and displays file info', async () => {
    const user = userEvent.setup();
    render(<UploadExcel />);
    
    const fileInput = screen.getByLabelText(/Excel File/i);
    
    // Simulate file selection
    await user.upload(fileInput, mockFile);
    
    // Check if file info is displayed
    await waitFor(() => {
      expect(screen.getByText('test-file.xlsx')).toBeInTheDocument();
    });
  });

  it('handles merchant file upload and processing successfully', async () => {
    const user = userEvent.setup();
    render(<UploadExcel datasetType="merchants" />);
    
    // Select a file
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, mockFile);
    
    // Submit the form
    const uploadButton = screen.getByRole('button', { name: /Upload Merchant Data/i });
    await user.click(uploadButton);
    
    // Check if the upload status component is displayed
    await waitFor(() => {
      expect(screen.getByTestId('excel-upload-status')).toBeInTheDocument();
    });
    
    // Verify API call was made with correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('merchants')
        })
      );
    });
  });

  it('handles residual file upload and processing successfully', async () => {
    const user = userEvent.setup();
    render(<UploadExcel datasetType="residuals" />);
    
    // Change dataset type to residuals
    const datasetSelector = screen.getByRole('button', { name: /Merchant Data/i });
    await user.click(datasetSelector);
    await user.click(screen.getByText('Residual Data'));
    
    // Select a file
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, mockFile);
    
    // Submit the form
    const uploadButton = screen.getByRole('button', { name: /Upload Residual Data/i });
    await user.click(uploadButton);
    
    // Check if the upload status component is displayed
    await waitFor(() => {
      expect(screen.getByTestId('excel-upload-status')).toBeInTheDocument();
    });
    
    // Verify API call was made with correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('residuals')
        })
      );
    });
  });

  it('handles upload errors correctly', async () => {
    // Mock an error response from the API
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockResolvedValue({
        error: 'Failed to process file'
      })
    });
    
    const user = userEvent.setup();
    render(<UploadExcel />);
    
    // Select a file
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, mockFile);
    
    // Submit the form
    const uploadButton = screen.getByRole('button', { name: /Upload Merchant Data/i });
    await user.click(uploadButton);
    
    // Check if the upload status component is displayed with error state
    await waitFor(() => {
      expect(screen.getByTestId('excel-upload-status')).toBeInTheDocument();
    });
  });

  it('validates file size before upload', async () => {
    const user = userEvent.setup();
    render(<UploadExcel />);
    
    // Create a mock large file (11MB)
    const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const largeFile = new File([largeBlob], 'large-file.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Select the large file
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, largeFile);
    
    // Submit the form
    const uploadButton = screen.getByRole('button', { name: /Upload Merchant Data/i });
    await user.click(uploadButton);
    
    // Check if the toast was called with an error message
    const { useToast } = await import('@/components/ui/use-toast');
    await waitFor(() => {
      expect(useToast().toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File Too Large',
          variant: 'destructive'
        })
      );
    });
    
    // Verify that the API was not called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('validates file format before upload', async () => {
    const user = userEvent.setup();
    render(<UploadExcel />);
    
    // Create a mock file with invalid extension
    const invalidBlob = new Blob(['test content'], { type: 'text/plain' });
    const invalidFile = new File([invalidBlob], 'test-file.txt', { type: 'text/plain' });
    
    // Select the invalid file
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, invalidFile);
    
    // Submit the form
    const uploadButton = screen.getByRole('button', { name: /Upload Merchant Data/i });
    await user.click(uploadButton);
    
    // Verify that the API was not called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows closing the upload status', async () => {
    const user = userEvent.setup();
    render(<UploadExcel />);
    
    // Select a file and submit
    const fileInput = screen.getByLabelText(/Excel File/i);
    await user.upload(fileInput, mockFile);
    
    const uploadButton = screen.getByRole('button', { name: /Upload Merchant Data/i });
    await user.click(uploadButton);
    
    // Wait for the upload status to appear
    await waitFor(() => {
      expect(screen.getByTestId('excel-upload-status')).toBeInTheDocument();
    });
    
    // Click the close button
    const closeButton = screen.getByTestId('close-button');
    await user.click(closeButton);
    
    // Check if the upload status is removed
    await waitFor(() => {
      expect(screen.queryByTestId('excel-upload-status')).not.toBeInTheDocument();
    });
  });
});

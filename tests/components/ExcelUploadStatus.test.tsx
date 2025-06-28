import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ExcelUploadStatus } from '@/components/ExcelUploadStatus';

// Mock the toast component
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

describe('ExcelUploadStatus Component', () => {
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('renders uploading state correctly', () => {
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50} // 50KB
        uploadProgress={45}
        status="uploading"
        datasetType="merchants"
        onClose={mockOnClose}
      />
    );
    
    // Check if the component renders correctly
    expect(screen.getByText(/Merchant Data Upload/i)).toBeInTheDocument();
    expect(screen.getByText('test-file.xlsx')).toBeInTheDocument();
    expect(screen.getByText('50.00 KB')).toBeInTheDocument();
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    
    // Check if progress bar is rendered
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders processing state correctly', () => {
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50}
        status="processing"
        datasetType="merchants"
        onClose={mockOnClose}
      />
    );
    
    // Check if the component renders correctly
    expect(screen.getByText(/Processing Excel Data/i)).toBeInTheDocument();
    expect(screen.getByText(/This may take a moment/i)).toBeInTheDocument();
  });

  it('renders success state for merchant data correctly', async () => {
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50}
        status="success"
        datasetType="merchants"
        processingResult={{
          merchants: 10,
          metrics: 50
        }}
        onClose={mockOnClose}
      />
    );
    
    // Check if the component renders correctly
    expect(screen.getByText(/Upload Successful/i)).toBeInTheDocument();
    expect(screen.getByText(/Successfully processed:/i)).toBeInTheDocument();
    expect(screen.getByText(/10 merchants/i)).toBeInTheDocument();
    expect(screen.getByText(/50 transaction metrics/i)).toBeInTheDocument();
    
    // Verify toast was called
    const { useToast } = await import('@/components/ui/use-toast');
    expect(useToast().toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Complete',
        variant: 'success'
      })
    );
  });

  it('renders success state for residual data correctly', async () => {
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50}
        status="success"
        datasetType="residuals"
        processingResult={{
          merchants: 10,
          residuals: 30
        }}
        onClose={mockOnClose}
      />
    );
    
    // Check if the component renders correctly
    expect(screen.getByText(/Upload Successful/i)).toBeInTheDocument();
    expect(screen.getByText(/Successfully processed:/i)).toBeInTheDocument();
    expect(screen.getByText(/10 merchants/i)).toBeInTheDocument();
    expect(screen.getByText(/30 residual records/i)).toBeInTheDocument();
    
    // Verify toast was called with residual-specific message
    const { useToast } = await import('@/components/ui/use-toast');
    expect(useToast().toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Complete',
        description: expect.stringContaining('residual records')
      })
    );
  });

  it('renders error state correctly', async () => {
    const errorMessage = 'Failed to process Excel file: Invalid format';
    
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50}
        status="error"
        datasetType="merchants"
        error={errorMessage}
        onClose={mockOnClose}
      />
    );
    
    // Check if the component renders correctly
    expect(screen.getByText(/Upload Failed/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    
    // Verify toast was called with error message
    const { useToast } = await import('@/components/ui/use-toast');
    expect(useToast().toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Failed',
        variant: 'destructive'
      })
    );
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 50}
        status="success"
        datasetType="merchants"
        processingResult={{
          merchants: 10,
          metrics: 50
        }}
        onClose={mockOnClose}
      />
    );
    
    // Click the close button
    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);
    
    // Verify onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('formats file size correctly', () => {
    render(
      <ExcelUploadStatus
        fileName="test-file.xlsx"
        fileSize={1024 * 1024 * 2.5} // 2.5MB
        status="uploading"
        datasetType="merchants"
        uploadProgress={50}
        onClose={mockOnClose}
      />
    );
    
    // Check if the file size is formatted correctly
    expect(screen.getByText('2.50 MB')).toBeInTheDocument();
  });

  it('handles missing file information gracefully', () => {
    render(
      <ExcelUploadStatus
        status="processing"
        datasetType="merchants"
        onClose={mockOnClose}
      />
    );
    
    // Component should render without errors even with missing file info
    expect(screen.getByText(/Processing Excel Data/i)).toBeInTheDocument();
    
    // File name and size should not be displayed
    expect(screen.queryByText(/KB/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MB/i)).not.toBeInTheDocument();
  });
});

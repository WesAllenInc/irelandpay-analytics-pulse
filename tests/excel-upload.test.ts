import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockStorageFrom = vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test-file.xlsx' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com/test-file.xlsx' } })
  });

  const mockFrom = vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    upsert: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        execute: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  });

  return {
    createClient: vi.fn().mockReturnValue({
      storage: {
        from: mockStorageFrom
      },
      from: mockFrom
    })
  };
});

// Import the modules to test
import { processExcelFile } from '../lib/excel-processor';
import { uploadExcelToStorage } from '../lib/storage-uploader';

describe('Excel Upload Flow', () => {
  let supabase: any;
  let mockFile: File;
  
  beforeEach(() => {
    // Create a mock Supabase client
    supabase = createClient('https://test.supabase.co', 'test-key');
    
    // Create a mock File object
    const blob = new Blob(['test file content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mockFile = new File([blob], 'test-file.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  });

  describe('uploadExcelToStorage', () => {
    it('should upload an Excel file to Supabase storage', async () => {
      const result = await uploadExcelToStorage(supabase, mockFile, 'merchant');
      
      // Verify the storage.from was called with the correct bucket
      expect(supabase.storage.from).toHaveBeenCalledWith('uploads');
      
      // Verify upload was called with the file and a path
      expect(supabase.storage.from().upload).toHaveBeenCalled();
      
      // Verify the result contains the file path
      expect(result).toEqual({
        path: 'test-file.xlsx',
        url: 'https://test-url.com/test-file.xlsx'
      });
    });

    it('should handle upload errors', async () => {
      // Override the mock to simulate an error
      supabase.storage.from().upload.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Upload failed' } 
      });

      await expect(uploadExcelToStorage(supabase, mockFile, 'merchant'))
        .rejects.toThrow('Failed to upload file: Upload failed');
    });
  });

  describe('processExcelFile', () => {
    it('should process a merchant Excel file and insert data into Supabase', async () => {
      // Mock the Excel parsing function
      const mockParsedData = [
        { mid: '123456', merchant_dba: 'Test Merchant', total_volume: 1000 }
      ];
      
      vi.mock('../lib/excel-parser', () => ({
        parseExcelFile: vi.fn().mockResolvedValue(mockParsedData)
      }));

      const { parseExcelFile } = await import('../lib/excel-parser');
      
      const fileUrl = 'https://test-url.com/test-file.xlsx';
      const result = await processExcelFile(supabase, fileUrl, 'merchant');
      
      // Verify the Excel parser was called
      expect(parseExcelFile).toHaveBeenCalledWith(fileUrl, 'merchant');
      
      // Verify data was inserted into the correct table
      expect(supabase.from).toHaveBeenCalledWith('merchant_data');
      expect(supabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            mid: '123456', 
            merchant_dba: 'Test Merchant', 
            total_volume: 1000 
          })
        ]),
        { onConflict: 'mid,month' }
      );
      
      // Verify the result contains the correct counts
      expect(result).toEqual({
        processed: 1,
        errors: 0
      });
    });

    it('should process a residual Excel file and insert data into Supabase', async () => {
      // Mock the Excel parsing function
      const mockParsedData = [
        { mid: '123456', net_profit: 50, month: '2023-05' }
      ];
      
      vi.mock('../lib/excel-parser', () => ({
        parseExcelFile: vi.fn().mockResolvedValue(mockParsedData)
      }));

      const { parseExcelFile } = await import('../lib/excel-parser');
      
      const fileUrl = 'https://test-url.com/test-file.xlsx';
      const result = await processExcelFile(supabase, fileUrl, 'residual');
      
      // Verify the Excel parser was called
      expect(parseExcelFile).toHaveBeenCalledWith(fileUrl, 'residual');
      
      // Verify data was inserted into the correct table
      expect(supabase.from).toHaveBeenCalledWith('residual_data');
      expect(supabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            mid: '123456', 
            net_profit: 50,
            month: '2023-05'
          })
        ]),
        { onConflict: 'mid,month' }
      );
      
      // Verify the result contains the correct counts
      expect(result).toEqual({
        processed: 1,
        errors: 0
      });
    });

    it('should handle processing errors', async () => {
      // Mock the Excel parsing function to throw an error
      vi.mock('../lib/excel-parser', () => ({
        parseExcelFile: vi.fn().mockRejectedValue(new Error('Failed to parse Excel file'))
      }));

      const fileUrl = 'https://test-url.com/test-file.xlsx';
      
      await expect(processExcelFile(supabase, fileUrl, 'merchant'))
        .rejects.toThrow('Failed to parse Excel file');
    });
  });
});

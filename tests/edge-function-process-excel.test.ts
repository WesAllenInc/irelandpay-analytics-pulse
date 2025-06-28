import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockStorageFrom = vi.fn().mockReturnValue({
    download: vi.fn().mockResolvedValue({ data: new Uint8Array([1, 2, 3, 4]), error: null }),
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

// Mock XLSX library
vi.mock('xlsx', () => {
  return {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:D3',
          A1: { t: 's', v: 'mid' },
          B1: { t: 's', v: 'merchant_dba' },
          C1: { t: 's', v: 'total_volume' },
          D1: { t: 's', v: 'month' },
          A2: { t: 's', v: '123456' },
          B2: { t: 's', v: 'Test Merchant 1' },
          C2: { t: 'n', v: 1000 },
          D2: { t: 's', v: '2023-05' },
          A3: { t: 's', v: '789012' },
          B3: { t: 's', v: 'Test Merchant 2' },
          C3: { t: 'n', v: 2000 },
          D3: { t: 's', v: '2023-05' }
        }
      }
    }),
    utils: {
      sheet_to_json: vi.fn().mockReturnValue([
        { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
        { mid: '789012', merchant_dba: 'Test Merchant 2', total_volume: 2000, month: '2023-05' }
      ])
    }
  };
});

// Import the edge function handler (or mock it if not directly importable)
// This is a mock of what the edge function would do
async function processExcelEdgeFunction(event: any, context: any) {
  const supabase = createClient('https://test.supabase.co', 'test-key');
  const { filePath, fileType } = JSON.parse(event.body);
  
  try {
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('uploads')
      .download(filePath);
      
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    
    // Parse the Excel file
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
    
    // Determine the table to insert into based on fileType
    const tableName = fileType === 'merchant' ? 'merchant_data' : 'residual_data';
    
    // Add timestamps to the data
    const timestamp = new Date().toISOString();
    const dataWithTimestamps = jsonData.map(row => ({
      ...row as object,
      created_at: timestamp,
      updated_at: timestamp
    }));
    
    // Insert the data into the database
    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .upsert(dataWithTimestamps, { onConflict: 'mid,month' });
      
    if (insertError) {
      throw new Error(`Failed to insert data: ${insertError.message}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: jsonData.length,
        errors: 0
      })
    };
  } catch (error: unknown) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
}

describe('Excel Processing Edge Function', () => {
  let supabase: any;
  
  beforeEach(() => {
    // Create a mock Supabase client
    supabase = createClient('https://test.supabase.co', 'test-key');
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('processExcelEdgeFunction', () => {
    it('should process a merchant Excel file from storage and insert data into Supabase', async () => {
      const event = {
        body: JSON.stringify({
          filePath: 'merchants/test-file.xlsx',
          fileType: 'merchant'
        })
      };
      
      const response = await processExcelEdgeFunction(event, {});
      const responseBody = JSON.parse(response.body);
      
      // Verify the storage.from was called with the correct bucket
      expect(supabase.storage.from).toHaveBeenCalledWith('uploads');
      
      // Verify download was called with the correct path
      expect(supabase.storage.from().download).toHaveBeenCalledWith('merchants/test-file.xlsx');
      
      // Verify XLSX.read was called
      expect(XLSX.read).toHaveBeenCalled();
      
      // Verify XLSX.utils.sheet_to_json was called
      expect(XLSX.utils.sheet_to_json).toHaveBeenCalled();
      
      // Verify data was inserted into the correct table
      expect(supabase.from).toHaveBeenCalledWith('merchant_data');
      expect(supabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            mid: '123456', 
            merchant_dba: 'Test Merchant 1', 
            total_volume: 1000,
            month: '2023-05',
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ]),
        { onConflict: 'mid,month' }
      );
      
      // Verify the response
      expect(response.statusCode).toBe(200);
      expect(responseBody).toEqual({
        success: true,
        processed: 2,
        errors: 0
      });
    });

    it('should process a residual Excel file from storage and insert data into Supabase', async () => {
      // Create a new mock implementation for this test
      const mockSheetToJson = vi.fn().mockReturnValue([
        { mid: '123456', net_profit: 50, month: '2023-05' },
        { mid: '789012', net_profit: 100, month: '2023-05' }
      ]);
      
      // Replace the sheet_to_json function for this test only
      const originalSheetToJson = XLSX.utils.sheet_to_json;
      XLSX.utils.sheet_to_json = mockSheetToJson;
      
      const event = {
        body: JSON.stringify({
          filePath: 'residuals/test-file.xlsx',
          fileType: 'residual'
        })
      };
      
      const response = await processExcelEdgeFunction(event, {});
      const responseBody = JSON.parse(response.body);
      
      // Restore the original function after test
      XLSX.utils.sheet_to_json = originalSheetToJson;
      
      // Verify the storage.from was called with the correct bucket
      expect(supabase.storage.from).toHaveBeenCalledWith('uploads');
      
      // Verify download was called with the correct path
      expect(supabase.storage.from().download).toHaveBeenCalledWith('residuals/test-file.xlsx');
      
      // Verify data was inserted into the correct table
      expect(supabase.from).toHaveBeenCalledWith('residual_data');
      expect(supabase.from().upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            mid: '123456', 
            net_profit: 50,
            month: '2023-05',
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        ]),
        { onConflict: 'mid,month' }
      );
      
      // Verify the response
      expect(response.statusCode).toBe(200);
      expect(responseBody).toEqual({
        success: true,
        processed: 2,
        errors: 0
      });
    });

    it('should handle download errors', async () => {
      // Override the mock to simulate a download error
      supabase.storage.from().download.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'File not found' } 
      });
      
      const event = {
        body: JSON.stringify({
          filePath: 'merchants/test-file.xlsx',
          fileType: 'merchant'
        })
      };
      
      const response = await processExcelEdgeFunction(event, {});
      const responseBody = JSON.parse(response.body);
      
      // Verify the response
      expect(response.statusCode).toBe(500);
      expect(responseBody).toEqual({
        success: false,
        error: 'Failed to download file: File not found'
      });
    });

    it('should handle database insertion errors', async () => {
      // Override the mock to simulate an insertion error
      supabase.from().upsert.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database constraint violation' } 
      });
      
      const event = {
        body: JSON.stringify({
          filePath: 'merchants/test-file.xlsx',
          fileType: 'merchant'
        })
      };
      
      const response = await processExcelEdgeFunction(event, {});
      const responseBody = JSON.parse(response.body);
      
      // Verify the response
      expect(response.statusCode).toBe(500);
      expect(responseBody).toEqual({
        success: false,
        error: 'Failed to insert data: Database constraint violation'
      });
    });
  });
});

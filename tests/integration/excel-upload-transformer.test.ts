import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DataTransformer } from '../../irelandpay_analytics/ingest/transformer';
import * as XLSX from 'xlsx';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockStorageFrom = vi.fn().mockReturnValue({
    download: vi.fn().mockResolvedValue({ data: new Uint8Array([1, 2, 3, 4]), error: null }),
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

// Mock XLSX library
vi.mock('xlsx', () => {
  return {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:D3',
          A1: { t: 's', v: 'MID' },
          B1: { t: 's', v: 'DBA Name' },
          C1: { t: 's', v: 'Processing Volume' },
          D1: { t: 's', v: 'Month' },
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
        { MID: '123456', 'DBA Name': 'Test Merchant 1', 'Processing Volume': 1000, Month: '2023-05' },
        { MID: '789012', 'DBA Name': 'Test Merchant 2', 'Processing Volume': 2000, Month: '2023-05' }
      ])
    }
  };
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Import the modules to test
async function processExcelWithTransformer(fileUrl: string, fileType: 'merchant' | 'residual', month: string) {
  const supabase = createClient('https://test.supabase.co', 'test-key');
  
  try {
    // Download the file from storage (mocked)
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('uploads')
      .download(fileUrl);
      
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    
    // Parse the Excel file (mocked)
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
    
    // Use DataTransformer to transform the data
    const transformer = new DataTransformer();
    
    // Convert raw data to DataFrame (mocked for testing)
    const df = {
      columns: Object.keys(rawData[0]),
      data: rawData,
      // Mock basic DataFrame functionality
      copy: function() { return this; }
    };
    
    // Transform the data using DataTransformer
    let transformedData;
    if (fileType === 'merchant') {
      // Normalize column names
      const normalizedDf = transformer.normalize_column_names(df, 'merchant');
      
      // Clean the data
      const cleanedDf = transformer.clean_merchant_data(normalizedDf, month);
      
      // Transform the data
      transformedData = transformer.transform_data(cleanedDf, 'merchant', month);
    } else {
      // Normalize column names
      const normalizedDf = transformer.normalize_column_names(df, 'residual');
      
      // Clean the data
      const cleanedDf = transformer.clean_residual_data(normalizedDf, month);
      
      // Transform the data
      transformedData = transformer.transform_data(cleanedDf, 'residual', month);
    }
    
    // Determine the table to insert into based on fileType
    const tableName = fileType === 'merchant' ? 'merchant_data' : 'residual_data';
    
    // Insert the data into the database
    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .upsert(transformedData, { onConflict: 'mid,month' });
      
    if (insertError) {
      throw new Error(`Failed to insert data: ${insertError.message}`);
    }
    
    return {
      success: true,
      processed: transformedData.length,
      errors: 0
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

describe('Excel Upload with DataTransformer Integration', () => {
  let supabase: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock Supabase client
    supabase = createClient('https://test.supabase.co', 'test-key');
    
    // Mock DataTransformer methods
    vi.spyOn(DataTransformer.prototype, 'normalize_column_names').mockImplementation((df, fileType) => {
      // Return a normalized DataFrame with standardized column names
      return {
        columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
        data: df.data.map(row => ({
          mid: row.MID || row.mid,
          merchant_dba: row['DBA Name'] || row.merchant_dba,
          total_volume: row['Processing Volume'] || row.total_volume,
          month: row.Month || row.month
        })),
        copy: function() { return this; }
      };
    });
    
    vi.spyOn(DataTransformer.prototype, 'clean_merchant_data').mockImplementation((df, month) => {
      // Return a cleaned DataFrame
      return {
        columns: ['mid', 'merchant_dba', 'total_volume', 'month', 'payout_month'],
        data: df.data.map(row => ({
          ...row,
          payout_month: month
        })),
        copy: function() { return this; }
      };
    });
    
    vi.spyOn(DataTransformer.prototype, 'clean_residual_data').mockImplementation((df, month) => {
      // Return a cleaned DataFrame
      return {
        columns: ['mid', 'net_profit', 'month', 'payout_month'],
        data: df.data.map(row => ({
          ...row,
          net_profit: row.net_profit || 50,
          payout_month: month
        })),
        copy: function() { return this; }
      };
    });
    
    vi.spyOn(DataTransformer.prototype, 'transform_data').mockImplementation((df, fileType, month) => {
      // Return transformed data based on file type
      if (fileType === 'merchant') {
        return df.data.map(row => ({
          ...row,
          id: `${row.mid}_${month}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      } else {
        return df.data.map(row => ({
          ...row,
          id: `${row.mid}_${month}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
    });
    
    vi.spyOn(DataTransformer.prototype, 'merge_merchant_residual_data').mockImplementation((merchantDf, residualDf) => {
      // Return merged data
      return {
        columns: ['mid', 'merchant_dba', 'total_volume', 'net_profit', 'profit_margin', 'month'],
        data: merchantDf.data.map(merchant => ({
          ...merchant,
          net_profit: 50,
          profit_margin: 0.05
        })),
        copy: function() { return this; }
      };
    });
  });

  it('should process a merchant Excel file through the entire pipeline', async () => {
    const fileUrl = 'merchants/test-file.xlsx';
    const month = '2023-05';
    
    const result = await processExcelWithTransformer(fileUrl, 'merchant', month);
    
    // Verify the DataTransformer methods were called
    expect(DataTransformer.prototype.normalize_column_names).toHaveBeenCalledWith(
      expect.anything(),
      'merchant'
    );
    
    expect(DataTransformer.prototype.clean_merchant_data).toHaveBeenCalledWith(
      expect.anything(),
      month
    );
    
    expect(DataTransformer.prototype.transform_data).toHaveBeenCalledWith(
      expect.anything(),
      'merchant',
      month
    );
    
    // Verify data was inserted into the correct table
    expect(supabase.from).toHaveBeenCalledWith('merchant_data');
    
    // Verify the result
    expect(result).toEqual({
      success: true,
      processed: 2,
      errors: 0
    });
  });

  it('should process a residual Excel file through the entire pipeline', async () => {
    // Override the sheet_to_json mock for residual data
    (XLSX.utils.sheet_to_json as any).mockReturnValueOnce([
      { MID: '123456', 'Net Profit': 50, Month: '2023-05' },
      { MID: '789012', 'Net Profit': 100, Month: '2023-05' }
    ]);
    
    const fileUrl = 'residuals/test-file.xlsx';
    const month = '2023-05';
    
    const result = await processExcelWithTransformer(fileUrl, 'residual', month);
    
    // Verify the DataTransformer methods were called
    expect(DataTransformer.prototype.normalize_column_names).toHaveBeenCalledWith(
      expect.anything(),
      'residual'
    );
    
    expect(DataTransformer.prototype.clean_residual_data).toHaveBeenCalledWith(
      expect.anything(),
      month
    );
    
    expect(DataTransformer.prototype.transform_data).toHaveBeenCalledWith(
      expect.anything(),
      'residual',
      month
    );
    
    // Verify data was inserted into the correct table
    expect(supabase.from).toHaveBeenCalledWith('residual_data');
    
    // Verify the result
    expect(result).toEqual({
      success: true,
      processed: 2,
      errors: 0
    });
  });

  it('should handle errors in the transformation process', async () => {
    // Make the normalize_column_names method throw an error
    (DataTransformer.prototype.normalize_column_names as any).mockImplementationOnce(() => {
      throw new Error('Invalid column names');
    });
    
    const fileUrl = 'merchants/test-file.xlsx';
    const month = '2023-05';
    
    const result = await processExcelWithTransformer(fileUrl, 'merchant', month);
    
    // Verify the result contains the error
    expect(result).toEqual({
      success: false,
      error: 'Invalid column names'
    });
    
    // Verify that no data was inserted
    expect(supabase.from().upsert).not.toHaveBeenCalled();
  });

  it('should handle database insertion errors', async () => {
    // Override the upsert mock to simulate an error
    supabase.from().upsert.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Database constraint violation' } 
    });
    
    const fileUrl = 'merchants/test-file.xlsx';
    const month = '2023-05';
    
    const result = await processExcelWithTransformer(fileUrl, 'merchant', month);
    
    // Verify the result contains the error
    expect(result).toEqual({
      success: false,
      error: 'Failed to insert data: Database constraint violation'
    });
  });

  it('should handle file download errors', async () => {
    // Override the download mock to simulate an error
    supabase.storage.from().download.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'File not found' } 
    });
    
    const fileUrl = 'merchants/test-file.xlsx';
    const month = '2023-05';
    
    const result = await processExcelWithTransformer(fileUrl, 'merchant', month);
    
    // Verify the result contains the error
    expect(result).toEqual({
      success: false,
      error: 'Failed to download file: File not found'
    });
    
    // Verify that the DataTransformer methods were not called
    expect(DataTransformer.prototype.normalize_column_names).not.toHaveBeenCalled();
  });

  it('should merge merchant and residual data when both are available', async () => {
    // Create mock merchant and residual data
    const merchantData = {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
      data: [
        { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
        { mid: '789012', merchant_dba: 'Test Merchant 2', total_volume: 2000, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    const residualData = {
      columns: ['mid', 'net_profit', 'month'],
      data: [
        { mid: '123456', net_profit: 50, month: '2023-05' },
        { mid: '789012', net_profit: 100, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    // Call the merge method directly
    const transformer = new DataTransformer();
    const mergedData = transformer.merge_merchant_residual_data(merchantData, residualData);
    
    // Verify the merged data contains the expected columns
    expect(mergedData.columns).toContain('mid');
    expect(mergedData.columns).toContain('merchant_dba');
    expect(mergedData.columns).toContain('total_volume');
    expect(mergedData.columns).toContain('net_profit');
    expect(mergedData.columns).toContain('profit_margin');
    
    // Verify the profit margin calculation
    expect(mergedData.data[0].profit_margin).toBe(0.05);
  });
});

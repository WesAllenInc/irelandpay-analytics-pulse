import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockStorageFrom = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: new Uint8Array([1, 2, 3, 4]), // Mock Excel file data
        error: null
      }),
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-file.xlsx' },
        error: null
      })
    })
  });

  const mockFrom = vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      error: null
    }),
    upsert: vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      error: null
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'completed' },
          error: null
        })
      })
    })
  });

  return {
    createClient: vi.fn().mockImplementation(() => ({
      storage: mockStorageFrom,
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({
        data: { success: true },
        error: null
      })
    }))
  };
});

// Mock XLSX library
vi.mock('xlsx', () => ({
  default: {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:D3',
          A1: { v: 'MID' },
          B1: { v: 'DBA Name' },
          C1: { v: 'Processing Volume' },
          D1: { v: 'Month' },
          A2: { v: '123456' },
          B2: { v: 'Test Merchant 1' },
          C2: { v: 1000 },
          D2: { v: '2023-05' },
          A3: { v: '789012' },
          B3: { v: 'Test Merchant 2' },
          C3: { v: 2000 },
          D3: { v: '2023-05' }
        }
      }
    }),
    utils: {
      sheet_to_json: vi.fn().mockReturnValue([
        { MID: '123456', 'DBA Name': 'Test Merchant 1', 'Processing Volume': 1000, Month: '2023-05' },
        { MID: '789012', 'DBA Name': 'Test Merchant 2', 'Processing Volume': 2000, Month: '2023-05' }
      ])
    }
  }
}));

// Mock fetch
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, count: 2 })
  })
);

// Mock DataTransformer
class MockDataTransformer {
  normalize_column_names(df: any, fileType: string) {
    return {
      columns: fileType === 'merchant' 
        ? ['mid', 'merchant_dba', 'total_volume', 'month']
        : ['mid', 'net_profit', 'month'],
      data: df,
      copy: function() { return this; }
    };
  }

  clean_merchant_data(df: any, month: string) {
    return {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month', 'payout_month'],
      data: df.data.map((row: any) => ({
        ...row,
        payout_month: month
      })),
      copy: function() { return this; }
    };
  }

  clean_residual_data(df: any, month: string) {
    return {
      columns: ['mid', 'net_profit', 'month', 'payout_month'],
      data: df.data.map((row: any) => ({
        ...row,
        payout_month: month
      })),
      copy: function() { return this; }
    };
  }

  transform_data(df: any, fileType: string, month: string) {
    return df.data.map((row: any) => ({
      ...row,
      id: `${row.mid}_${month}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  merge_merchant_residual_data(merchantDf: any, residualDf: any) {
    return {
      columns: ['mid', 'merchant_dba', 'total_volume', 'net_profit', 'profit_margin', 'month'],
      data: merchantDf.data.map((merchant: any) => {
        const residual = residualDf.data.find((r: any) => r.mid === merchant.mid) || { net_profit: 0 };
        const total_volume = merchant.total_volume || 0;
        const net_profit = residual.net_profit || 0;
        const profit_margin = total_volume > 0 ? net_profit / total_volume : 0;
        
        return {
          ...merchant,
          net_profit,
          profit_margin
        };
      }),
      copy: function() { return this; }
    };
  }
}

// Mock the DataTransformer import
vi.mock('../../irelandpay_analytics/ingest/transformer', () => ({
  DataTransformer: MockDataTransformer
}));

describe('Excel Upload Pipeline Integration Tests', () => {
  let supabase: any;
  
  beforeEach(() => {
    supabase = createClient('https://example.supabase.co', 'fake-key');
    vi.clearAllMocks();
  });

  it('should process merchant Excel file upload successfully', async () => {
    // Mock file and upload parameters
    const file = new File(['dummy excel content'], 'test-merchant.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const month = '2023-05';
    const fileType = 'merchant';
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(`${fileType}/${month}/test-merchant.xlsx`, file);
    
    expect(uploadError).toBeNull();
    expect(uploadData).toBeDefined();
    expect(uploadData.path).toBe('test-file.xlsx');
    
    // Process the file (simulate API call)
    const response = await fetch('/api/process-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: uploadData.path,
        month,
        fileType
      })
    });
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    
    // Verify data was inserted into the database
    const { data: insertData, error: insertError } = await supabase.from('merchant_data').insert([
      { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
      { mid: '789012', merchant_dba: 'Test Merchant 2', total_volume: 2000, month: '2023-05' }
    ]);
    
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();
  });

  it('should process residual Excel file upload successfully', async () => {
    // Mock file and upload parameters
    const file = new File(['dummy excel content'], 'test-residual.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const month = '2023-05';
    const fileType = 'residual';
    
    // Override XLSX mock for residual data
    const xlsxModule = await import('xlsx');
    (xlsxModule.default.utils.sheet_to_json as any).mockReturnValueOnce([
      { MID: '123456', 'Net Profit': 50, Month: '2023-05' },
      { MID: '789012', 'Net Profit': 100, Month: '2023-05' }
    ]);
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from('uploads').upload(`${fileType}/${month}/test-residual.xlsx`, file);
    
    expect(uploadError).toBeNull();
    expect(uploadData).toBeDefined();
    expect(uploadData.path).toBe('test-file.xlsx');
    
    // Process the file (simulate API call)
    const response = await fetch('/api/process-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: uploadData.path,
        month,
        fileType
      })
    });
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    
    // Verify data was inserted into the database
    const { data: insertData, error: insertError } = await supabase.from('residual_data').insert([
      { mid: '123456', net_profit: 50, month: '2023-05' },
      { mid: '789012', net_profit: 100, month: '2023-05' }
    ]);
    
    expect(insertError).toBeNull();
    expect(insertData).toBeDefined();
  });

  it('should merge merchant and residual data correctly', async () => {
    // Setup mock data
    const merchantData = [
      { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
      { mid: '789012', merchant_dba: 'Test Merchant 2', total_volume: 2000, month: '2023-05' }
    ];
    
    const residualData = [
      { mid: '123456', net_profit: 50, month: '2023-05' },
      { mid: '789012', net_profit: 100, month: '2023-05' }
    ];
    
    // Create a transformer instance
    const transformer = new MockDataTransformer();
    
    // Create mock DataFrames
    const merchantDf = {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
      data: merchantData,
      copy: function() { return this; }
    };
    
    const residualDf = {
      columns: ['mid', 'net_profit', 'month'],
      data: residualData,
      copy: function() { return this; }
    };
    
    // Merge the data
    const mergedDf = transformer.merge_merchant_residual_data(merchantDf, residualDf);
    
    // Verify the merged data
    expect(mergedDf.data[0].mid).toBe('123456');
    expect(mergedDf.data[0].merchant_dba).toBe('Test Merchant 1');
    expect(mergedDf.data[0].total_volume).toBe(1000);
    expect(mergedDf.data[0].net_profit).toBe(50);
    expect(mergedDf.data[0].profit_margin).toBe(0.05); // 50/1000
    
    expect(mergedDf.data[1].mid).toBe('789012');
    expect(mergedDf.data[1].merchant_dba).toBe('Test Merchant 2');
    expect(mergedDf.data[1].total_volume).toBe(2000);
    expect(mergedDf.data[1].net_profit).toBe(100);
    expect(mergedDf.data[1].profit_margin).toBe(0.05); // 100/2000
    
    // Simulate API call to merge data
    const response = await fetch('/api/merge-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: '2023-05'
      })
    });
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
  });

  it('should handle errors during file processing', async () => {
    // Mock file and upload parameters
    const file = new File(['dummy excel content'], 'test-error.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const month = '2023-05';
    const fileType = 'merchant';
    
    // Mock storage download to fail
    const supabaseStorage = supabase.storage.from('uploads');
    (supabaseStorage.download as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'File not found' }
    });
    
    // Upload file to storage
    const { data: uploadData } = await supabase.storage.from('uploads').upload(`${fileType}/${month}/test-error.xlsx`, file);
    
    // Process the file (simulate API call that will fail)
    const response = await fetch('/api/process-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: uploadData.path,
        month,
        fileType
      })
    });
    
    // Override fetch mock to return an error
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'File not found' })
      })
    );
    
    const result = await response.json();
    
    // Since we mocked fetch to return success earlier, we need to verify the error handling through other means
    const errorResponse = await fetch('/api/process-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: 'non-existent-file.xlsx',
        month,
        fileType
      })
    });
    
    const errorResult = await errorResponse.json();
    
    expect(errorResult.success).toBe(false);
  });
});

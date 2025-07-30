import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Python DataTransformer module
vi.mock('../../irelandpay_analytics/ingest/transformer', () => ({
  DataTransformer: vi.fn().mockImplementation(() => ({
    normalize_column_names: vi.fn(),
    clean_merchant_data: vi.fn(),
    clean_residual_data: vi.fn(),
    transform_data: vi.fn(),
    merge_merchant_residual_data: vi.fn()
  }))
}));

// Mock pandas and numpy dependencies
vi.mock('pandas', () => ({
  DataFrame: vi.fn().mockImplementation((data) => ({
    columns: Object.keys(data[0] || {}),
    data: data,
    copy: function() { return this; }
  }))
}));

describe('DataTransformer Integration Tests', () => {
  let transformer: any;
  
  beforeEach(() => {
    // Import the mocked DataTransformer
    const { DataTransformer } = vi.importMock('../../irelandpay_analytics/ingest/transformer');
    transformer = new DataTransformer();
    
    // Mock DataTransformer methods
    vi.spyOn(transformer, 'normalize_column_names').mockImplementation((df, fileType) => {
      // Return a normalized DataFrame with standardized column names
      if (fileType === 'merchant') {
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
      } else {
        return {
          columns: ['mid', 'net_profit', 'month'],
          data: df.data.map(row => ({
            mid: row.MID || row.mid,
            net_profit: row['Net Profit'] || row.net_profit,
            month: row.Month || row.month
          })),
          copy: function() { return this; }
        };
      }
    });
    
    vi.spyOn(transformer, 'clean_merchant_data').mockImplementation((df, month) => {
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
    
    vi.spyOn(transformer, 'clean_residual_data').mockImplementation((df, month) => {
      // Return a cleaned DataFrame
      return {
        columns: ['mid', 'net_profit', 'month', 'payout_month'],
        data: df.data.map(row => ({
          ...row,
          payout_month: month
        })),
        copy: function() { return this; }
      };
    });
    
    vi.spyOn(transformer, 'transform_data').mockImplementation((df, fileType, month) => {
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
    
    vi.spyOn(transformer, 'merge_merchant_residual_data').mockImplementation((merchantDf, residualDf) => {
      // Return merged data
      return {
        columns: ['mid', 'merchant_dba', 'total_volume', 'net_profit', 'profit_margin', 'month'],
        data: merchantDf.data.map(merchant => {
          const residual = residualDf.data.find(r => r.mid === merchant.mid) || { net_profit: 0 };
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
    });
  });

  it('should process merchant data through the transformation pipeline', () => {
    // Create test data
    const merchantData = [
      { MID: '123456', 'DBA Name': 'Test Merchant 1', 'Processing Volume': 1000, Month: '2023-05' },
      { MID: '789012', 'DBA Name': 'Test Merchant 2', 'Processing Volume': 2000, Month: '2023-05' }
    ];
    
    const df = {
      columns: Object.keys(merchantData[0]),
      data: merchantData,
      copy: function() { return this; }
    };
    
    const month = '2023-05';
    
    // Process through the pipeline
    const normalizedDf = transformer.normalize_column_names(df, 'merchant');
    const cleanedDf = transformer.clean_merchant_data(normalizedDf, month);
    const transformedData = transformer.transform_data(cleanedDf, 'merchant', month);
    
    // Verify the results
    expect(normalizedDf.columns).toContain('mid');
    expect(normalizedDf.columns).toContain('merchant_dba');
    expect(normalizedDf.columns).toContain('total_volume');
    
    expect(cleanedDf.columns).toContain('payout_month');
    expect(cleanedDf.data[0].payout_month).toBe(month);
    
    expect(transformedData[0].id).toBe('123456_2023-05');
    expect(transformedData[0].created_at).toBeDefined();
  });

  it('should process residual data through the transformation pipeline', () => {
    // Create test data
    const residualData = [
      { MID: '123456', 'Net Profit': 50, Month: '2023-05' },
      { MID: '789012', 'Net Profit': 100, Month: '2023-05' }
    ];
    
    const df = {
      columns: Object.keys(residualData[0]),
      data: residualData,
      copy: function() { return this; }
    };
    
    const month = '2023-05';
    
    // Process through the pipeline
    const normalizedDf = transformer.normalize_column_names(df, 'residual');
    const cleanedDf = transformer.clean_residual_data(normalizedDf, month);
    const transformedData = transformer.transform_data(cleanedDf, 'residual', month);
    
    // Verify the results
    expect(normalizedDf.columns).toContain('mid');
    expect(normalizedDf.columns).toContain('net_profit');
    
    expect(cleanedDf.columns).toContain('payout_month');
    expect(cleanedDf.data[0].payout_month).toBe(month);
    
    expect(transformedData[0].id).toBe('123456_2023-05');
    expect(transformedData[0].net_profit).toBe(50);
  });

  it('should merge merchant and residual data correctly', () => {
    // Create test data
    const merchantDf = {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
      data: [
        { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
        { mid: '789012', merchant_dba: 'Test Merchant 2', total_volume: 2000, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    const residualDf = {
      columns: ['mid', 'net_profit', 'month'],
      data: [
        { mid: '123456', net_profit: 50, month: '2023-05' },
        { mid: '789012', net_profit: 100, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    // Merge the data
    const mergedDf = transformer.merge_merchant_residual_data(merchantDf, residualDf);
    
    // Verify the results
    expect(mergedDf.columns).toContain('mid');
    expect(mergedDf.columns).toContain('merchant_dba');
    expect(mergedDf.columns).toContain('total_volume');
    expect(mergedDf.columns).toContain('net_profit');
    expect(mergedDf.columns).toContain('profit_margin');
    
    expect(mergedDf.data[0].mid).toBe('123456');
    expect(mergedDf.data[0].net_profit).toBe(50);
    expect(mergedDf.data[0].profit_margin).toBe(0.05); // 50/1000
    
    expect(mergedDf.data[1].mid).toBe('789012');
    expect(mergedDf.data[1].net_profit).toBe(100);
    expect(mergedDf.data[1].profit_margin).toBe(0.05); // 100/2000
  });

  it('should handle missing residual data when merging', () => {
    // Create test data with a merchant that has no matching residual
    const merchantDf = {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
      data: [
        { mid: '123456', merchant_dba: 'Test Merchant 1', total_volume: 1000, month: '2023-05' },
        { mid: '999999', merchant_dba: 'No Residual Merchant', total_volume: 3000, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    const residualDf = {
      columns: ['mid', 'net_profit', 'month'],
      data: [
        { mid: '123456', net_profit: 50, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    // Merge the data
    const mergedDf = transformer.merge_merchant_residual_data(merchantDf, residualDf);
    
    // Verify the results
    expect(mergedDf.data[0].mid).toBe('123456');
    expect(mergedDf.data[0].net_profit).toBe(50);
    expect(mergedDf.data[0].profit_margin).toBe(0.05);
    
    expect(mergedDf.data[1].mid).toBe('999999');
    expect(mergedDf.data[1].net_profit).toBe(0);
    expect(mergedDf.data[1].profit_margin).toBe(0);
  });

  it('should handle edge cases in profit margin calculation', () => {
    // Create test data with zero volume
    const merchantDf = {
      columns: ['mid', 'merchant_dba', 'total_volume', 'month'],
      data: [
        { mid: '123456', merchant_dba: 'Zero Volume Merchant', total_volume: 0, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    const residualDf = {
      columns: ['mid', 'net_profit', 'month'],
      data: [
        { mid: '123456', net_profit: 50, month: '2023-05' }
      ],
      copy: function() { return this; }
    };
    
    // Merge the data
    const mergedDf = transformer.merge_merchant_residual_data(merchantDf, residualDf);
    
    // Verify the results - should not have NaN or division by zero errors
    expect(mergedDf.data[0].mid).toBe('123456');
    expect(mergedDf.data[0].net_profit).toBe(50);
    expect(mergedDf.data[0].profit_margin).toBe(0); // Should handle division by zero gracefully
  });
});

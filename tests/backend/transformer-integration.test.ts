import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataTransformer } from '@backend/transformer';

describe('DataTransformer Integration Tests', () => {
  let transformer: DataTransformer;
  
  beforeEach(() => {
    transformer = new DataTransformer();
  });

  it('should process merchant data through the transformation pipeline', () => {
    // Sample merchant data with various column formats
    const merchantData = [
      {
        'Merchant ID': '123456',
        'DBA Name': 'Test Merchant',
        'Volume': '1,000.00',
        'Transactions': '10'
      },
      {
        'MID': '789012',
        'Business Name': 'Another Business',
        'Processing Volume': 2000.0,
        'Transaction Count': 20
      }
    ];

    // Transform the data
    const result = transformer.transformData(merchantData, 'merchant', '2023-05');

    // Verify the results
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      mid: '123456',
      merchant_dba: 'Test Merchant',
      total_volume: 1000,
      total_txns: 10,
      month: '2023-05'
    });
    expect(result[1]).toMatchObject({
      mid: '789012',
      merchant_dba: 'Another Business',
      total_volume: 2000,
      total_txns: 20,
      month: '2023-05'
    });
  });

  it('should process residual data through the transformation pipeline', () => {
    // Sample residual data with various column formats
    const residualData = [
      {
        'Merchant ID': '123456',
        'Net Profit': '50.00'
      },
      {
        'MID': '789012',
        'Commission': 100.0
      }
    ];

    // Transform the data
    const result = transformer.transformData(residualData, 'residual', '2023-05');

    // Verify the results
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      mid: '123456',
      net_profit: 50,
      payout_month: '2023-05'
    });
    expect(result[1]).toMatchObject({
      mid: '789012',
      net_profit: 100,
      payout_month: '2023-05'
    });
  });

  it('should merge merchant and residual data correctly', () => {
    const merchantData = [
      {
        mid: '123456',
        merchant_dba: 'Test Merchant',
        total_volume: 1000,
        total_txns: 10,
        month: '2023-05',
        datasource: 'excel_import_2023-05',
        created_at: '2023-05-01T00:00:00Z'
      }
    ];

    const residualData = [
      {
        mid: '123456',
        net_profit: 50,
        payout_month: '2023-05',
        created_at: '2023-05-01T00:00:00Z',
        id: '123456_2023-05'
      }
    ];

    const result = transformer.mergeMerchantResidualData(merchantData, residualData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      mid: '123456',
      merchant_dba: 'Test Merchant',
      total_volume: 1000,
      total_txns: 10,
      net_profit: 50,
      profit_margin: 5 // (50/1000) * 100
    });
  });

  it('should handle missing residual data when merging', () => {
    const merchantData = [
      {
        mid: '123456',
        merchant_dba: 'Test Merchant',
        total_volume: 1000,
        total_txns: 10,
        month: '2023-05',
        datasource: 'excel_import_2023-05',
        created_at: '2023-05-01T00:00:00Z'
      }
    ];

    const residualData: any[] = [];

    const result = transformer.mergeMerchantResidualData(merchantData, residualData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      mid: '123456',
      merchant_dba: 'Test Merchant',
      total_volume: 1000,
      total_txns: 10,
      net_profit: 0,
      profit_margin: 0
    });
  });

  it('should handle edge cases in profit margin calculation', () => {
    const merchantData = [
      {
        mid: '123456',
        merchant_dba: 'Test Merchant',
        total_volume: 0, // Zero volume
        total_txns: 0,
        month: '2023-05',
        datasource: 'excel_import_2023-05',
        created_at: '2023-05-01T00:00:00Z'
      }
    ];

    const residualData = [
      {
        mid: '123456',
        net_profit: 50,
        payout_month: '2023-05',
        created_at: '2023-05-01T00:00:00Z',
        id: '123456_2023-05'
      }
    ];

    const result = transformer.mergeMerchantResidualData(merchantData, residualData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      mid: '123456',
      total_volume: 0,
      net_profit: 50,
      profit_margin: 0 // Should be 0 when volume is 0
    });
  });
});

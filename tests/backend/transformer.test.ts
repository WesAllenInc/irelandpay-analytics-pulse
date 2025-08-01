import { describe, it, expect, beforeEach } from 'vitest';
import { DataTransformer, type MerchantData, type ResidualData, type MergedData } from '@backend/transformer';

describe('DataTransformer', () => {
  let transformer: DataTransformer;

  beforeEach(() => {
    transformer = new DataTransformer();
  });

  describe('Column Mappings', () => {
    it('should have correct merchant column mappings', () => {
      expect(DataTransformer.MERCHANT_COLUMN_MAPPINGS['merchant id']).toBe('mid');
      expect(DataTransformer.MERCHANT_COLUMN_MAPPINGS['dba name']).toBe('merchant_dba');
      expect(DataTransformer.MERCHANT_COLUMN_MAPPINGS['volume']).toBe('total_volume');
      expect(DataTransformer.MERCHANT_COLUMN_MAPPINGS['transactions']).toBe('total_txns');
    });

    it('should have correct residual column mappings', () => {
      expect(DataTransformer.RESIDUAL_COLUMN_MAPPINGS['merchant id']).toBe('mid');
      expect(DataTransformer.RESIDUAL_COLUMN_MAPPINGS['net profit']).toBe('net_profit');
      expect(DataTransformer.RESIDUAL_COLUMN_MAPPINGS['agent']).toBe('agent_name');
    });
  });

  describe('normalizeColumnNames', () => {
    it('should normalize merchant column names correctly', () => {
      const inputData = [
        {
          'Merchant ID': '123456',
          'DBA Name': 'Test Merchant',
          'Volume': 1000.0,
          'Transactions': 10
        }
      ];

      const result = transformer.normalizeColumnNames(inputData, 'merchant');

      expect(result[0]).toHaveProperty('mid');
      expect(result[0]).toHaveProperty('merchant_dba');
      expect(result[0]).toHaveProperty('total_volume');
      expect(result[0]).toHaveProperty('total_txns');
      expect(result[0].mid).toBe('123456');
      expect(result[0].merchant_dba).toBe('Test Merchant');
    });

    it('should normalize residual column names correctly', () => {
      const inputData = [
        {
          'Merchant ID': '123456',
          'Net Profit': 50.0,
          'Agent': 'Test Agent'
        }
      ];

      const result = transformer.normalizeColumnNames(inputData, 'residual');

      expect(result[0]).toHaveProperty('mid');
      expect(result[0]).toHaveProperty('net_profit');
      expect(result[0]).toHaveProperty('agent_name');
      expect(result[0].mid).toBe('123456');
      expect(result[0].net_profit).toBe(50.0);
    });

    it('should handle empty data array', () => {
      const result = transformer.normalizeColumnNames([], 'merchant');
      expect(result).toEqual([]);
    });
  });

  describe('cleanMerchantData', () => {
    it('should clean merchant data correctly', () => {
      const inputData = [
        {
          mid: '123456',
          merchant_dba: 'Test Merchant',
          total_volume: '1,000.00',
          total_txns: '10'
        },
        {
          mid: '789012',
          merchant_dba: 'Another Merchant',
          total_volume: 2000.0,
          total_txns: 20
        }
      ];

      const result = transformer.cleanMerchantData(inputData, '2023-05');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        mid: '123456',
        merchant_dba: 'Test Merchant',
        total_volume: 1000,
        total_txns: 10,
        month: '2023-05',
        datasource: 'excel_import_2023-05'
      });
      expect(result[0]).toHaveProperty('created_at');
    });

    it('should filter out rows with missing required data', () => {
      const inputData = [
        {
          mid: '123456',
          merchant_dba: 'Test Merchant',
          total_volume: 1000,
          total_txns: 10
        },
        {
          mid: '',
          merchant_dba: 'Invalid Merchant',
          total_volume: 1000,
          total_txns: 10
        },
        {
          mid: '789012',
          merchant_dba: 'Another Merchant',
          total_volume: null,
          total_txns: 20
        }
      ];

      const result = transformer.cleanMerchantData(inputData, '2023-05');

      expect(result).toHaveLength(1);
      expect(result[0].mid).toBe('123456');
    });
  });

  describe('cleanResidualData', () => {
    it('should clean residual data correctly', () => {
      const inputData = [
        {
          mid: '123456',
          net_profit: '50.00'
        },
        {
          mid: '789012',
          net_profit: 100.0
        }
      ];

      const result = transformer.cleanResidualData(inputData, '2023-05');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        mid: '123456',
        net_profit: 50,
        payout_month: '2023-05',
        id: '123456_2023-05'
      });
      expect(result[0]).toHaveProperty('created_at');
    });

    it('should filter out rows with missing required data', () => {
      const inputData = [
        {
          mid: '123456',
          net_profit: 50.0
        },
        {
          mid: '',
          net_profit: 100.0
        },
        {
          mid: '789012',
          net_profit: null
        }
      ];

      const result = transformer.cleanResidualData(inputData, '2023-05');

      expect(result).toHaveLength(1);
      expect(result[0].mid).toBe('123456');
    });
  });

  describe('transformData', () => {
    it('should transform merchant data correctly', () => {
      const inputData = [
        {
          'Merchant ID': '123456',
          'DBA Name': 'Test Merchant',
          'Volume': '1,000.00',
          'Transactions': '10'
        }
      ];

      const result = transformer.transformData(inputData, 'merchant', '2023-05');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        mid: '123456',
        merchant_dba: 'Test Merchant',
        total_volume: 1000,
        total_txns: 10,
        month: '2023-05'
      });
    });

    it('should transform residual data correctly', () => {
      const inputData = [
        {
          'Merchant ID': '123456',
          'Net Profit': '50.00'
        }
      ];

      const result = transformer.transformData(inputData, 'residual', '2023-05');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        mid: '123456',
        net_profit: 50,
        payout_month: '2023-05'
      });
    });
  });

  describe('mergeMerchantResidualData', () => {
    it('should merge merchant and residual data correctly', () => {
      const merchantData: MerchantData[] = [
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

      const residualData: ResidualData[] = [
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

    it('should handle partial data (merchant only)', () => {
      const merchantData: MerchantData[] = [
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

      const residualData: ResidualData[] = [];

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

    it('should handle partial data (residual only)', () => {
      const merchantData: MerchantData[] = [];

      const residualData: ResidualData[] = [
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
        merchant_dba: '',
        total_volume: 0,
        total_txns: 0,
        net_profit: 50,
        profit_margin: 0
      });
    });
  });
}); 
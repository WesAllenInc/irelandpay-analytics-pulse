import { describe, it, expect } from 'vitest';
import {
  calculateTotalVolume,
  calculateTotalResidual,
  calculateForecastedVolume,
  calculateForecastedResidual,
  formatMerchantTableData,
  formatVolumeTrendData,
  formatCSV,
  escapeCSVValue
} from '@/lib/calculations';

describe('Volume and Residual Calculations', () => {
  describe('calculateTotalVolume', () => {
    it('calculates the sum of volumes from an array of objects with volume property', () => {
      const volumes = [
        { volume: 100 },
        { volume: 200 },
        { volume: 300 }
      ];
      expect(calculateTotalVolume(volumes)).toBe(600);
    });

    it('calculates the sum of volumes from an array of numbers', () => {
      const volumes = [100, 200, 300];
      expect(calculateTotalVolume(volumes)).toBe(600);
    });

    it('handles empty arrays', () => {
      expect(calculateTotalVolume([])).toBe(0);
    });

    it('handles null or undefined values', () => {
      const volumes = [
        { volume: 100 },
        { volume: null },
        { volume: 300 }
      ];
      expect(calculateTotalVolume(volumes)).toBe(400);
    });
  });

  describe('calculateTotalResidual', () => {
    it('calculates the sum of residuals from an array of objects with residual property', () => {
      const residuals = [
        { residual: 10 },
        { residual: 20 },
        { residual: 30 }
      ];
      expect(calculateTotalResidual(residuals)).toBe(60);
    });

    it('calculates the sum of residuals from an array of numbers', () => {
      const residuals = [10, 20, 30];
      expect(calculateTotalResidual(residuals)).toBe(60);
    });

    it('handles empty arrays', () => {
      expect(calculateTotalResidual([])).toBe(0);
    });

    it('handles null or undefined values', () => {
      const residuals = [
        { residual: 10 },
        { residual: null },
        { residual: 30 }
      ];
      expect(calculateTotalResidual(residuals)).toBe(40);
    });
  });

  describe('calculateForecastedVolume', () => {
    it('calculates forecasted volume based on current day of month', () => {
      // If on day 15 of a 30-day month with $15,000 volume so far
      // Expected forecast: ($15,000 / 15) * 30 = $30,000
      expect(calculateForecastedVolume(15000, 15, 30)).toBe(30000);
    });

    it('handles the case when current day equals days in month', () => {
      // If on the last day of the month, forecast equals current
      expect(calculateForecastedVolume(25000, 31, 31)).toBe(25000);
    });

    it('handles edge cases with zero or negative values', () => {
      expect(calculateForecastedVolume(15000, 0, 30)).toBe(0);
      expect(calculateForecastedVolume(15000, 15, 0)).toBe(0);
      expect(calculateForecastedVolume(0, 15, 30)).toBe(0);
    });

    it('adjusts when current day exceeds days in month', () => {
      // This might happen due to calculation errors or date handling
      expect(calculateForecastedVolume(15000, 32, 30)).toBe(15000);
    });
  });

  describe('calculateForecastedResidual', () => {
    it('calculates forecasted residual based on volume ratio', () => {
      // If current residual is $300 on $10,000 volume, and forecasted volume is $20,000
      // Expected forecast: ($300 / $10,000) * $20,000 = $600
      expect(calculateForecastedResidual(300, 10000, 20000)).toBe(600);
    });

    it('handles decimal precision correctly', () => {
      // Testing with values that would produce many decimal places
      expect(calculateForecastedResidual(333.33, 10000, 20000)).toBe(666.66);
    });

    it('handles edge case with zero current volume', () => {
      expect(calculateForecastedResidual(300, 0, 20000)).toBe(0);
    });

    it('handles zero forecasted volume', () => {
      expect(calculateForecastedResidual(300, 10000, 0)).toBe(0);
    });
  });
});

describe('Data Formatting Functions', () => {
  describe('formatMerchantTableData', () => {
    it('formats merchant data for the table with forecasting', () => {
      const mockMerchants = [
        {
          dba_name: 'Merchant One',
          merchant_processing_volumes: [
            { processing_month: '2023-07-01', gross_volume: 10000 }
          ],
          residuals: [
            { processing_month: '2023-07-01', final_residual: 200, agent_bps: 20 }
          ]
        }
      ];
      
      // Test with day 15 of a 31-day month
      const result = formatMerchantTableData(mockMerchants, '2023-07', 15, 31);
      
      expect(result).toHaveLength(1);
      expect(result[0].merchantName).toBe('Merchant One');
      expect(result[0].volume).toBe(10000);
      expect(result[0].agentBps).toBe(20);
      expect(result[0].residualEarned).toBe(200);
      expect(result[0].forecastedVolume).toBe(20667); // (10000/15)*31
      expect(result[0].forecastedResidual).toBe(413.34); // (200/10000)*20667
    });

    it('handles merchants with no volume or residual data for the selected month', () => {
      const mockMerchants = [
        {
          dba_name: 'Merchant One',
          merchant_processing_volumes: [
            { processing_month: '2023-06-01', gross_volume: 10000 } // Different month
          ],
          residuals: [
            { processing_month: '2023-06-01', final_residual: 200, agent_bps: 20 } // Different month
          ]
        }
      ];
      
      const result = formatMerchantTableData(mockMerchants, '2023-07', 15, 31);
      
      expect(result).toHaveLength(1);
      expect(result[0].volume).toBe(0);
      expect(result[0].residualEarned).toBe(0);
      expect(result[0].forecastedVolume).toBe(0);
      expect(result[0].forecastedResidual).toBe(0);
    });

    it('handles missing or null values in merchant data', () => {
      const mockMerchants = [
        {
          dba_name: 'Merchant One',
          merchant_processing_volumes: [
            { processing_month: '2023-07-01', gross_volume: null }
          ],
          residuals: [
            { processing_month: '2023-07-01', final_residual: null, agent_bps: null }
          ]
        }
      ];
      
      const result = formatMerchantTableData(mockMerchants, '2023-07', 15, 31);
      
      expect(result).toHaveLength(1);
      expect(result[0].volume).toBe(0);
      expect(result[0].agentBps).toBe(0);
      expect(result[0].residualEarned).toBe(0);
      expect(result[0].forecastedVolume).toBe(0);
      expect(result[0].forecastedResidual).toBe(0);
    });
  });

  describe('formatVolumeTrendData', () => {
    it('formats volume trend data for the chart', () => {
      const mockTrendData = [
        { processing_month: '2023-07-15', gross_volume: 10000, residual: 200 },
        { processing_month: '2023-07-16', gross_volume: 5000, residual: 100 },
        { processing_month: '2023-06-10', gross_volume: 8000, residual: 160 },
        { processing_month: '2023-06-20', gross_volume: 7000, residual: 140 }
      ];
      
      const result = formatVolumeTrendData(mockTrendData);
      
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe('2023-06');
      expect(result[0].volume).toBe(15000); // 8000 + 7000
      expect(result[0].residual).toBe(300); // 160 + 140
      
      expect(result[1].month).toBe('2023-07');
      expect(result[1].volume).toBe(15000); // 10000 + 5000
      expect(result[1].residual).toBe(300); // 200 + 100
    });

    it('handles missing residual data', () => {
      const mockTrendData = [
        { processing_month: '2023-07-15', gross_volume: 10000 }, // No residual
        { processing_month: '2023-06-10', gross_volume: 8000 } // No residual
      ];
      
      const result = formatVolumeTrendData(mockTrendData);
      
      expect(result).toHaveLength(2);
      expect(result[0].residual).toBe(0);
      expect(result[1].residual).toBe(0);
    });

    it('handles empty array', () => {
      const result = formatVolumeTrendData([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('CSV Formatting', () => {
    describe('escapeCSVValue', () => {
      it('escapes values with commas', () => {
        expect(escapeCSVValue('Hello, World')).toBe('"Hello, World"');
      });

      it('escapes values with quotes by doubling them', () => {
        expect(escapeCSVValue('Hello "World"')).toBe('"Hello ""World"""');
      });

      it('escapes values with newlines', () => {
        expect(escapeCSVValue('Hello\nWorld')).toBe('"Hello\nWorld"');
      });

      it('does not escape simple values', () => {
        expect(escapeCSVValue('Hello World')).toBe('Hello World');
      });
    });

    describe('formatCSV', () => {
      it('formats headers and rows into a valid CSV string', () => {
        const headers = ['Name', 'Volume', 'Residual'];
        const data = [
          ['Merchant One', '10000', '200'],
          ['Merchant Two', '20000', '400']
        ];
        
        const csv = formatCSV(headers, data);
        const lines = csv.split('\n');
        
        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('Name,Volume,Residual');
        expect(lines[1]).toBe('Merchant One,10000,200');
        expect(lines[2]).toBe('Merchant Two,20000,400');
      });

      it('properly escapes special characters in data', () => {
        const headers = ['Name', 'Notes'];
        const data = [
          ['Merchant, Inc.', 'Good client'],
          ['Merchant "LLC"', 'Needs follow-up']
        ];
        
        const csv = formatCSV(headers, data);
        const lines = csv.split('\n');
        
        expect(lines).toHaveLength(3);
        expect(lines[0]).toBe('Name,Notes');
        expect(lines[1]).toBe('"Merchant, Inc.",Good client');
        expect(lines[2]).toBe('"Merchant ""LLC""",Needs follow-up');
      });
    });
  });
});

// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { parseDateFromFilename, ingestResiduals, ingestVolumes } from '../lib/ingestion';

// Stub Supabase client
const supabaseStub = {
  from: vi.fn(() => supabaseStub),
  select: vi.fn(() => supabaseStub),
  eq: vi.fn(() => supabaseStub),
  match: vi.fn(() => supabaseStub),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  single: vi.fn().mockResolvedValue({ data: { id: 'test-uuid' }, error: null }),
  insert: vi.fn().mockResolvedValue({ data: { id: 'inserted-uuid' }, error: null }),
  update: vi.fn().mockResolvedValue({ data: null, error: null }),
};

// Mock imports
vi.mock('../lib/supabase', () => ({ createSupabaseServiceClient: () => supabaseStub }));
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));

// Reset mocks before each test
beforeEach(() => {
  Object.values(supabaseStub).forEach((fn: any) => fn.mockClear && fn.mockClear());
  (XLSX.read as unknown as vi.Mock).mockClear();
  (XLSX.utils.sheet_to_json as unknown as vi.Mock).mockClear();
});

describe('ingestion utilities', () => {
  describe('parseDateFromFilename', () => {
    it('extracts month and year correctly', () => {
      expect(parseDateFromFilename('report_July2023_data.xlsx')).toBe('2023-07-01');
    });

    it('defaults to today when no match', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(parseDateFromFilename('no-date-file.xlsx')).toBe(today);
    });
  });

  describe('ingestResiduals', () => {
    it('processes valid rows successfully', async () => {
      // Set up XLSX mocks
      (XLSX.read as unknown as vi.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as unknown as vi.Mock).mockReturnValue([{
        'Merchant ID': 'M1',
        'DBA Name': 'Merchant One',
        Processor: 'Proc',
        'Agent Name': 'Agent A',
        'Net Residual': 100,
        'Fees Deducted': 5,
        'Final Residual': 95,
        'Office BPS': 1.5,
        'Agent BPS': 2.5,
        'Processor Residual': 90,
      }]);
      
      // Configure Supabase stub responses for this specific test case
      // Agent lookup
      supabaseStub.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            ...supabaseStub,
            select: vi.fn().mockReturnValue({
              ...supabaseStub,
              eq: vi.fn().mockReturnValue({
                ...supabaseStub,
                single: vi.fn().mockResolvedValue({ data: { id: 'agent-uuid' }, error: null })
              })
            })
          };
        }
        // Merchant lookup
        else if (table === 'merchants') {
          return {
            ...supabaseStub,
            select: vi.fn().mockReturnValue({
              ...supabaseStub,
              eq: vi.fn().mockReturnValue({
                ...supabaseStub,
                single: vi.fn().mockResolvedValue({ data: { id: 'merchant-uuid' }, error: null })
              })
            }),
            update: vi.fn().mockReturnValue({
              ...supabaseStub,
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            }),
            insert: vi.fn().mockReturnValue({
              ...supabaseStub,
              select: vi.fn().mockReturnValue({
                ...supabaseStub,
                single: vi.fn().mockResolvedValue({ data: { id: 'new-merchant-uuid' }, error: null })
              })
            })
          };
        }
        // Residuals lookup and insert
        else if (table === 'residuals') {
          return {
            ...supabaseStub,
            select: vi.fn().mockReturnValue({
              ...supabaseStub,
              match: vi.fn().mockReturnValue({
                ...supabaseStub,
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            }),
            insert: vi.fn().mockResolvedValue({ data: { id: 'new-residual-uuid' }, error: null })
          };
        }
        // Ingestion logs
        else if (table === 'ingestion_logs') {
          return {
            ...supabaseStub,
            insert: vi.fn().mockResolvedValue({ data: null, error: null })
          };
        }
        return supabaseStub;
      });

      const result = await ingestResiduals(Buffer.from([]), 'file_July2023_.xlsx');
      expect(result.totalRows).toBe(1);
      expect(result.rowsSuccess).toBe(1);
      expect(result.rowsFailed).toBe(0);
      expect((XLSX.read as unknown as vi.Mock)).toHaveBeenCalled();
      expect(supabaseStub.from).toHaveBeenCalledWith('agents');
    });

    it('logs error for rows missing data', async () => {
      (XLSX.read as unknown as vi.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as unknown as vi.Mock).mockReturnValue([{
        'Merchant ID': null,
        'Agent Name': null,
      }]);

      const result = await ingestResiduals(Buffer.from([]), 'file_error_.xlsx');
      expect(result.totalRows).toBe(1);
      expect(result.rowsSuccess).toBe(0);
      expect(result.rowsFailed).toBe(1);
      expect(result.errorLog[2]).toBeDefined();
    });
  });

  describe('ingestVolumes', () => {
    it('processes valid volume rows successfully', async () => {
      (XLSX.read as unknown as vi.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as unknown as vi.Mock).mockReturnValue([{
        'Merchant ID': 'M10',
        'DBA Name': 'Merchant Ten',
        'Processing Month': new Date('2025-05-01'),
        'Gross Processing Volume': 1000,
        Chargebacks: 10,
        Fees: 50,
        'Estimated BPS': 1.5,
      }]);

      const result = await ingestVolumes(Buffer.from([]), 'volumes_May2025_.xlsx');
      expect(result.totalRows).toBe(1);
      expect(result.rowsSuccess).toBe(1);
      expect(result.rowsFailed).toBe(0);
      expect(supabaseStub.from).toHaveBeenCalledWith('merchant_processing_volumes');
    });

    it('logs error for invalid volume rows', async () => {
      (XLSX.read as unknown as vi.Mock).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      (XLSX.utils.sheet_to_json as unknown as vi.Mock).mockReturnValue([{
        'Merchant ID': null,
        'Processing Month': null,
      }]);

      const result = await ingestVolumes(Buffer.from([]), 'volumes_error_.xlsx');
      expect(result.totalRows).toBe(1);
      expect(result.rowsSuccess).toBe(0);
      expect(result.rowsFailed).toBe(1);
      expect(result.errorLog[2]).toBeDefined();
    });
  });
});

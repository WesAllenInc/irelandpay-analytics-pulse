import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ingestResiduals, ingestVolumes } from '@/lib/ingestion';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createSupabaseServiceClient: vi.fn(() => ({
    storage: {
      from: vi.fn((bucket) => ({
        upload: vi.fn().mockResolvedValue({ error: null })
      }))
    },
    functions: {
      invoke: vi.fn().mockImplementation((funcName, { body }) => {
        const parsedBody = JSON.parse(body);
        
        if (parsedBody.fileType === 'residuals') {
          return Promise.resolve({
            data: {
              fileName: parsedBody.fileName,
              fileType: 'residuals',
              totalRows: 10,
              rowsSuccess: 8,
              rowsFailed: 2,
              errorLog: { 3: 'Missing data', 7: 'Invalid format' }
            },
            error: null
          });
        } else if (parsedBody.fileType === 'volumes') {
          return Promise.resolve({
            data: {
              fileName: parsedBody.fileName,
              fileType: 'volumes',
              totalRows: 12,
              rowsSuccess: 11,
              rowsFailed: 1,
              errorLog: { 5: 'Invalid volume' }
            },
            error: null
          });
        }
        
        return Promise.resolve({
          data: null,
          error: { message: 'Invalid file type' }
        });
      })
    }
  }))
}));

describe('Excel Ingestion with Python Edge Function', () => {
  const mockBuffer = new ArrayBuffer(8);
  const filePathPattern = /[\w-]+\.(xlsx)$/;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('ingestResiduals', () => {
    it('should upload the file and call the edge function', async () => {
      const result = await ingestResiduals(mockBuffer, 'test-residuals.xlsx');
      
      // Verify Supabase storage was called
      const supabase = createSupabaseServiceClient();
      expect(supabase.storage.from).toHaveBeenCalledWith('uploads');
      expect(supabase.storage.from().upload).toHaveBeenCalledWith(
        expect.stringMatching(filePathPattern),
        mockBuffer,
        { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      // Verify edge function was called
      expect(supabase.functions.invoke).toHaveBeenCalledWith('excel-parser-py', {
        body: expect.stringContaining('residuals')
      });
      
      // Verify result matches expected format
      expect(result).toEqual({
        fileName: 'test-residuals.xlsx',
        fileType: 'residuals',
        totalRows: 10,
        rowsSuccess: 8,
        rowsFailed: 2,
        errorLog: { 3: 'Missing data', 7: 'Invalid format' }
      });
    });
    
    it('should handle errors appropriately', async () => {
      // Mock error scenario
      const supabase = createSupabaseServiceClient();
      (supabase.storage.from('uploads').upload as any).mockResolvedValueOnce({ 
        error: { message: 'Upload failed' }
      });
      
      const result = await ingestResiduals(mockBuffer, 'test-error.xlsx');
      
      expect(result.rowsSuccess).toBe(0);
      expect(result.rowsFailed).toBe(0);
      expect(result.errorLog).toHaveProperty('0', expect.stringContaining('Upload failed'));
    });
  });
  
  describe('ingestVolumes', () => {
    it('should upload the file and call the edge function', async () => {
      const result = await ingestVolumes(mockBuffer, 'test-volumes.xlsx');
      
      // Verify Supabase storage was called
      const supabase = createSupabaseServiceClient();
      expect(supabase.storage.from).toHaveBeenCalledWith('uploads');
      expect(supabase.storage.from().upload).toHaveBeenCalledWith(
        expect.stringMatching(filePathPattern),
        mockBuffer,
        { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      // Verify edge function was called
      expect(supabase.functions.invoke).toHaveBeenCalledWith('excel-parser-py', {
        body: expect.stringContaining('volumes')
      });
      
      // Verify result matches expected format
      expect(result).toEqual({
        fileName: 'test-volumes.xlsx',
        fileType: 'volumes',
        totalRows: 12,
        rowsSuccess: 11,
        rowsFailed: 1,
        errorLog: { 5: 'Invalid volume' }
      });
    });
    
    it('should handle edge function errors', async () => {
      // Mock edge function error
      const supabase = createSupabaseServiceClient();
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function execution failed' }
      });
      
      const result = await ingestVolumes(mockBuffer, 'test-error.xlsx');
      
      expect(result.rowsSuccess).toBe(0);
      expect(result.rowsFailed).toBe(0);
      expect(result.errorLog).toHaveProperty('0', expect.stringContaining('Function execution failed'));
    });
  });
});

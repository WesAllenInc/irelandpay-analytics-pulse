import { createSupabaseServiceClient } from '../lib/supabase';


export interface IngestionResult {
  fileName: string;
  fileType: 'residuals' | 'volumes';
  totalRows: number;
  rowsSuccess: number;
  rowsFailed: number;
  errorLog: Record<number, any>;
}

export function parseDateFromFilename(fileName: string): string {
  const match = fileName.match(/_([A-Za-z]+)(\d{4})_/);
  if (match) {
    const monthName = match[1];
    const year = match[2];
    const date = new Date(`${monthName} 1, ${year}`);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return new Date().toISOString().split('T')[0];
}

export async function ingestResiduals(buffer: any, fileName: string): Promise<IngestionResult> {
  const supabase = createSupabaseServiceClient();
  
  try {
    // Upload the file to Supabase storage
    const fileKey = `residuals/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('uploads')
      .upload(fileKey, buffer);
      
    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }
    
    // Call the Python Edge Function
    const { data, error } = await supabase
      .functions
      .invoke('excel-parser-py', {
        body: JSON.stringify({
          fileKey,
          fileType: 'residuals',
          fileName
        })
      });
      
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    // Return the result from the Python function
    return {
      fileName,
      fileType: 'residuals',
      totalRows: data.totalRows,
      rowsSuccess: data.rowsSuccess,
      rowsFailed: data.rowsFailed,
      errorLog: data.errorLog
    };
    
  } catch (err: any) {
    console.error('Error in ingestResiduals:', err);
    return {
      fileName,
      fileType: 'residuals',
      totalRows: 0,
      rowsSuccess: 0,
      rowsFailed: 0,
      errorLog: { 0: err.message }
    };
  }
}

export async function ingestVolumes(buffer: any, fileName: string): Promise<IngestionResult> {
  const supabase = createSupabaseServiceClient();
  
  try {
    // Upload the file to Supabase storage
    const fileKey = `volumes/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('uploads')
      .upload(fileKey, buffer);
      
    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }
    
    // Call the Python Edge Function
    const { data, error } = await supabase
      .functions
      .invoke('excel-parser-py', {
        body: JSON.stringify({
          fileKey,
          fileType: 'volumes',
          fileName
        })
      });
      
    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }
    
    // Return the result from the Python function
    return {
      fileName,
      fileType: 'volumes',
      totalRows: data.totalRows,
      rowsSuccess: data.rowsSuccess,
      rowsFailed: data.rowsFailed,
      errorLog: data.errorLog
    };
    
  } catch (err: any) {
    console.error('Error in ingestVolumes:', err);
    return {
      fileName,
      fileType: 'volumes',
      totalRows: 0,
      rowsSuccess: 0,
      rowsFailed: 0,
      errorLog: { 0: err.message }
    };
  }
}

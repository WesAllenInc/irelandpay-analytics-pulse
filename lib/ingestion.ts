import { createSupabaseServiceClient } from '../lib/supabase';

export interface IngestionResult {
  dataSource: string;
  dataType: 'residuals' | 'volumes';
  totalRows: number;
  rowsSuccess: number;
  rowsFailed: number;
  errorLog: Record<number, string>;
}

export interface ResidualsData {
  month: string;
  year: number;
  data: Array<{
    merchantId: string;
    amount: number;
    processingDate: string;
    agentId?: string;
  }>;
}

export interface VolumesData {
  month: string;
  year: number;
  data: Array<{
    merchantId: string;
    volume: number;
    processingDate: string;
    transactions?: number;
  }>;
}

/**
 * Ingests residuals data from the API
 * @param data Residuals data received from API
 * @returns Processing result with stats
 */
export async function ingestResiduals(data: ResidualsData): Promise<IngestionResult> {
  const supabase = createSupabaseServiceClient();
  const processingDate = new Date().toISOString();
  const dataSource = `API-${data.month}-${data.year}`;
  
  try {
    // Log the ingestion attempt
    console.log(`Processing ${data.data.length} residual records from ${dataSource}`);
    
    let rowsSuccess = 0;
    let rowsFailed = 0;
    const errorLog: Record<number, string> = {};
    
    // Process each residual record
    for (let i = 0; i < data.data.length; i++) {
      const record = data.data[i];
      try {
        const { error } = await supabase
          .from('residuals')
          .insert({
            merchant_id: record.merchantId,
            amount: record.amount,
            processing_date: record.processingDate || processingDate,
            agent_id: record.agentId || null,
            month: data.month,
            year: data.year,
            source: dataSource
          });
          
        if (error) {
          rowsFailed++;
          errorLog[i] = `Database error: ${error.message}`;
        } else {
          rowsSuccess++;
        }
      } catch (err: any) {
        rowsFailed++;
        errorLog[i] = `Processing error: ${err.message}`;
      }
    }
    
    return {
      dataSource,
      dataType: 'residuals',
      totalRows: data.data.length,
      rowsSuccess,
      rowsFailed,
      errorLog
    };
  } catch (err: any) {
    console.error('Error in ingestResiduals:', err);
    return {
      dataSource,
      dataType: 'residuals',
      totalRows: data.data?.length || 0,
      rowsSuccess: 0,
      rowsFailed: data.data?.length || 0,
      errorLog: { 0: err.message }
    };
  }
}

/**
 * Ingests processing volumes data from the API
 * @param data Volumes data received from API
 * @returns Processing result with stats
 */
export async function ingestVolumes(data: VolumesData): Promise<IngestionResult> {
  const supabase = createSupabaseServiceClient();
  const processingDate = new Date().toISOString();
  const dataSource = `API-${data.month}-${data.year}`;
  
  try {
    // Log the ingestion attempt
    console.log(`Processing ${data.data.length} volume records from ${dataSource}`);
    
    let rowsSuccess = 0;
    let rowsFailed = 0;
    const errorLog: Record<number, string> = {};
    
    // Process each volume record
    for (let i = 0; i < data.data.length; i++) {
      const record = data.data[i];
      try {
        const { error } = await supabase
          .from('volumes')
          .insert({
            merchant_id: record.merchantId,
            volume: record.volume,
            processing_date: record.processingDate || processingDate,
            transactions: record.transactions || null,
            month: data.month,
            year: data.year,
            source: dataSource
          });
          
        if (error) {
          rowsFailed++;
          errorLog[i] = `Database error: ${error.message}`;
        } else {
          rowsSuccess++;
        }
      } catch (err: any) {
        rowsFailed++;
        errorLog[i] = `Processing error: ${err.message}`;
      }
    }
    
    return {
      dataSource,
      dataType: 'volumes',
      totalRows: data.data.length,
      rowsSuccess,
      rowsFailed,
      errorLog
    };
  } catch (err: any) {
    console.error('Error in ingestVolumes:', err);
    return {
      dataSource,
      dataType: 'volumes',
      totalRows: data.data?.length || 0,
      rowsSuccess: 0,
      rowsFailed: data.data?.length || 0,
      errorLog: { 0: err.message }
    };
  }
}

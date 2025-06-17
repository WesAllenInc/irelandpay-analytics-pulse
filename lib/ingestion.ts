import { createSupabaseServiceClient } from '@/lib/supabase';
import * as XLSX from 'xlsx';

const supabase = createSupabaseServiceClient();



export interface IngestionResult {
  fileName: string;
  fileType: 'residuals' | 'volumes';
  totalRows: number;
  rowsSuccess: number;
  rowsFailed: number;
  errorLog: Record<number, any>;
}

function parseDateFromFilename(fileName: string): string {
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
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const errorLog: Record<number, any> = {};
  let rowsSuccess = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    try {
      const row = rows[i];
      const merchantId = row['Merchant ID'];
      const dbaName = row['DBA Name'];
      const processor = row['Processor'] || null;
      const agentName = row['Agent Name'];
      if (!merchantId || !agentName) throw new Error('Missing Merchant ID or Agent Name');

      // Upsert agent
      let { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('agent_name', agentName)
        .single();
      let agentId = existingAgent?.id;
      if (!agentId) {
        const { data: newAgent, error: agErr } = await supabase
          .from('agents')
          .insert({ agent_name: agentName, email: null })
          .select('id')
          .single();
        if (agErr) throw agErr;
        agentId = newAgent.id;
      }

      // Upsert merchant
      let { data: existingMerchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('merchant_id', merchantId)
        .single();
      let merchantUuid = existingMerchant?.id;
      if (!merchantUuid) {
        const { data: newMerch, error: mErr } = await supabase
          .from('merchants')
          .insert({ merchant_id: merchantId, dba_name: dbaName, processor, agent_id: agentId })
          .select('id')
          .single();
        if (mErr) throw mErr;
        merchantUuid = newMerch.id;
      } else {
        await supabase
          .from('merchants')
          .update({ dba_name: dbaName, processor, agent_id: agentId })
          .eq('id', merchantUuid);
      }

      // Insert residual if missing for the month
      const processingMonth = parseDateFromFilename(fileName);
      const { data: existingRes, error: exErr } = await supabase
        .from('residuals')
        .select('id')
        .match({ merchant_mid: merchantId, processing_month: processingMonth })
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existingRes) {
        const payload = {
          merchant_mid: merchantId,
          processing_month: processingMonth,
          net_residual: row['Net Residual'],
          fees_deducted: row['Fees Deducted'],
          final_residual: row['Final Residual'],
          office_bps: row['Office BPS'],
          agent_bps: row['Agent BPS'],
          processor_residual: row['Processor Residual'],
        };
        const { error: rErr } = await supabase.from('residuals').insert(payload);
        if (rErr) throw rErr;
      }
      

      rowsSuccess++;
    } catch (err: any) {
      errorLog[rowNum] = err.message;
    }
  }

  const totalRows = rows.length;
  const rowsFailed = totalRows - rowsSuccess;
  await supabase.from('ingestion_logs').insert([{ file_name: fileName, file_type: 'residuals', status: rowsFailed ? 'partial' : 'success', total_rows: totalRows, rows_success: rowsSuccess, rows_failed: rowsFailed, error_log: errorLog }]);
  return { fileName, fileType: 'residuals', totalRows, rowsSuccess, rowsFailed, errorLog };
}

export async function ingestVolumes(buffer: any, fileName: string): Promise<IngestionResult> {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const errorLog: Record<number, any> = {};
  let rowsSuccess = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    try {
      const row = rows[i];
      const merchantId = row['Merchant ID'];
      const dbaName = row['DBA Name'];
      const processingMonthRaw = row['Processing Month'];
      if (!merchantId || !processingMonthRaw) throw new Error('Missing Merchant ID or Processing Month');

      // Parse processing month
      const pm = processingMonthRaw instanceof Date ? processingMonthRaw : new Date(processingMonthRaw);
      const processingMonth = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}-01`;

      // Upsert merchant
      let { data: existingMerch } = await supabase
        .from('merchants')
        .select('id')
        .eq('merchant_id', merchantId)
        .single();
      let merchantUuid = existingMerch?.id;
      if (!merchantUuid) {
        const { data: newMerch, error: mErr } = await supabase
          .from('merchants')
          .insert({ merchant_id: merchantId, dba_name: dbaName })
          .select('id')
          .single();
        if (mErr) throw mErr;
        merchantUuid = newMerch.id;
      }

      // Insert volume if missing for the month
      const { data: existingVol, error: exErr } = await supabase
        .from('merchant_processing_volumes')
        .select('id')
        .match({ merchant_mid: merchantId, processing_month: processingMonth })
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existingVol) {
        const payload = {
          merchant_mid: merchantId,
          processing_month: processingMonth,
          gross_volume: row['Gross Processing Volume'],
          chargebacks: row['Chargebacks'],
          fees: row['Fees'],
          estimated_bps: row['Estimated BPS'],
        };
        const { error: vErr } = await supabase.from('merchant_processing_volumes').insert(payload);
        if (vErr) throw vErr;
      }
      

      rowsSuccess++;
    } catch (err: any) {
      errorLog[rowNum] = err.message;
    }
  }

  const totalRows = rows.length;
  const rowsFailed = totalRows - rowsSuccess;
  await supabase.from('ingestion_logs').insert([{ file_name: fileName, file_type: 'volumes', status: rowsFailed ? 'partial' : 'success', total_rows: totalRows, rows_success: rowsSuccess, rows_failed: rowsFailed, error_log: errorLog }]);
  return { fileName, fileType: 'volumes', totalRows, rowsSuccess, rowsFailed, errorLog };
}

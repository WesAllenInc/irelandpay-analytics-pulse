import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    // Get the file path from the request body
    const { path, testMode = false, testData = null } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Handle test mode or regular file processing
    let rows;
    
    if (testMode && testData) {
      // Use test data directly for integration testing
      rows = testData;
      console.log("Using test data for API route test:", testData);
    } else {
      // Download the file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseClient
        .storage
        .from('uploads')
        .download(path);
      
      if (downloadError || !fileData) {
        return NextResponse.json(
          { success: false, error: `Error downloading file: ${downloadError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Convert the file to an array buffer and parse with XLSX
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 0 });
    }
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in Excel file' },
        { status: 400 }
      );
    }

    // Process and validate the data - match the format expected by the Supabase Edge Function
    const merchantRows = new Map<string, { merchant_dba: string; datasource: string }>();
    const metricsToUpsert: Array<any> = [];

    // Type the row data properly
    for (const row of rows as Record<string, any>[]) {
      const rawMID = row["MID"];
      const rawDBA = row["Merchant DBA"];
      const rawDatasource = row["Datasource"];
      const rawTotalTxns = row["Total Transactions"];
      const rawTotalVol = row["Total Volume"];
      const rawBatchDate = row["Last Batch Date"];

      if (!rawMID || !rawBatchDate) {
        // Skip invalid rows
        continue;
      }

      // Parse month = YYYY-MM-01
      let month: string;
      const ds = String(rawBatchDate).trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(ds)) {
        const [m,,y] = ds.split("/");
        month = `${y}-${m.padStart(2, "0")}-01`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
        month = ds.substring(0, 7) + "-01";
      } else {
        const dt = new Date(ds);
        if (!isNaN(dt.getTime())) {
          month = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
        } else {
          continue;
        }
      }

      // Parse numbers
      const totalTxns = rawTotalTxns != null
        ? parseInt(String(rawTotalTxns).replace(/,/g, ""), 10) || 0
        : 0;
      const totalVol = rawTotalVol != null
        ? parseFloat(String(rawTotalVol).replace(/[\$,]/g, "")) || 0
        : 0;

      // Collect merchant metadata for upsert
      merchantRows.set(rawMID, {
        merchant_dba: rawDBA ? String(rawDBA).trim() : "",
        datasource: rawDatasource ? String(rawDatasource).trim() : "",
      });

      // Build metrics row
      metricsToUpsert.push({
        mid: rawMID,
        month: month,
        total_txns: totalTxns,
        total_volume: totalVol,
        source_file: path,
      });
    }

    // Upsert merchants (batch)
    let merchantsInserted = 0;
    if (merchantRows.size > 0) {
      const merchantsPayload = Array.from(merchantRows.entries()).map(([mid, md]) => ({
        mid,
        merchant_dba: md.merchant_dba,
        datasource: md.datasource,
      }));
      
      const { error: merchantError } = await supabaseClient
        .from("merchants")
        .upsert(merchantsPayload, { onConflict: "mid", ignoreDuplicates: false });
        
      if (merchantError) {
        return NextResponse.json(
          { success: false, error: `Merchants upsert failed: ${merchantError.message}` },
          { status: 500 }
        );
      }
      
      merchantsInserted = merchantsPayload.length;
    }

    // Upsert metrics (batch)
    let metricsInserted = 0;
    if (metricsToUpsert.length > 0) {
      const { error: metricsError } = await supabaseClient
        .from("merchant_metrics")
        .upsert(metricsToUpsert, { onConflict: "mid,month", ignoreDuplicates: false });
        
      if (metricsError) {
        return NextResponse.json(
          { success: false, error: `Metrics upsert failed: ${metricsError.message}` },
          { status: 500 }
        );
      }
      
      metricsInserted = metricsToUpsert.length;
    }

    // Return success response matching the Edge Function format
    return NextResponse.json({
      success: true,
      message: `Successfully processed Excel data`,
      merchants: merchantsInserted,
      metrics: metricsInserted,
      fileName: path.split('/').pop()
    });
    
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { success: false, error: `Unexpected error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

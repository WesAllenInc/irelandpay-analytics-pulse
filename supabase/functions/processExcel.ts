import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// Initialize Supabase service‐role client
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { path } = await req.json(); // e.g. "merchant/May2025.xlsx"
    // Download the file from storage
    const { data: fileData, error: downloadError } =
      await supabaseAdmin.storage
        .from("uploads")
        .download(path);
    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: "Cannot download file: " + downloadError?.message }),
        { status: 500 }
      );
    }

    // Parse Excel
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 0 }); // array of objects

    // Transform and upsert
    const merchantRows = new Map<string, { merchant_dba: string; datasource: string }>();
    const metricsToUpsert: Array<any> = [];

    for (const [index, row] of rows.entries()) {
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
    if (merchantRows.size > 0) {
      const merchantsPayload = Array.from(merchantRows.entries()).map(([mid, md]) => ({
        mid,
        merchant_dba: md.merchant_dba,
        datasource: md.datasource,
      }));
      const { error: merchantError } = await supabaseAdmin
        .from("merchants")
        .upsert(merchantsPayload, { onConflict: "mid", ignoreDuplicates: false });
      if (merchantError) {
        throw new Error("Merchants upsert failed: " + merchantError.message);
      }
    }

    // Upsert metrics (batch)
    if (metricsToUpsert.length > 0) {
      const { error: metricsError } = await supabaseAdmin
        .from("merchant_metrics")
        .upsert(metricsToUpsert, { onConflict: "mid,month", ignoreDuplicates: false });
      if (metricsError) {
        throw new Error("Metrics upsert failed: " + metricsError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        merchants: merchantRows.size,
        metrics: metricsToUpsert.length,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

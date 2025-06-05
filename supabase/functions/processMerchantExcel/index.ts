import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

// Initialize Supabase client with service role key for admin access
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  try {
    // Parse request body
    const { path } = await req.json();
    
    if (!path || typeof path !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid request. 'path' is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Download the Excel file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from("merchants")
      .download(path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: downloadError?.message || "Failed to download file" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the Excel file
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 0 });
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data found in Excel file" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process each row and prepare for database insertion
    const merchantRows: any[] = [];
    const merchantMetricsRows: any[] = [];
    const processedMIDs: Set<string> = new Set();
    
    for (const row of rows) {
      // Skip header row or empty rows
      if (typeof row !== "object" || !row["MID"]) {
        continue;
      }

      // Extract merchant data
      const mid = String(row["MID"] || "").trim();
      const dba = String(row["DBA Name"] || row["Merchant"] || "").trim();
      const address = String(row["Address"] || "").trim();
      const city = String(row["City"] || "").trim();
      const state = String(row["State"] || "").trim();
      const zip = String(row["Zip"] || row["ZIP"] || "").trim();
      const phone = String(row["Phone"] || "").trim();
      const email = String(row["Email"] || "").trim();
      const status = String(row["Status"] || "active").trim().toLowerCase();
      const category = String(row["Category"] || row["MCC"] || "").trim();
      
      // Skip if MID is missing
      if (!mid) {
        continue;
      }

      // Avoid duplicate MIDs
      if (processedMIDs.has(mid)) {
        continue;
      }
      processedMIDs.add(mid);

      // Add to merchant rows
      merchantRows.push({
        mid,
        merchant_dba: dba,
        address,
        city,
        state,
        zip,
        phone,
        email,
        status,
        category,
        datasource: "merchant_excel",
      });

      // Extract metrics data if available
      if (row["Monthly Volume"] || row["Average Ticket"] || row["Transaction Count"]) {
        const monthlyVolume = typeof row["Monthly Volume"] === "number" 
          ? row["Monthly Volume"] 
          : parseFloat(String(row["Monthly Volume"] || "0").replace(/[$,]/g, "")) || 0;
        
        const avgTicket = typeof row["Average Ticket"] === "number" 
          ? row["Average Ticket"] 
          : parseFloat(String(row["Average Ticket"] || "0").replace(/[$,]/g, "")) || 0;
        
        const transactionCount = typeof row["Transaction Count"] === "number" 
          ? row["Transaction Count"] 
          : parseInt(String(row["Transaction Count"] || "0").replace(/,/g, "")) || 0;
        
        // Current date for the metrics record
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        
        merchantMetricsRows.push({
          mid,
          monthly_volume: monthlyVolume,
          avg_ticket: avgTicket,
          transaction_count: transactionCount,
          data_month: `${year}-${month}-01`,
          source_file: path,
        });
      }
    }

    // Upsert merchant data
    if (merchantRows.length > 0) {
      const { error: merchantError } = await supabaseAdmin
        .from("merchants")
        .upsert(merchantRows, { 
          onConflict: "mid",
          ignoreDuplicates: false // Update if exists
        });

      if (merchantError) {
        console.error("Error upserting merchants:", merchantError);
        return new Response(
          JSON.stringify({ error: `Error upserting merchants: ${merchantError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert merchant metrics if available
    let metricsInserted = 0;
    if (merchantMetricsRows.length > 0) {
      const { error: metricsError } = await supabaseAdmin
        .from("merchant_metrics")
        .upsert(merchantMetricsRows, {
          onConflict: "mid,data_month",
          ignoreDuplicates: false // Update if exists
        });

      if (metricsError) {
        console.error("Error upserting merchant metrics:", metricsError);
        // Continue processing even if metrics insertion fails
        // We still consider the merchant data insertion a success
      } else {
        metricsInserted = merchantMetricsRows.length;
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        merchants_processed: merchantRows.length,
        metrics_processed: metricsInserted,
        source_file: path
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

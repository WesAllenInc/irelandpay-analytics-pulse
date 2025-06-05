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
      .from("residuals")
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

    // Extract payout_month from filename or header if not in data
    // Assuming filename format is like "residuals/Apr2025.xlsx"
    let payoutMonthStr = "";
    const filenameParts = path.split("/");
    const filename = filenameParts[filenameParts.length - 1];
    // Try to extract from filename (e.g., Apr2025.xlsx -> 2025-04-01)
    const monthMatch = filename.match(/([A-Za-z]+)(\d{4})/);
    
    if (monthMatch) {
      const monthName = monthMatch[1];
      const year = monthMatch[2];
      const monthMap: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const monthNum = monthMap[monthName.substring(0, 3)];
      if (monthNum) {
        payoutMonthStr = `${year}-${monthNum}-01`;
      }
    }

    // Process each row
    const merchantUpserts: any[] = [];
    const residualRowsArray: any[] = [];

    for (const row of rows) {
      // Skip header row or empty rows
      if (typeof row !== "object" || !row["Merchant ID"]) {
        continue;
      }

      // Extract raw data from row
      const rawMID = String(row["Merchant ID"] || "");
      const rawDBA = String(row["Merchant"] || "");
      const rawTransactions = row["Transactions"];
      const rawSales = row["Sales Amount"];
      const rawIncome = row["Income"];
      const rawExpenses = row["Expenses"];
      const rawNet = row["Net"];
      const rawBPS = row["BPS"];
      const rawPct = row["%"];
      const rawAgentNet = row["Agent Net"];
      const rawPayoutDate = row["Payout Date"];

      // Skip if missing essential fields
      if (!rawMID || !rawDBA) {
        continue;
      }

      // Normalize data
      const normalizedMID = rawMID.trim();
      const normalizedDBA = rawDBA.trim();
      
      // Parse numeric values (handle currency strings like "$1,234.56")
      const parseCurrency = (val: any): number => {
        if (typeof val === "number") return val;
        if (!val) return 0;
        
        const strVal = String(val);
        return parseFloat(strVal.replace(/[$,]/g, "")) || 0;
      };

      const parsedTransactions = typeof rawTransactions === "number" 
        ? rawTransactions 
        : parseInt(String(rawTransactions || "0").replace(/,/g, "")) || 0;
      
      const parsedSales = parseCurrency(rawSales);
      const parsedIncome = parseCurrency(rawIncome);
      const parsedExpenses = parseCurrency(rawExpenses);
      const parsedNet = parseCurrency(rawNet);
      const parsedBPS = parseCurrency(rawBPS);
      const parsedPct = parseCurrency(rawPct);
      const parsedAgentNet = parseCurrency(rawAgentNet);

      // Determine payout month
      let payoutMonth = payoutMonthStr;
      if (rawPayoutDate) {
        try {
          // If date is in Excel format (number), convert it
          if (typeof rawPayoutDate === "number") {
            const excelDate = XLSX.SSF.parse_date_code(rawPayoutDate);
            payoutMonth = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-01`;
          } else if (typeof rawPayoutDate === "string") {
            // Try to parse various date formats
            const dateParts = rawPayoutDate.split(/[/\-]/);
            if (dateParts.length >= 2) {
              let year, month;
              // Handle different date formats (MM/DD/YYYY or YYYY-MM-DD)
              if (dateParts[0].length === 4) {
                // YYYY-MM-DD format
                year = dateParts[0];
                month = dateParts[1];
              } else {
                // MM/DD/YYYY format
                month = dateParts[0];
                year = dateParts[2];
              }
              payoutMonth = `${year}-${String(month).padStart(2, '0')}-01`;
            }
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }

      // If we couldn't determine payout month, skip this row
      if (!payoutMonth) {
        console.warn(`Skipping row with MID ${normalizedMID} due to missing payout month`);
        continue;
      }

      // Add merchant to upsert array (for the merchants table)
      merchantUpserts.push({
        mid: normalizedMID,
        merchant_dba: normalizedDBA,
        datasource: "residual_excel"
      });

      // Add residual payout data
      residualRowsArray.push({
        mid: normalizedMID,
        merchant_dba: normalizedDBA,
        payout_month: payoutMonth,
        transactions: parsedTransactions,
        sales_amount: parsedSales,
        income: parsedIncome,
        expenses: parsedExpenses,
        net_profit: parsedNet,
        bps: parsedBPS,
        commission_pct: parsedPct,
        agent_net: parsedAgentNet,
        source_file: path
      });
    }

    // Upsert merchants data first
    if (merchantUpserts.length > 0) {
      const { error: merchantError } = await supabaseAdmin
        .from("merchants")
        .upsert(merchantUpserts, { 
          onConflict: "mid",
          ignoreDuplicates: true // Only update if not exists
        });

      if (merchantError) {
        console.error("Error upserting merchants:", merchantError);
        return new Response(
          JSON.stringify({ error: `Error upserting merchants: ${merchantError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert residual payouts data
    if (residualRowsArray.length > 0) {
      const { error: residualError } = await supabaseAdmin
        .from("residual_payouts")
        .upsert(residualRowsArray, {
          onConflict: "mid,payout_month",
          ignoreDuplicates: false // Update if exists
        });

      if (residualError) {
        console.error("Error upserting residual payouts:", residualError);
        return new Response(
          JSON.stringify({ error: `Error upserting residual payouts: ${residualError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted: residualRowsArray.length,
        merchants_updated: merchantUpserts.length
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

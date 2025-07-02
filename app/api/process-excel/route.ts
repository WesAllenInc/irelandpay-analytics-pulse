import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Get the file path and dataset type from the request body
    const { path, datasetType = "merchants", testMode = false, testData = null } = await request.json();
    
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
      // Use the Python Edge Function for Excel processing
      const supabase = createSupabaseServerClient();
      
      // Call the Python Edge Function to process the file
      const { data: processResult, error: processError } = await supabase
        .functions
        .invoke('excel-parser-py', {
          body: JSON.stringify({
            fileKey: path,
            fileType: datasetType,
            fileName: path.split('/').pop() || path
          })
        });
      
      if (processError || !processResult) {
        return NextResponse.json(
          { success: false, error: `Error processing file: ${processError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
      
      // The processed data is already available in the result
      if (processResult.rowsFailed > 0) {
        console.warn(`Some rows failed processing: ${processResult.rowsFailed} out of ${processResult.totalRows}`); 
      }
      
      // Return the processing result directly
      return NextResponse.json({
        success: true,
        message: `Successfully processed ${datasetType} data`,
        totalRows: processResult.totalRows,
        successRows: processResult.rowsSuccess,
        failedRows: processResult.rowsFailed,
        fileName: path.split('/').pop() || path
      });
    }
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in Excel file' },
        { status: 400 }
      );
    }

    // Process and validate the data based on dataset type
    if (datasetType === "residuals") {
      // Process as residual data
      return await processResidualData(path, rows);
    } else {
      // Process as merchant data
      return await processMerchantData(path, rows);
    }
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { success: false, error: `Unexpected error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function processMerchantData(path: string, rows: Record<string, any>[]) {
  try {
    const merchantRows = new Map<string, { merchant_dba: string; datasource: string }>();
    const metricsToUpsert: Array<any> = [];

    // Type the row data properly
    for (const row of rows) {
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
      
      const supabase = createSupabaseServerClient();
      const { error: merchantError } = await supabase
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
      const supabase = createSupabaseServerClient();
      const { error: metricsError } = await supabase
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
      message: `Successfully processed merchant Excel data`,
      merchants: merchantsInserted,
      metrics: metricsInserted,
      fileName: path.split('/').pop()
    });
  } catch (error: any) {
    console.error('Error processing merchant Excel file:', error);
    return NextResponse.json(
      { success: false, error: `Unexpected error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function processResidualData(path: string, rows: Record<string, any>[]) {
  try {
    // Extract payout_month from filename or find in data
    // Assuming filename format like "residual/Apr2025.xlsx"
    let payoutMonthStr = "";
    const filenameParts = path.split("/");
    const filename = filenameParts[filenameParts.length - 1];
    // Try to extract from filename (e.g., Apr2025.xlsx -> 2025-04-01)
    const monthMatch = filename.match(/([A-Za-z]+)(\d{4})/i);
    
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
    
    const merchantUpserts: any[] = [];
    const residualRows: any[] = [];
    
    for (const row of rows) {
      // Skip header row or empty rows
      if (!row["Merchant ID"] && !row["MID"]) {
        continue;
      }
      
      // Extract raw data from row (handle different field naming conventions)
      const rawMID = String(row["Merchant ID"] || row["MID"] || "");
      const rawDBA = String(row["Merchant"] || row["Merchant DBA"] || row["DBA"] || "");
      const rawTransactions = row["Transactions"] || row["Transaction Count"] || row["Txns"] || 0;
      const rawSales = row["Sales Amount"] || row["Sales Volume"] || row["Volume"] || 0;
      const rawIncome = row["Income"] || row["Revenue"] || 0;
      const rawExpenses = row["Expenses"] || row["Costs"] || 0;
      const rawNet = row["Net"] || row["Net Profit"] || 0;
      const rawBPS = row["BPS"] || 0;
      const rawPct = row["%"] || row["Commission %"] || 0;
      const rawAgentNet = row["Agent Net"] || row["Agent Payout"] || 0;
      const rawPayoutDate = row["Payout Date"] || row["Date"];
      
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
        : parseInt(String(rawTransactions).replace(/,/g, "")) || 0;
        
      const parsedSales = parseCurrency(rawSales);
      const parsedIncome = parseCurrency(rawIncome);
      const parsedExpenses = parseCurrency(rawExpenses);
      const parsedNet = parseCurrency(rawNet);
      const parsedBPS = parseCurrency(rawBPS);
      const parsedPct = parseCurrency(rawPct);
      const parsedAgentNet = parseCurrency(rawAgentNet);
      
      // Determine payout month from the data or filename
      let payoutMonth = payoutMonthStr;
      
      if (rawPayoutDate) {
        try {
          // Handle date in various formats
          if (typeof rawPayoutDate === "string") {
            // Try to parse various date formats
            const dateParts = rawPayoutDate.split(/[\/\-]/);
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
          } else if (rawPayoutDate instanceof Date) {
            payoutMonth = `${rawPayoutDate.getFullYear()}-${String(rawPayoutDate.getMonth() + 1).padStart(2, '0')}-01`;
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
      
      // Add merchant to upsert array
      merchantUpserts.push({
        mid: normalizedMID,
        merchant_dba: normalizedDBA,
        datasource: "residual_excel"
      });
      
      // Add residual payout data
      residualRows.push({
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
    let merchantsInserted = 0;
    if (merchantUpserts.length > 0) {
      const supabase = createSupabaseServerClient();
      const { error: merchantError } = await supabase
        .from("merchants")
        .upsert(merchantUpserts, { 
          onConflict: "mid",
          ignoreDuplicates: true // Only update if not exists
        });

      if (merchantError) {
        return NextResponse.json(
          { success: false, error: `Error upserting merchants: ${merchantError.message}` },
          { status: 500 }
        );
      }
      
      merchantsInserted = merchantUpserts.length;
    }
    
    // Upsert residual payouts data
    let residualsInserted = 0;
    if (residualRows.length > 0) {
      const supabase = createSupabaseServerClient();
      const { error: residualError } = await supabase
        .from("residual_payouts")
        .upsert(residualRows, {
          onConflict: "mid,payout_month",
          ignoreDuplicates: false // Update if exists
        });

      if (residualError) {
        return NextResponse.json(
          { success: false, error: `Error upserting residual payouts: ${residualError.message}` },
          { status: 500 }
        );
      }
      
      residualsInserted = residualRows.length;
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed residual Excel data`,
      merchants: merchantsInserted,
      residuals: residualsInserted,
      fileName: path.split('/').pop()
    });
  } catch (error: any) {
    console.error('Error processing residual Excel file:', error);
    return NextResponse.json(
      { success: false, error: `Unexpected error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

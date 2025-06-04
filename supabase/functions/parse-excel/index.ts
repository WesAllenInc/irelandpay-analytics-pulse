import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { serve } from 'std/server';

// Define the expected structure of merchant data
interface MerchantData {
  merchantId: string;
  merchantName: string;
  transactionDate: string;
  amount: number;
  currency: string;
  status: string;
  [key: string]: any; // Allow for additional fields
}

serve(async (req: Request) => {
  try {
    // Get the request body
    const { fileKey } = await req.json();
    
    if (!fileKey) {
      return new Response(
        JSON.stringify({ error: "No file key provided" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get environment variables
    // Note: In Deno runtime, these will be available via Deno.env.get
    // For local development, we'll use process.env as a fallback
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("uploads")
      .download(`merchant/${fileKey}`);
    
    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: `Error downloading file: ${downloadError?.message || "Unknown error"}` }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Convert the file to an array buffer and parse with XLSX
    const arrayBuffer = await fileData!.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<MerchantData>(sheet, { header: 0 });
    
    // Use rows as our JSON data
    const jsonData = rows;
    
    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data found in Excel file" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Process and validate the data
    const processedData = jsonData.map((row: MerchantData) => {
      // Basic validation and transformation could be done here
      return {
        merchant_id: row.merchantId || "",
        merchant_name: row.merchantName || "",
        transaction_date: row.transactionDate || "",
        amount: typeof row.amount === "number" ? row.amount : 0,
        currency: row.currency || "USD",
        status: row.status || "pending",
        raw_data: row, // Store the original row data
        created_at: new Date().toISOString()
      };
    });

    // Insert the processed data into the database
    const { data: insertData, error: insertError } = await supabase
      .from("merchant_transactions")
      .insert(processedData);
    
    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Error inserting data: ${insertError.message}` }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Return success response with summary
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedData.length} records`,
        summary: {
          totalRecords: processedData.length,
          fileName: fileKey
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${errorMessage}` }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

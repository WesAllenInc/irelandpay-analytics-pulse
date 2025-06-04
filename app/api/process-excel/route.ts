import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    // Get the file path from the request body
    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'No file path provided' },
        { status: 400 }
      );
    }

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
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 0 });
    
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in Excel file' },
        { status: 400 }
      );
    }

    // Process and validate the data
    const processedData = rows.map((row: any) => {
      // Basic validation and transformation
      return {
        merchant_id: row.merchantId || '',
        merchant_name: row.merchantName || '',
        transaction_date: row.transactionDate || '',
        amount: typeof row.amount === 'number' ? row.amount : 0,
        currency: row.currency || 'USD',
        status: row.status || 'pending',
        raw_data: row, // Store the original row data
        created_at: new Date().toISOString()
      };
    });

    // Insert the processed data into the database
    const { data: insertData, error: insertError } = await supabaseClient
      .from('merchant_transactions')
      .insert(processedData);
    
    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Error inserting data: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedData.length} records`,
      inserted: processedData.length,
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

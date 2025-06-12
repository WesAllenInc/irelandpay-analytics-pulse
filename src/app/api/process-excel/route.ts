import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { filename, filePath, datasetType } = await request.json();
    
    if (!filename || !filePath || !datasetType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('uploads')
      .download(filePath);
    
    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return NextResponse.json(
        { success: false, error: `Error downloading file: ${downloadError.message}` },
        { status: 500 }
      );
    }

    // Parse Excel file
    const workbook = XLSX.read(await fileData.arrayBuffer(), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data found in Excel file' },
        { status: 400 }
      );
    }

    // Process data based on dataset type
    if (datasetType === 'merchants') {
      return await processMerchantData(jsonData);
    } else if (datasetType === 'residuals') {
      return await processResidualData(jsonData);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid dataset type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { success: false, error: `Error processing Excel file: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

async function processMerchantData(data: any[]) {
  try {
    // Validate required fields in merchant data
    if (!validateMerchantData(data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid merchant data format' },
        { status: 400 }
      );
    }

    // Process merchant records
    const { count: merchantCount, error: merchantError } = await supabase
      .from('merchants')
      .upsert(
        data.map(item => ({
          merchant_id: item.merchant_id || item.MerchantID,
          merchant_name: item.merchant_name || item.MerchantName,
          status: item.status || item.Status || 'active',
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'merchant_id' }
      );

    if (merchantError) {
      console.error('Error inserting merchant data:', merchantError);
      return NextResponse.json(
        { success: false, error: `Database error: ${merchantError.message}` },
        { status: 500 }
      );
    }

    // Process transaction metrics if present
    let metricsCount = 0;
    if (hasTransactionMetrics(data)) {
      const { count, error: metricsError } = await supabase
        .from('merchant_transactions')
        .upsert(
          data.map(item => ({
            merchant_id: item.merchant_id || item.MerchantID,
            transaction_date: new Date().toISOString().split('T')[0],
            volume: item.volume || item.Volume || 0,
            transaction_count: item.transaction_count || item.TransactionCount || 0,
            average_ticket: item.average_ticket || item.AverageTicket || 0,
          })),
          { onConflict: 'merchant_id, transaction_date' }
        );
      
      if (metricsError) {
        console.error('Error inserting transaction metrics:', metricsError);
        return NextResponse.json(
          { success: false, error: `Database error: ${metricsError.message}` },
          { status: 500 }
        );
      }
      
      metricsCount = count || 0;
    }

    return NextResponse.json({
      success: true,
      message: 'Data processed successfully',
      merchants: data.length,
      metrics: metricsCount,
    });
  } catch (error) {
    console.error('Error in processMerchantData:', error);
    return NextResponse.json(
      { success: false, error: `Processing error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

async function processResidualData(data: any[]) {
  try {
    // Validate required fields in residual data
    if (!validateResidualData(data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid residual data format' },
        { status: 400 }
      );
    }

    // Process residual records
    const { count: residualsCount, error: residualError } = await supabase
      .from('residuals')
      .upsert(
        data.map(item => ({
          merchant_id: item.merchant_id || item.MerchantID,
          month: item.month || item.Month,
          year: item.year || item.Year,
          amount: item.amount || item.Amount || 0,
          processor_fee: item.processor_fee || item.ProcessorFee || 0,
          net_amount: item.net_amount || item.NetAmount || 0,
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'merchant_id, month, year' }
      );

    if (residualError) {
      console.error('Error inserting residual data:', residualError);
      return NextResponse.json(
        { success: false, error: `Database error: ${residualError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Residual data processed successfully',
      merchants: countUniqueMerchants(data),
      residuals: residualsCount || data.length,
    });
  } catch (error) {
    console.error('Error in processResidualData:', error);
    return NextResponse.json(
      { success: false, error: `Processing error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Helper Functions
function validateMerchantData(data: any[]): boolean {
  // Check if first record has required fields
  const firstRecord = data[0];
  return !!(
    firstRecord && 
    (firstRecord.merchant_id || firstRecord.MerchantID) && 
    (firstRecord.merchant_name || firstRecord.MerchantName)
  );
}

function validateResidualData(data: any[]): boolean {
  // Check if first record has required fields
  const firstRecord = data[0];
  return !!(
    firstRecord && 
    (firstRecord.merchant_id || firstRecord.MerchantID) && 
    (firstRecord.month || firstRecord.Month) && 
    (firstRecord.year || firstRecord.Year) &&
    (firstRecord.amount !== undefined || firstRecord.Amount !== undefined)
  );
}

function hasTransactionMetrics(data: any[]): boolean {
  // Check if data includes transaction metrics
  const firstRecord = data[0];
  return !!(
    firstRecord && (
      firstRecord.volume !== undefined || 
      firstRecord.Volume !== undefined ||
      firstRecord.transaction_count !== undefined ||
      firstRecord.TransactionCount !== undefined ||
      firstRecord.average_ticket !== undefined ||
      firstRecord.AverageTicket !== undefined
    )
  );
}

function countUniqueMerchants(data: any[]): number {
  const merchantIds = new Set();
  data.forEach(item => {
    const id = item.merchant_id || item.MerchantID;
    if (id) merchantIds.add(id);
  });
  return merchantIds.size;
}

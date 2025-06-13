/**
 * Test Merchant Upload Pipeline
 * 
 * This script tests the merchant upload pipeline by:
 * 1. Generating a sample merchant Excel file
 * 2. Uploading it to Supabase Storage
 * 3. Processing it with the API endpoint
 * 4. Verifying the data was saved correctly in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const supabase = createSupabaseClient();

// Test data generation
function generateSampleMerchantExcel() {
  console.log('🔧 Generating sample merchant Excel file...');
  const currentDate = new Date();
  const fileName = `Merchants_${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
  const filePath = path.join(__dirname, '../test-data', fileName);
  
  // Create test-data directory if it doesn't exist
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Generate sample data - 5 merchants with transaction data
  const testData = [];
  for (let i = 1; i <= 5; i++) {
    const mid = `TEST${String(i).padStart(6, '0')}`;
    const dba = `Test Merchant ${i}`;
    
    testData.push({
      'MID': mid,
      'Merchant DBA': dba,
      'Datasource': 'Test',
      'Total Transactions': 100 * i,
      'Total Volume': 10000 * i,
      'Last Batch Date': `${currentDate.getMonth() + 1}/01/${currentDate.getFullYear()}`
    });
  }

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(wb, ws, 'Merchants');
  
  // Write to file
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Generated sample file at: ${filePath}`);
  
  return { filePath, fileName };
}

// Upload file to Supabase Storage
async function uploadMerchantFile(filePath, fileName) {
  console.log('📤 Uploading file to Supabase Storage...');
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase
      .storage
      .from('uploads')
      .upload(`merchant/${fileName}`, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    console.log('✅ File uploaded successfully');
    return `merchant/${fileName}`;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

// Process Excel file using API
async function processMerchantFile(filePath) {
  console.log('🔄 Processing Excel file...');
  
  try {
    // Call the API endpoint directly
    const fetch = require('node-fetch');
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/process-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        path: filePath,
        datasetType: 'merchants'
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Processing failed: ${result.error}`);
    }
    
    console.log('✅ File processed successfully');
    console.log(`📊 Results: ${result.merchants} merchants and ${result.metrics} metrics processed`);
    return result;
  } catch (error) {
    console.error('❌ Processing error:', error);
    throw error;
  }
}

// Verify data in database
async function verifyMerchantData() {
  console.log('🔍 Verifying data in database...');
  
  try {
    // Check merchants table
    const { data: merchants, error: merchantError } = await supabase
      .from('merchants')
      .select()
      .like('mid', 'TEST%');
      
    if (merchantError) {
      throw new Error(`Query failed: ${merchantError.message}`);
    }
    
    console.log(`✅ Found ${merchants.length} test merchants in database`);
    
    // Check merchant_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('merchant_metrics')
      .select()
      .like('mid', 'TEST%');
      
    if (metricsError) {
      throw new Error(`Query failed: ${metricsError.message}`);
    }
    
    console.log(`✅ Found ${metrics.length} test metrics records in database`);
    
    return { merchants, metrics };
  } catch (error) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

// Cleanup test data
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete from merchant_metrics table
    const { error: deleteMetricsError } = await supabase
      .from('merchant_metrics')
      .delete()
      .like('mid', 'TEST%');
      
    if (deleteMetricsError) {
      throw new Error(`Delete failed: ${deleteMetricsError.message}`);
    }
    
    // Delete from merchants table
    const { error: deleteMerchantError } = await supabase
      .from('merchants')
      .delete()
      .like('mid', 'TEST%');
      
    if (deleteMerchantError) {
      throw new Error(`Delete failed: ${deleteMerchantError.message}`);
    }
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

// Run the full test
async function runTest() {
  try {
    console.log('🚀 Starting merchant upload pipeline test...');
    
    // Generate test file
    const { filePath, fileName } = generateSampleMerchantExcel();
    
    // Upload file
    const storagePath = await uploadMerchantFile(filePath, fileName);
    
    // Process file
    await processMerchantFile(storagePath);
    
    // Verify data
    await verifyMerchantData();
    
    // Ask if user wants to clean up
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Do you want to clean up test data? (y/n) ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await cleanupTestData();
      }
      
      console.log('✨ Test completed successfully');
      readline.close();
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();

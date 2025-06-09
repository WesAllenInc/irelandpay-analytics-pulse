/**
 * Test Residual Upload Pipeline
 * 
 * This script tests the residual upload pipeline by:
 * 1. Generating a sample residual Excel file
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
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test data generation
function generateSampleResidualExcel() {
  console.log('🔧 Generating sample residual Excel file...');
  const currentDate = new Date();
  const fileName = `Residuals_${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
  const filePath = path.join(__dirname, '../test-data', fileName);
  
  // Create test-data directory if it doesn't exist
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Generate sample data - 5 merchants with residual data
  const testData = [];
  for (let i = 1; i <= 5; i++) {
    const mid = `TEST${String(i).padStart(6, '0')}`;
    const dba = `Test Merchant ${i}`;
    
    testData.push({
      'Merchant ID': mid,
      'Merchant': dba,
      'Transactions': 100 * i,
      'Sales Amount': 10000 * i,
      'Income': 300 * i,
      'Expenses': 100 * i,
      'Net': 200 * i,
      'BPS': 30,
      '%': 50,
      'Agent Net': 100 * i,
      'Payout Date': `${currentDate.getMonth() + 1}/01/${currentDate.getFullYear()}`
    });
  }

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(wb, ws, 'Residuals');
  
  // Write to file
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Generated sample file at: ${filePath}`);
  
  return { filePath, fileName };
}

// Upload file to Supabase Storage
async function uploadResidualFile(filePath, fileName) {
  console.log('📤 Uploading file to Supabase Storage...');
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase
      .storage
      .from('uploads')
      .upload(`residual/${fileName}`, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    console.log('✅ File uploaded successfully');
    return `residual/${fileName}`;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

// Process Excel file using API
async function processResidualFile(filePath) {
  console.log('🔄 Processing Excel file...');
  
  try {
    // Call API endpoint directly with fetch
    const fetch = require('node-fetch');
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/processResidualExcel`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ path: filePath })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Processing failed: ${result.error}`);
    }
    
    console.log('✅ File processed successfully');
    console.log(`📊 Results: ${result.inserted} residual records processed`);
    return result;
  } catch (error) {
    console.error('❌ Processing error:', error);
    throw error;
  }
}

// Verify data in database
async function verifyResidualData() {
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
    
    // Check residual_payouts table
    const { data: residuals, error: residualError } = await supabase
      .from('residual_payouts')
      .select()
      .like('mid', 'TEST%');
      
    if (residualError) {
      throw new Error(`Query failed: ${residualError.message}`);
    }
    
    console.log(`✅ Found ${residuals.length} test residual records in database`);
    
    return { merchants, residuals };
  } catch (error) {
    console.error('❌ Verification error:', error);
    throw error;
  }
}

// Cleanup test data
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete from residual_payouts table
    const { error: deleteResidualError } = await supabase
      .from('residual_payouts')
      .delete()
      .like('mid', 'TEST%');
      
    if (deleteResidualError) {
      throw new Error(`Delete failed: ${deleteResidualError.message}`);
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
    console.log('🚀 Starting residual upload pipeline test...');
    
    // Generate test file
    const { filePath, fileName } = generateSampleResidualExcel();
    
    // Upload file
    const storagePath = await uploadResidualFile(filePath, fileName);
    
    // Process file
    await processResidualFile(storagePath);
    
    // Verify data
    await verifyResidualData();
    
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

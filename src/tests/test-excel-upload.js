/**
 * Test script for verifying the Excel upload flow
 * This script:
 * 1. Creates a sample Excel file with test data
 * 2. Tests uploading to Supabase Storage
 * 3. Tests processing via the API
 * 4. Verifies data in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const TEST_FILE_MERCHANT = 'test-merchant-data.xlsx';
const TEST_FILE_RESIDUAL = 'test-residual-data.xlsx';
const BUCKET_NAME = 'uploads';

async function main() {
  console.log('Starting Excel upload flow test...');
  
  try {
    // 1. Create test Excel files
    await createTestMerchantExcel();
    await createTestResidualExcel();
    console.log('✅ Test Excel files created');
    
    // 2. Check if the bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(BUCKET_NAME);
    
    if (bucketError) {
      console.log(`Creating storage bucket: ${BUCKET_NAME}`);
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      console.log('✅ Storage bucket created');
    } else {
      console.log('✅ Storage bucket exists');
    }
    
    // 3. Test merchant data upload
    await testUploadFlow('merchants', TEST_FILE_MERCHANT);
    
    // 4. Test residual data upload
    await testUploadFlow('residuals', TEST_FILE_RESIDUAL);
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function createTestMerchantExcel() {
  const testData = [];
  
  // Create 10 sample merchant records
  for (let i = 1; i <= 10; i++) {
    testData.push({
      MerchantID: `M${10000 + i}`,
      MerchantName: `Test Merchant ${i}`,
      Status: 'active',
      Volume: Math.floor(Math.random() * 100000),
      TransactionCount: Math.floor(Math.random() * 100),
      AverageTicket: Math.floor(Math.random() * 500),
    });
  }
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Merchants');
  
  XLSX.writeFile(workbook, TEST_FILE_MERCHANT);
}

async function createTestResidualExcel() {
  const testData = [];
  
  // Create current date for month/year
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // Create 15 sample residual records
  for (let i = 1; i <= 15; i++) {
    testData.push({
      MerchantID: `M${10000 + i}`,
      Month: month,
      Year: year,
      Amount: Math.floor(Math.random() * 5000),
      ProcessorFee: Math.floor(Math.random() * 500),
      NetAmount: Math.floor(Math.random() * 4500),
    });
  }
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Residuals');
  
  XLSX.writeFile(workbook, TEST_FILE_RESIDUAL);
}

async function testUploadFlow(datasetType, filename) {
  console.log(`\nTesting ${datasetType} upload flow...`);
  
  // 1. Upload file to Supabase Storage
  const fileBuffer = fs.readFileSync(filename);
  const filePath = `${datasetType}/${filename}`;
  
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      cacheControl: '3600',
      upsert: true,
    });
  
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }
  console.log('✅ File uploaded to Supabase Storage');
  
  // 2. Get the URL for the uploaded file
  const { data: fileUrlData } = supabase
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  const fileUrl = fileUrlData.publicUrl;
  
  // 3. Process the file with the API endpoint
  console.log('Making API request to process Excel file...');
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/process-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      filePath,
      fileUrl,
      datasetType,
    }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`API processing failed: ${result.error}`);
  }
  
  console.log('✅ API processed the file successfully');
  console.log(`   - ${datasetType === 'merchants' ? 'Merchants' : 'Residuals'} processed: ${datasetType === 'merchants' ? result.merchants : result.residuals}`);
  
  // 4. Verify data in the database
  if (datasetType === 'merchants') {
    const { count: merchantCount, error: merchantError } = await supabase
      .from('merchants')
      .select('*', { count: 'exact' })
      .eq('merchant_id', 'M10001');
    
    if (merchantError) {
      throw new Error(`Database verification failed: ${merchantError.message}`);
    }
    
    if (merchantCount === 0) {
      throw new Error('No merchant records found in database');
    }
    
    console.log(`✅ Verified ${merchantCount} merchant records in database`);
  } else {
    const { count: residualsCount, error: residualsError } = await supabase
      .from('residuals')
      .select('*', { count: 'exact' })
      .eq('merchant_id', 'M10001');
    
    if (residualsError) {
      throw new Error(`Database verification failed: ${residualsError.message}`);
    }
    
    if (residualsCount === 0) {
      throw new Error('No residual records found in database');
    }
    
    console.log(`✅ Verified ${residualsCount} residual records in database`);
  }
  
  return true;
}

async function cleanup() {
  // Optional cleanup of test files
  try {
    fs.unlinkSync(TEST_FILE_MERCHANT);
    fs.unlinkSync(TEST_FILE_RESIDUAL);
    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.warn('Warning: Could not clean up test files');
  }
}

// Run the test
main()
  .then(() => cleanup())
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });

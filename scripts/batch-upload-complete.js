/**
 * Complete Batch Upload Script for IrelandPay Analytics
 * 
 * This script uploads multiple Excel files from local directories to Supabase Storage buckets
 * and then triggers their processing via the appropriate Edge Functions.
 * 
 * Usage:
 * 1. Place Excel files in the appropriate directories:
 *    - Residual payouts: data/residuals/
 *    - Merchant data: data/merchants/
 * 2. Run the script: node batch-upload-complete.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// File paths configuration
const RESIDUALS_DIR = path.join(__dirname, '../data/residuals');
const MERCHANTS_DIR = path.join(__dirname, '../data/merchants');

// Helper function to list files in a directory
function listExcelFiles(directory) {
  try {
    const files = fs.readdirSync(directory);
    return files.filter(file => file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls'));
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
    return [];
  }
}

// Upload a file to the appropriate storage bucket and process it
async function uploadAndProcessFile(filePath, fileName, fileType) {
  console.log(`Uploading ${fileName} to ${fileType} bucket...`);
  
  try {
    // First upload the file to storage
    const { error: uploadError } = await supabase
      .storage
      .from(fileType)
      .upload(`${fileName}`, fs.readFileSync(filePath), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Upload error for ${fileName}:`, uploadError);
      return false;
    }
    
    console.log(`✅ Successfully uploaded ${fileName}`);
    
    // Process the uploaded file with appropriate Edge Function
    const processed = await processFile(fileName, fileType);
    
    // Wait 2 seconds before processing the next file to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return processed;
  } catch (err) {
    console.error(`Error uploading ${fileName}:`, err);
    return false;
  }
}

// Process a file with the appropriate Edge Function
async function processFile(fileName, fileType) {
  console.log(`Processing ${fileName} with ${fileType} Edge Function...`);
  
  try {
    // Call the Edge Function directly
    const functionName = fileType === 'residuals' ? 'processResidualExcel' : 'processMerchantExcel';
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    
    console.log(`Calling Edge Function: ${functionName}`);
    
    // Make the API call using service role key for authorization
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ path: `${fileType}/${fileName}` })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}) for ${fileName}:`, errorText);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ Successfully processed ${fileName}:`, data.message || 'Processing completed');
    
    // Verify data was inserted correctly
    if (fileType === 'residuals') {
      await verifyResidualData(fileName);
    } else {
      await verifyMerchantData(fileName);
    }
    
    return true;
  } catch (err) {
    console.error(`Processing failed for ${fileName}:`, err);
    return false;
  }
}

// Verify residual payout data was inserted correctly
async function verifyResidualData(fileName) {
  try {
    // Extract month and year from filename (format: Residuals_Mon2025_Houseview.xlsx)
    const match = fileName.match(/Residuals_([A-Za-z]{3})(\d{4})_/);
    if (!match) {
      console.warn(`⚠️ Unable to extract month/year from filename: ${fileName}`);
      return;
    }
    
    const month = match[1];
    const year = match[2];
    
    console.log(`Verifying data for ${month} ${year}...`);
    
    const { data, error } = await supabase
      .from('residual_payouts')
      .select('count(*)')
      .eq('month', month)
      .eq('year', year);
    
    if (error) {
      console.error(`Verification query error:`, error);
      return;
    }
    
    const count = data[0]?.count || 0;
    console.log(`📊 Found ${count} residual payout records for ${month} ${year}`);
  } catch (err) {
    console.error('Verification error:', err);
  }
}

// Verify merchant data was inserted correctly
async function verifyMerchantData(fileName) {
  try {
    // Extract month and year from filename (format: Merchants_Mon2025_Houseview.xlsx)
    const match = fileName.match(/Merchants_([A-Za-z]{3})(\d{4})_/);
    if (!match) {
      console.warn(`⚠️ Unable to extract month/year from filename: ${fileName}`);
      return;
    }
    
    const month = match[1];
    const year = match[2];
    
    console.log(`Verifying merchant data for ${month} ${year}...`);
    
    const { data, error } = await supabase
      .from('merchant_metrics')
      .select('count(*)')
      .eq('month', month)
      .eq('year', year);
    
    if (error) {
      console.error(`Verification query error:`, error);
      return;
    }
    
    const count = data[0]?.count || 0;
    console.log(`📊 Found ${count} merchant metric records for ${month} ${year}`);
  } catch (err) {
    console.error('Verification error:', err);
  }
}

// Process a directory of Excel files
async function processDirectory(directory, fileType) {
  console.log(`\n==== Processing ${fileType} Files ====\n`);
  
  const files = listExcelFiles(directory);
  
  if (files.length === 0) {
    console.log(`No Excel files found in ${directory}`);
    return;
  }
  
  console.log(`📂 Found ${files.length} Excel files in ${directory}`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    
    // Upload and process the file
    const success = await uploadAndProcessFile(filePath, file, fileType);
    
    // Count success/failure
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log(`\n📊 ${fileType} processing summary: ${successCount} succeeded, ${failureCount} failed`);
}

// Verify Supabase credentials
async function verifyCredentials() {
  console.log('Verifying Supabase credentials...');
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set in .env file');
    return false;
  }
  
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
    return false;
  }
  
  // Test the connection with a simple query
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    // Check if required buckets exist
    const buckets = data || [];
    const hasMerchantsBucket = buckets.some(bucket => bucket.name === 'merchants');
    const hasResidualsBucket = buckets.some(bucket => bucket.name === 'residuals');
    
    if (!hasMerchantsBucket || !hasResidualsBucket) {
      console.warn('Warning: One or more required storage buckets do not exist.');
      console.warn('- merchants bucket exists:', hasMerchantsBucket);
      console.warn('- residuals bucket exists:', hasResidualsBucket);
      console.warn('Make sure to create these buckets in your Supabase project.');
      return false;
    }
    
    console.log('✅ Supabase credentials verified successfully');
    return true;
  } catch (err) {
    console.error('Supabase connection test failed with exception:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting batch upload and processing...');
  
  // Verify credentials
  const credentialsValid = await verifyCredentials();
  if (!credentialsValid) {
    console.error('Failed to verify Supabase credentials or required buckets. Please check your .env file and create the necessary buckets.');
    return;
  }
  
  // Process residual payout files
  await processDirectory(RESIDUALS_DIR, 'residuals');
  
  // Process merchant data files
  await processDirectory(MERCHANTS_DIR, 'merchants');
  
  console.log('\n✨ Batch upload and processing completed.');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

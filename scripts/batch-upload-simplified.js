/**
 * Simplified Batch Upload Script for IrelandPay Analytics
 * 
 * This script uploads multiple Excel files from local directories to Supabase Storage buckets.
 * After uploading, you can process them via the web UI.
 * 
 * Usage:
 * 1. Place Excel files in the appropriate directories:
 *    - Residual payouts: data/residuals/
 *    - Merchant data: data/merchants/
 * 2. Run the script: node batch-upload-simplified.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

// Upload a file to the appropriate storage bucket
async function uploadFile(filePath, fileName, bucketName) {
  console.log(`Uploading ${fileName} to ${bucketName} bucket...`);
  
  try {
    // Upload the file to storage
    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, fs.readFileSync(filePath), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Upload error for ${fileName}:`, uploadError);
      return false;
    }
    
    console.log(`✅ Successfully uploaded ${fileName}`);
    return true;
  } catch (err) {
    console.error(`Error uploading ${fileName}:`, err);
    return false;
  }
}

// Process a directory of Excel files
async function processDirectory(directory, bucketName) {
  console.log(`\n==== Processing ${bucketName} Files ====\n`);
  
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
    
    // Upload the file
    const uploadSuccess = await uploadFile(filePath, file, bucketName);
    
    // Count success/failure
    if (uploadSuccess) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Add a short delay between uploads to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 ${bucketName} upload summary: ${successCount} succeeded, ${failureCount} failed`);
}

// Verify Supabase credentials
async function verifyCredentials() {
  console.log('Verifying Supabase credentials...');
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set in .env file');
    return false;
  }
  
  if (!supabaseKey && !serviceRoleKey) {
    console.error('Neither NEXT_PUBLIC_SUPABASE_ANON_KEY nor SUPABASE_SERVICE_ROLE_KEY is set in .env file');
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
  console.log('🚀 Starting batch upload process...');
  
  // Verify credentials
  const credentialsValid = await verifyCredentials();
  if (!credentialsValid) {
    console.error('Failed to verify Supabase credentials. Please check your .env file.');
    return;
  }
  
  // Process residual payout files
  await processDirectory(RESIDUALS_DIR, 'residuals');
  
  // Process merchant data files
  await processDirectory(MERCHANTS_DIR, 'merchants');
  
  console.log('\n✨ Batch upload completed.');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

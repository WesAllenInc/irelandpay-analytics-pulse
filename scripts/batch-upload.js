/**
 * Batch Upload Script for IrelandPay Analytics
 * 
 * This script uploads and processes multiple Excel files for both 
 * merchant data and residual payouts in batch mode.
 * 
 * Instructions:
 * 1. Place your monthly residual Excel files in data/residuals/
 * 2. Place your monthly merchant Excel files in data/merchants/
 * 3. Configure .env file with credentials
 * 4. Run this script
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

// File paths configuration
const RESIDUALS_DIR = path.join(__dirname, '../data/residuals');
const MERCHANTS_DIR = path.join(__dirname, '../data/merchants');
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper function to list files in a directory
function listExcelFiles(directory) {
  try {
    return fs.readdirSync(directory)
      .filter(file => file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls'));
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

// Upload a file to Supabase Storage
async function uploadFile(filePath, fileName, bucket) {
  console.log(`Uploading ${fileName} to ${bucket} bucket...`);
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
      
    if (error) {
      console.error(`Upload error for ${fileName}:`, error);
      return null;
    }
    
    console.log(`✅ Successfully uploaded ${fileName}`);
    return data.path;
  } catch (err) {
    console.error(`File upload failed for ${fileName}:`, err);
    return null;
  }
}

// Process a file with the appropriate API route
async function processFile(fileName, fileType) {
  console.log(`Processing ${fileName} with ${fileType} API...`);
  
  try {
    // Call the Next.js API route
    const apiEndpoint = fileType === 'residuals' 
      ? `${API_BASE_URL}/process-residual-excel` 
      : `${API_BASE_URL}/process-merchant-excel`;
    
    console.log(`Calling API endpoint: ${apiEndpoint}`);
    
    // Make the API call
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use anonymous authentication since we're relying on Next.js API routes
        // to handle authorization via RLS policies
      },
      body: JSON.stringify({ path: `${fileType}/${fileName}` })
    });
    
    if (!response.ok) {
      let errorText;
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
      } catch (e) {
        errorText = await response.text() || `Status ${response.status}`;
      }
      throw new Error(`API error: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error(`Processing failed for ${fileName}:`, result.error || 'Unknown error');
      return false;
    }
    
    console.log(`✅ Successfully processed ${fileName}`);
    return true;
  } catch (err) {
    console.error(`Processing failed for ${fileName}:`, err);
    return false;
  }
}

// Process all files in a directory
async function processDirectory(directory, bucketName, fileType) {
  const files = listExcelFiles(directory);
  
  if (files.length === 0) {
    console.log(`No Excel files found in ${directory}`);
    return;
  }
  
  console.log(`\n📂 Found ${files.length} Excel files in ${directory}`);
  
  // Process files sequentially to avoid overwhelming the server
  let successCount = 0;
  let failureCount = 0;
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    
    // Upload the file to storage
    const uploadedPath = await uploadFile(filePath, file, bucketName);
    
    if (uploadedPath) {
      // Process the file with Edge Function
      const processed = await processFile(file, fileType);
      
      if (processed) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Add a small delay between files to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      failureCount++;
    }
  }
  
  console.log(`\n📊 ${fileType} processing summary: ${successCount} succeeded, ${failureCount} failed`);
}

// Verify credentials are available
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
    const { data, error } = await supabase.from('merchants').select('mid').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
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
  console.log('🚀 Starting batch upload process...');
  
  // Verify credentials
  const credentialsValid = await verifyCredentials();
  if (!credentialsValid) {
    console.error('Failed to verify Supabase credentials. Please check your .env file.');
    return;
  }
  
  // Process residual files
  console.log('\n==== Processing Residual Payout Files ====');
  await processDirectory(RESIDUALS_DIR, 'residuals', 'residuals');
  
  // Process merchant files
  console.log('\n==== Processing Merchant Data Files ====');
  await processDirectory(MERCHANTS_DIR, 'merchants', 'merchants');
  
  console.log('\n✨ All batch processing complete!');
}

// Run the script
main().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});

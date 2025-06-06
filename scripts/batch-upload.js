/**
 * Batch Upload Script
 * 
 * This script uploads multiple Excel files from local directories to Supabase Storage buckets.
 * After uploading, you can process them via the web UI.
 * 
 * Usage:
 * 1. Place Excel files in the appropriate directories:
 *    - Residual payouts: data/residuals/
 *    - Merchant data: data/merchants/
 * 2. Run the script: node batch-upload.js
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
const MERCHANTS_DIR = path.join(__dirname, '../data/merchants');

// Helper function to list files in a directory
function listExcelFiles(directory) {
  try {
    const files = fs.readdirSync(directory);
    return files.filter(file => file.toLowerCase().endsWith('.xlsx'));
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
    return [];
  }
}

// Upload a file to the appropriate storage bucket
async function uploadFile(filePath, fileName, fileType) {
  console.log(`Uploading ${fileName} to ${fileType} bucket...`);
  
  try {
    // Upload the file to storage
    const { error: uploadError } = await supabase
      .storage
      .from(fileType)
      .upload(`${fileName}`, fs.readFileSync(filePath), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`Upload error for ${fileName}:`, uploadError);
    
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

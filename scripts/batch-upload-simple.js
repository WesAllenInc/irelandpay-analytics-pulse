/**
 * Simplified Batch Upload Script for IrelandPay Analytics
 * 
 * This script focuses on reliably uploading Excel files to Supabase buckets
 * and processing them with Edge Functions with minimal complexity.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// File paths
const RESIDUALS_DIR = path.join(__dirname, '../data/residuals');
const MERCHANTS_DIR = path.join(__dirname, '../data/merchants');

// Track results
const results = {
  residuals: { success: 0, failed: 0 },
  merchants: { success: 0, failed: 0 }
};

// Process a single file
async function processFile(filePath, fileName, bucketName, functionName) {
  console.log(`Processing ${fileName}...`);
  
  try {
    // Upload file to storage bucket
    console.log(`  Uploading to ${bucketName} bucket...`);
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fs.readFileSync(filePath), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
      
    if (uploadError) {
      console.error(`  ❌ Upload error: ${uploadError.message}`);
      return false;
    }
    
    console.log('  ✅ Upload successful');
    
    // Process with Edge Function
    console.log(`  Calling ${functionName} Edge Function...`);
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ path: fileName })
    });
    
    const result = await response.text();
    
    if (!response.ok) {
      console.error(`  ❌ Processing error (${response.status}): ${result}`);
      return false;
    }
    
    console.log(`  ✅ Processing successful`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Process all files in a directory
async function processDirectory(directory, bucketName, functionName) {
  // List Excel files
  const files = fs.readdirSync(directory)
    .filter(file => file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls'));
  
  console.log(`\n==== Processing ${files.length} files from ${directory} ====\n`);
  
  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i+1}/${files.length}] ${file}`);
    
    const filePath = path.join(directory, file);
    const success = await processFile(filePath, file, bucketName, 
      functionName === 'residuals' ? 'processResidualExcel' : 'processMerchantExcel');
    
    // Update results
    if (success) {
      results[functionName].success++;
    } else {
      results[functionName].failed++;
    }
    
    // Small delay between files
    console.log('  Waiting 3 seconds before next file...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Run everything
async function main() {
  console.log('🚀 Starting batch upload process...\n');
  
  // Process residual files
  await processDirectory(RESIDUALS_DIR, 'residuals', 'residuals');
  
  // Process merchant files
  await processDirectory(MERCHANTS_DIR, 'merchants', 'merchants');
  
  // Show summary
  console.log('\n==== Processing Summary ====\n');
  console.log(`Residuals: ${results.residuals.success} successful, ${results.residuals.failed} failed`);
  console.log(`Merchants: ${results.merchants.success} successful, ${results.merchants.failed} failed`);
  console.log('\n✨ Process complete');
}

// Run the program
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

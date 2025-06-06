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
      body: JSON.stringify({ path: fileName })
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
      return true; // Continue processing even if verification fails
    }
    
    const month = match[1];
    const year = match[2];
    const monthYear = `${year}-${month}`;
    
    // Verify data was inserted for the extracted month/year
    if (monthYear) {
      try {
        console.log(`Verifying data for ${monthYear}...`);
        const { data, error: verifyError } = await supabase
          .from('residual_payouts')
          .select('*')
          .eq('payout_month', `${monthYear}-01`);
        
        if (verifyError) {
          console.log('Verification query error:', verifyError);
        } else {
          console.log(`Verification successful. Found ${data?.length || 0} records for ${monthYear}.`);
        }
      } catch (verifyErr) {
        console.log('Verification error:', verifyErr);
      }
    }
    return true; // Continue processing even if verification fails
  } catch (err) {
    console.error('Verification error:', err);
    return true; // Continue processing even if verification fails
  }
}

// Verify merchant data was inserted correctly
async function verifyMerchantData(fileName) {
  try {
    // For merchant files, extract month and year from filename (format: Month YYYY Merchant Data.xlsx)
    // Example: April 2025 Merchant Data.xlsx
    const monthMatch = fileName.match(/([A-Za-z]+)\s+(\d{4})\s+Merchant\s+Data/);
    if (!monthMatch) {
      console.warn(`⚠️ Unable to extract month/year from filename: ${fileName}`);
      return true; // Continue processing even if verification fails
    }
    
    const monthName = monthMatch[1];
    const year = monthMatch[2];
    
    // Convert month name to number
    const monthMap = {
      January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
      July: '07', August: '08', September: '09', October: '10', November: '11', December: '12'
    };
    
    const monthNum = monthMap[monthName] || monthMap[monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase()];
    if (!monthNum) {
      console.warn(`⚠️ Couldn't determine month number for ${monthName}`);
      return true;
    }
    
    const dateStr = `${year}-${monthNum}`;
    console.log(`Verifying merchant data for ${dateStr}...`);
    
    try {
      const { data, error } = await supabase
        .from('merchant_metrics')
        .select('*')
        .eq('year', year)
        .eq('month', monthNum);
      
      if (error) {
        console.error(`Verification query error:`, error);
      } else {
        console.log(`📊 Found ${data?.length || 0} merchant metric records for ${monthName} ${year}`);
      }
    } catch (queryErr) {
      console.error('Query error:', queryErr);
    }
    
    return true; // Continue processing even if verification fails
  } catch (err) {
    console.error('Verification error:', err);
    return true; // Continue processing even if verification fails
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
  
  console.log(`Starting to process ${files.length} files...`);
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i+1} of ${files.length}: ${file}`);
      
      const filePath = path.join(directory, file);
      
      // Upload and process the file - continue even if one fails
      try {
        const success = await uploadAndProcessFile(filePath, file, fileType);
        
        // Count success/failure
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (fileError) {
        console.error(`Error processing ${file}:`, fileError);
        failureCount++;
        // Continue with next file despite errors
      }
      
      // Add a small delay between files to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (batchError) {
    console.error(`Unexpected error processing ${fileType} batch:`, batchError);
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
  
  // Process residuals files
  await processDirectory(RESIDUALS_DIR, 'residuals');

  // Process merchants files
  await processDirectory(MERCHANTS_DIR, 'merchants');
  
  console.log('\n✨ Batch upload and processing completed.');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

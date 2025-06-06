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
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Process a file with the appropriate Edge Function via API
async function processFile(fileName, fileType) {
  console.log(`Processing ${fileName} with ${fileType} API...`);
  
  try {
    // Get the user session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    // Determine which API endpoint to use
    const endpoint = fileType === 'residuals' 
      ? `${API_BASE_URL}/process-residual-excel` 
      : `${API_BASE_URL}/process-merchant-excel`;
    
    // Make the API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ path: fileName })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
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

// Create a client session token
async function createClientSession() {
  console.log('Creating client session token...');
  
  try {
    // Create a session using the anon key (this creates a new anonymous session)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session creation failed:', error);
      return false;
    }
    
    if (!data.session) {
      // Try to create an anonymous session
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      
      if (signInError) {
        console.error('Anonymous sign-in failed:', signInError);
        return false;
      }
      
      console.log('✅ Anonymous session created successfully');
      return true;
    }
    
    console.log('✅ Using existing session');
    return true;
  } catch (err) {
    console.error('Session creation failed with exception:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting batch upload process...');
  
  // Verify required environment variables
  if (!supabaseUrl || !supabaseKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env file');
    return;
  }
  
  // Log in
  const authenticated = await login();
  if (!authenticated) {
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

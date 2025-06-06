/**
 * Create Storage Buckets in Supabase
 * 
 * This script creates the necessary storage buckets for the IrelandPay Analytics project:
 * - 'residuals' bucket for residual payout Excel files
 * - 'merchants' bucket for merchant data Excel files
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Bucket names
const BUCKETS = ['residuals', 'merchants'];

/**
 * Create a storage bucket with private access (RLS enabled)
 */
async function createBucket(name) {
  console.log(`Creating ${name} bucket...`);
  
  try {
    // Check if bucket exists
    const { data: existingBucket, error: checkError } = await supabase.storage.getBucket(name);
    
    if (!checkError && existingBucket) {
      console.log(`Bucket ${name} already exists.`);
      return true;
    }
    
    // Create bucket
    const { data, error } = await supabase.storage.createBucket(name, {
      public: false,  // Make it private (requires authorization)
      fileSizeLimit: 10485760,  // 10MB limit per file
      allowedMimeTypes: [
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    });
    
    if (error) {
      console.error(`Error creating ${name} bucket:`, error);
      return false;
    }
    
    console.log(`✅ ${name} bucket created successfully`);
    
    // Create RLS policies for the bucket to allow authenticated users to insert and select
    await createBucketPolicies(name);
    
    return true;
  } catch (err) {
    console.error(`Error creating ${name} bucket:`, err);
    return false;
  }
}

/**
 * Create RLS policies for a bucket to allow authenticated users access
 */
async function createBucketPolicies(bucketName) {
  try {
    // Create policy to allow authenticated users to upload files
    const { error: insertError } = await supabase.storage.from(bucketName).createPolicy(
      `${bucketName}_insert_policy`,
      {
        name: `${bucketName}_insert_policy`,
        definition: {
          action: 'INSERT',
          role: 'authenticated'
        }
      }
    );
    
    if (insertError) {
      console.error(`Error creating INSERT policy for ${bucketName}:`, insertError);
    } else {
      console.log(`✅ INSERT policy created for ${bucketName}`);
    }
    
    // Create policy to allow authenticated users to download files
    const { error: selectError } = await supabase.storage.from(bucketName).createPolicy(
      `${bucketName}_select_policy`,
      {
        name: `${bucketName}_select_policy`,
        definition: {
          action: 'SELECT',
          role: 'authenticated'
        }
      }
    );
    
    if (selectError) {
      console.error(`Error creating SELECT policy for ${bucketName}:`, selectError);
    } else {
      console.log(`✅ SELECT policy created for ${bucketName}`);
    }
  } catch (err) {
    console.error(`Error creating policies for ${bucketName}:`, err);
  }
}

/**
 * Create all required buckets
 */
async function createAllBuckets() {
  console.log('Creating storage buckets for IrelandPay Analytics...');
  
  let allSuccessful = true;
  
  for (const bucket of BUCKETS) {
    const success = await createBucket(bucket);
    if (!success) {
      allSuccessful = false;
    }
  }
  
  return allSuccessful;
}

// Execute the function
createAllBuckets()
  .then((success) => {
    if (success) {
      console.log('\n✅ All storage buckets created successfully.');
    } else {
      console.error('\n⚠️ Some buckets failed to create. Please check the logs.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Error executing script:', err);
    process.exit(1);
  });

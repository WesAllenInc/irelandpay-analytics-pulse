// Script to check database setup for Excel upload flow
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDatabaseSetup() {
  console.log('Checking database setup for Excel upload flow...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role key for admin access
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if merchant_transactions table exists
    console.log('Checking if merchant_transactions table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'merchant_transactions');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('merchant_transactions table does not exist. Creating table...');
      
      // Create the merchant_transactions table
      const { error: createError } = await supabase.rpc('create_merchant_transactions_table');
      
      if (createError) {
        console.error('Error creating table:', createError);
        console.log('Please run the following SQL to create the table:');
        console.log(`
CREATE TABLE public.merchant_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  transaction_date TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_created_at ON public.merchant_transactions(created_at);
        `);
      } else {
        console.log('merchant_transactions table created successfully!');
      }
    } else {
      console.log('merchant_transactions table already exists.');
      
      // Check table structure
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'merchant_transactions');
      
      if (columnsError) {
        console.error('Error checking columns:', columnsError);
        return;
      }
      
      console.log('Table structure:');
      columns.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type}`);
      });
    }
    
    // Check if uploads bucket exists
    console.log('\nChecking if uploads storage bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error checking storage buckets:', bucketsError);
      return;
    }
    
    const uploadsBucket = buckets.find(bucket => bucket.name === 'uploads');
    
    if (!uploadsBucket) {
      console.log('uploads bucket does not exist. Creating bucket...');
      
      // Create the uploads bucket
      const { data: newBucket, error: createBucketError } = await supabase
        .storage
        .createBucket('uploads', {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        });
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
      } else {
        console.log('uploads bucket created successfully!');
      }
    } else {
      console.log('uploads bucket already exists.');
    }
    
    console.log('\nDatabase setup check completed.');
  } catch (error) {
    console.error('Error checking database setup:', error);
  }
}

// Run the check
checkDatabaseSetup().catch(console.error);

/**
 * Create Database Tables Script for IrelandPay Analytics
 * 
 * This script creates the necessary database tables in Supabase:
 * - merchants: Store basic merchant information
 * - residual_payouts: Store monthly residual payout data
 * - merchant_metrics: Store monthly merchant performance metrics
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables. Please check .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// SQL statements to create tables
const createMerchantsTableSQL = `
CREATE TABLE IF NOT EXISTS public.merchants (
  mid TEXT NOT NULL PRIMARY KEY,
  merchant_dba TEXT NOT NULL,
  datasource TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.merchants IS 'Merchant information data';
`;

const createResidualPayoutsTableSQL = `
CREATE TABLE IF NOT EXISTS public.residual_payouts (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  mid TEXT NOT NULL REFERENCES public.merchants(mid),
  merchant_dba TEXT NOT NULL,
  payout_month DATE NOT NULL,
  transactions INTEGER DEFAULT 0,
  sales_amount NUMERIC(20, 2) DEFAULT 0,
  income NUMERIC(20, 2) DEFAULT 0,
  expenses NUMERIC(20, 2) DEFAULT 0,
  net_profit NUMERIC(20, 2) DEFAULT 0,
  bps NUMERIC(10, 2) DEFAULT 0,
  commission_pct NUMERIC(5, 2) DEFAULT 0,
  agent_net NUMERIC(20, 2) DEFAULT 0,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (mid, payout_month)
);

COMMENT ON TABLE public.residual_payouts IS 'Merchant monthly residual payment data';
`;

const createMerchantMetricsTableSQL = `
CREATE TABLE IF NOT EXISTS public.merchant_metrics (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  mid TEXT NOT NULL REFERENCES public.merchants(mid),
  merchant_dba TEXT NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  sales_volume NUMERIC(20, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  avg_ticket NUMERIC(20, 2) DEFAULT 0,
  bps NUMERIC(10, 2) DEFAULT 0,
  profit_amount NUMERIC(20, 2) DEFAULT 0,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (mid, month, year)
);

COMMENT ON TABLE public.merchant_metrics IS 'Monthly merchant performance metrics';
`;

// Execute SQL to create tables
async function createTables() {
  console.log('🚀 Creating database tables for IrelandPay Analytics...');

  try {
    // Create merchants table first (as it's referenced by the other tables)
    console.log('📋 Creating merchants table...');
    const { error: merchantsError } = await supabase.rpc('exec_sql', { 
      query_text: createMerchantsTableSQL 
    });

    if (merchantsError) {
      throw new Error(`Failed to create merchants table: ${merchantsError.message}`);
    }
    console.log('✅ merchants table created successfully');

    // Create residual_payouts table
    console.log('📋 Creating residual_payouts table...');
    const { error: residualsError } = await supabase.rpc('exec_sql', { 
      query_text: createResidualPayoutsTableSQL 
    });

    if (residualsError) {
      throw new Error(`Failed to create residual_payouts table: ${residualsError.message}`);
    }
    console.log('✅ residual_payouts table created successfully');

    // Create merchant_metrics table
    console.log('📋 Creating merchant_metrics table...');
    const { error: metricsError } = await supabase.rpc('exec_sql', { 
      query_text: createMerchantMetricsTableSQL 
    });

    if (metricsError) {
      throw new Error(`Failed to create merchant_metrics table: ${metricsError.message}`);
    }
    console.log('✅ merchant_metrics table created successfully');

    console.log('🎉 All tables created successfully!');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    
    // Try an alternative approach if RPC method fails
    try {
      console.log('🔄 Trying alternative approach with direct SQL queries...');
      
      // Check if custom function is needed
      const { error: fnCheckError } = await supabase
        .from('_rpc')
        .select('*')
        .eq('name', 'exec_sql');
      
      if (fnCheckError) {
        console.log('⚠️ Creating custom SQL execution function...');
        await createSQLExecutionFunction();
        console.log('🔄 Retrying table creation...');
        await createTables();
      }
    } catch (altError) {
      console.error('❌ Alternative approach failed:', altError);
      
      // Last resort: provide SQL for manual execution
      console.log('\n⚠️ Unable to automatically create tables. Please execute the following SQL in your Supabase project SQL editor:');
      console.log('\n---- SQL STATEMENTS ----');
      console.log(createMerchantsTableSQL);
      console.log(createResidualPayoutsTableSQL);
      console.log(createMerchantMetricsTableSQL);
      console.log('-----------------------');
    }
  }
}

// Create a custom SQL execution function if needed
async function createSQLExecutionFunction() {
  const createFunctionSQL = `
  CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    EXECUTE query_text;
  END;
  $$;
  `;
  
  try {
    const { error } = await supabase
      .rpc('exec_sql', { query_text: createFunctionSQL });
      
    if (error) {
      // If we can't create the function using RPC, use direct SQL
      console.log('⚠️ Trying direct query to create function...');
      await supabase.from('_sqlapi').select('*').eq('method', 'POST');
    }
  } catch (error) {
    console.error('❌ Error creating SQL execution function:', error);
  }
}

// Run the script
createTables().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

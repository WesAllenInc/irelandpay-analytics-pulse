#!/usr/bin/env node

/**
 * Fix Database Views Script
 * 
 * This script applies the database view fixes to resolve build errors.
 * It creates the missing views that the application code expects.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables. Please check .env file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// SQL statements to fix the views
const fixViewsSQL = `
-- Fix Database Views for Build Compatibility
-- This migration creates the missing views that the application code expects

-- 1. Create merchant_data view with proper structure
DROP VIEW IF EXISTS public.merchant_data CASCADE;
CREATE VIEW public.merchant_data AS
SELECT 
  m.mid,
  m.merchant_dba,
  m.datasource,
  COALESCE(SUM(r.transactions), 0) as total_txns,
  COALESCE(SUM(r.sales_amount), 0) as total_volume,
  r.payout_month as month,
  m.created_at,
  m.updated_at
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
GROUP BY m.mid, m.merchant_dba, m.datasource, r.payout_month, m.created_at, m.updated_at;

-- 2. Create residual_data view to match code expectations
DROP VIEW IF EXISTS public.residual_data CASCADE;
CREATE VIEW public.residual_data AS
SELECT 
  r.mid,
  r.payout_month,
  r.transactions,
  r.sales_amount,
  r.income,
  r.expenses,
  r.net_profit,
  r.bps,
  r.commission_pct as agent_pct,
  r.agent_net,
  r.payout_month as volume_month,
  r.created_at as date_loaded
FROM residual_payouts r;

-- 3. Update master_data view to avoid infinite recursion
DROP VIEW IF EXISTS public.master_data CASCADE;
CREATE VIEW public.master_data AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  r.payout_month as volume_month,
  r.sales_amount as merchant_volume,
  r.net_profit
FROM merchants m
JOIN residual_payouts r ON m.mid = r.mid;

-- 4. Create merchant_volume view
DROP VIEW IF EXISTS public.merchant_volume CASCADE;
CREATE VIEW public.merchant_volume AS
WITH daily_data AS (
  SELECT
    payout_month as volume_date,
    sales_amount / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', payout_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM residual_payouts
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- 5. Create estimated_net_profit view
DROP VIEW IF EXISTS public.estimated_net_profit CASCADE;
CREATE VIEW public.estimated_net_profit AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  COALESCE(r.bps, 0) as bps_last_month,
  r.sales_amount as projected_volume_this_month,
  r.net_profit as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Grant appropriate permissions on views to authenticated users
GRANT SELECT ON public.master_data TO authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;
GRANT SELECT ON public.residual_data TO authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merchants_mid ON public.merchants(mid);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_mid ON public.residual_payouts(mid);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_payout_month ON public.residual_payouts(payout_month);
`;

async function fixDatabaseViews() {
  console.log('🔧 Starting database view fixes...');
  
  try {
    // Apply the SQL fixes
    console.log('📝 Applying database view fixes...');
    const { error } = await supabase.rpc('exec_sql', { sql: fixViewsSQL });
    
    if (error) {
      console.error('❌ Error applying database fixes:', error);
      process.exit(1);
    }
    
    console.log('✅ Database view fixes applied successfully!');
    
    // Test the views
    console.log('🧪 Testing the fixed views...');
    
    // Test merchant_data view
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchant_data')
      .select('*')
      .limit(1);
    
    if (merchantError) {
      console.error('❌ Error testing merchant_data view:', merchantError);
    } else {
      console.log('✅ merchant_data view is working');
    }
    
    // Test residual_data view
    const { data: residualData, error: residualError } = await supabase
      .from('residual_data')
      .select('*')
      .limit(1);
    
    if (residualError) {
      console.error('❌ Error testing residual_data view:', residualError);
    } else {
      console.log('✅ residual_data view is working');
    }
    
    // Test master_data view
    const { data: masterData, error: masterError } = await supabase
      .from('master_data')
      .select('*')
      .limit(1);
    
    if (masterError) {
      console.error('❌ Error testing master_data view:', masterError);
    } else {
      console.log('✅ master_data view is working');
    }
    
    console.log('🎉 Database view fixes completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Run "npm run build" to verify the build works');
    console.log('   2. Test the application functionality');
    console.log('   3. Deploy if everything looks good');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixDatabaseViews();
}

module.exports = { fixDatabaseViews }; 
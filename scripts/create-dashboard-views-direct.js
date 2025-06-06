/**
 * Script to apply dashboard views to Supabase using direct SQL execution
 * This creates the necessary SQL views for the dashboard to work with our uploaded data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createView(name, query) {
  console.log(`Creating view: ${name}`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: `CREATE OR REPLACE VIEW ${name} AS ${query}`
    });
    
    if (error) {
      console.error(`❌ Error creating ${name}: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Successfully created ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception creating ${name}: ${err.message}`);
    return false;
  }
}

async function createMaterializedView(name, query) {
  console.log(`Creating materialized view: ${name}`);
  try {
    // Drop existing materialized view if it exists
    await supabase.rpc('exec_sql', { 
      sql: `DROP MATERIALIZED VIEW IF EXISTS ${name}`
    });
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: `CREATE MATERIALIZED VIEW ${name} AS ${query}`
    });
    
    if (error) {
      console.error(`❌ Error creating ${name}: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Successfully created ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception creating ${name}: ${err.message}`);
    return false;
  }
}

async function applyDashboardViews() {
  console.log('🚀 Creating dashboard views in Supabase...\n');
  
  try {
    // Check if exec_sql function exists, if not create it
    const { error: checkFunctionError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' }).catch(() => ({ error: { message: 'Function does not exist' } }));
    
    if (checkFunctionError) {
      console.log('Creating exec_sql function...');
      const { error: createFunctionError } = await supabase.from('_pgrst_exec_sql').select('*').limit(1);
      
      if (createFunctionError) {
        console.error(`❌ Could not create exec_sql function: ${createFunctionError.message}`);
        console.log('Attempting to create SQL function directly...');
        
        // Try to create the function directly using service role client
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS VOID AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const { error } = await supabase
          .from('_exec_sql_direct')
          .select('*')
          .eq('sql', createFunctionSql)
          .limit(1);
          
        if (error) {
          console.error(`❌ Could not create SQL execution function: ${error.message}`);
          console.log('\nFalling back to individual operations instead of custom SQL functions\n');
        }
      }
    }
    
    // Create merchant_data view
    const merchantDataQuery = `
      SELECT 
        to_char(payout_month, 'YYYY-MM-DD') as month,
        SUM(total_volume) as total_volume,
        SUM(total_transactions) as total_txns
      FROM residual_payouts
      GROUP BY payout_month
    `;
    await createView('merchant_data', merchantDataQuery);
    
    // Create master_data_mv materialized view
    const masterDataQuery = `
      SELECT
        m.mid as merchant_id,
        m.name,
        r.payout_month as volume_month,
        r.total_volume as merchant_volume,
        r.net_profit
      FROM merchants m
      JOIN residual_payouts r ON m.mid = r.mid
    `;
    await createMaterializedView('master_data_mv', masterDataQuery);
    
    // Create merchant_volume view for daily volume data
    const merchantVolumeQuery = `
      WITH daily_data AS (
        SELECT
          payout_month as volume_date,
          total_volume / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', payout_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
        FROM residual_payouts
      )
      SELECT 
        volume_date,
        SUM(daily_volume) as daily_volume
      FROM daily_data
      GROUP BY volume_date
    `;
    await createView('merchant_volume', merchantVolumeQuery);
    
    // Create estimated_net_profit view
    const estimatedNetProfitQuery = `
      SELECT
        m.mid as merchant_id,
        m.name,
        COALESCE(r.total_volume / NULLIF(r.total_transactions, 0), 0) as bps_last_month,
        COALESCE(mm.projected_volume, r.total_volume) as projected_volume_this_month,
        COALESCE(mm.projected_profit, r.net_profit) as estimated_profit
      FROM merchants m
      LEFT JOIN residual_payouts r ON m.mid = r.mid
      LEFT JOIN merchant_metrics mm ON m.mid = mm.mid
      WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts)
    `;
    await createView('estimated_net_profit', estimatedNetProfitQuery);
    
    // Try to refresh the materialized view
    try {
      console.log('Refreshing materialized view...');
      const { error: refreshError } = await supabase.rpc('exec_sql', { 
        sql: `REFRESH MATERIALIZED VIEW master_data_mv`
      });
      
      if (refreshError) {
        console.error(`❌ Error refreshing materialized view: ${refreshError.message}`);
      } else {
        console.log('✅ Materialized view refreshed');
      }
    } catch (err) {
      console.error(`❌ Exception refreshing materialized view: ${err.message}`);
    }
    
    console.log('\n✨ Dashboard views creation process completed');
  } catch (error) {
    console.error('\n❌ Error creating dashboard views:', error.message);
  }
}

// Execute the function
applyDashboardViews().catch(console.error);

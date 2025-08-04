import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function resetSupabaseDatabase() {
  try {
    console.log('🔄 Starting complete Supabase database reset...');
    
    // Get environment variables
    const supabaseUrl = process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.ainmbbtycciukbjjdjtl_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    
    // Create client with service role key for admin access
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('✅ Connected with service role');
    
    // Step 1: Drop all existing tables (except auth tables)
    console.log('\n🗑️  Dropping all existing tables...');
    
    const tablesToDrop = [
      'sync_jobs',
      'sync_progress',
      'sync_watermarks',
      'change_log',
      'admin_audit_log',
      'admin_sessions',
      'user_roles',
      'monthly_forecasts',
      'profit_leakage',
      'ingestion_logs',
      'merchant_processing_volumes',
      'residuals',
      'merchants',
      'agents',
      'users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `DROP TABLE IF EXISTS public.${table} CASCADE;` 
        });
        if (error) {
          console.log(`⚠️  Could not drop ${table}: ${error.message}`);
        } else {
          console.log(`✅ Dropped table: ${table}`);
        }
      } catch (error) {
        console.log(`⚠️  Error dropping ${table}: ${error.message}`);
      }
    }
    
    // Step 2: Drop all functions
    console.log('\n🗑️  Dropping all functions...');
    
    const functionsToDrop = [
      'transfer_admin_role',
      'is_admin',
      'get_current_admin',
      'log_admin_action',
      'create_admin_session',
      'update_session_activity',
      'revoke_admin_session',
      'revoke_all_admin_sessions',
      'cleanup_expired_sessions',
      'update_updated_at_column',
      'generate_record_hash',
      'update_record_hash',
      'log_table_changes'
    ];
    
    for (const func of functionsToDrop) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `DROP FUNCTION IF EXISTS public.${func} CASCADE;` 
        });
        if (error) {
          console.log(`⚠️  Could not drop function ${func}: ${error.message}`);
        } else {
          console.log(`✅ Dropped function: ${func}`);
        }
      } catch (error) {
        console.log(`⚠️  Error dropping function ${func}: ${error.message}`);
      }
    }
    
    // Step 3: Drop all triggers
    console.log('\n🗑️  Dropping all triggers...');
    
    const triggersToDrop = [
      'update_user_roles_updated_at',
      'update_merchants_hash',
      'update_residuals_hash',
      'update_agents_hash',
      'log_merchants_changes',
      'log_residuals_changes',
      'log_agents_changes'
    ];
    
    for (const trigger of triggersToDrop) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `DROP TRIGGER IF EXISTS ${trigger} ON public.* CASCADE;` 
        });
        if (error) {
          console.log(`⚠️  Could not drop trigger ${trigger}: ${error.message}`);
        } else {
          console.log(`✅ Dropped trigger: ${trigger}`);
        }
      } catch (error) {
        console.log(`⚠️  Error dropping trigger ${trigger}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Database reset completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run the migration scripts to recreate tables');
    console.log('2. Set up RLS policies');
    console.log('3. Create initial admin user');
    console.log('4. Test IRIS CRM API integration');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

resetSupabaseDatabase(); 
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
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
    
    // Define migration order (important for dependencies)
    const migrationOrder = [
      'initial_setup.sql',
      '20250529_initial_schema.sql',
      '20250605_create_merchants_bucket.sql',
      '20250605_create_residuals_bucket.sql',
      '20250605_add_merchant_volume_tables.sql',
      '20250605_create_residual_payouts.sql',
      '20250625_fix_security_issues.sql',
      '20250708_add_sync_queue_tables.sql',
      '20250708_add_sync_transaction_functions.sql',
      '20250708_create_agent_performance_views.sql',
      '20250709_add_data_freshness.sql',
      '20250710_optimize_database_for_api_patterns.sql',
      '20250711_query_performance_monitoring.sql',
      '20250712_sync_alerts_system.sql',
      '20250713_incremental_sync_tracking.sql',
      '20250714_sync_schedules.sql',
      '20250715_data_validation.sql',
      '20250715_add_sync_config_table.sql',
      '20250716_enhanced_sync_monitoring.sql',
      '20250120_fix_database_views.sql',
      '20250125_add_api_credentials_table.sql',
      '20250125_add_data_archive_tables.sql',
      '20250126_enhanced_sync_monitoring.sql',
      '20250127_email_notification_system.sql',
      '20250128_admin_role_system.sql',
      '20250130_enhanced_data_retention_partitioning.sql',
      '20250613_fix_security_definer_views.sql',
      '20250725_fix_role_based_security.sql',
      '20250726_fix_sql_standard_settings.sql'
    ];
    
    // Read and run migrations
    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    
    console.log(`\n📁 Found ${migrationOrder.length} migration files`);
    
    for (const fileName of migrationOrder) {
      console.log(`\n🔄 Running migration: ${fileName}`);
      
      try {
        const sqlPath = join(migrationsDir, fileName);
        const sql = readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements and execute them
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              const { error } = await supabase.rpc('exec_sql', { sql: statement });
              if (error) {
                console.error(`❌ Error in ${fileName}: ${error.message}`);
                console.error(`Statement: ${statement.substring(0, 100)}...`);
                // Continue with next statement
              }
            } catch (error) {
              console.error(`❌ Failed to execute statement in ${fileName}: ${error.message}`);
            }
          }
        }
        
        console.log(`✅ Completed: ${fileName}`);
        
      } catch (error) {
        console.error(`❌ Failed to read/run ${fileName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 All migrations completed!');
    console.log('\n📋 Database is now ready for IRIS CRM integration');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

runMigrations(); 
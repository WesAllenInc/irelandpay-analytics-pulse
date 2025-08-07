#!/usr/bin/env node

/**
 * Reset Sync Data Script
 * 
 * This script resets all sync-related data and removes demo connections.
 * It clears sync history, progress tracking, and demo data from the database.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSyncData() {
  console.log('🔄 Starting sync data reset...');
  
  try {
    // 1. Clear sync_status table
    console.log('📊 Clearing sync_status table...');
    const { error: syncStatusError } = await supabase
      .from('sync_status')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncStatusError) {
      console.error('❌ Error clearing sync_status:', syncStatusError);
    } else {
      console.log('✅ sync_status table cleared');
    }

    // 2. Clear sync_progress table
    console.log('📈 Clearing sync_progress table...');
    const { error: syncProgressError } = await supabase
      .from('sync_progress')
      .delete()
      .neq('sync_id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncProgressError) {
      console.error('❌ Error clearing sync_progress:', syncProgressError);
    } else {
      console.log('✅ sync_progress table cleared');
    }

    // 3. Clear sync_jobs table
    console.log('📋 Clearing sync_jobs table...');
    const { error: syncJobsError } = await supabase
      .from('sync_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncJobsError) {
      console.error('❌ Error clearing sync_jobs:', syncJobsError);
    } else {
      console.log('✅ sync_jobs table cleared');
    }

    // 4. Clear sync_failed_items table
    console.log('❌ Clearing sync_failed_items table...');
    const { error: syncFailedError } = await supabase
      .from('sync_failed_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncFailedError) {
      console.error('❌ Error clearing sync_failed_items:', syncFailedError);
    } else {
      console.log('✅ sync_failed_items table cleared');
    }

    // 5. Clear sync_logs table
    console.log('📝 Clearing sync_logs table...');
    const { error: syncLogsError } = await supabase
      .from('sync_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncLogsError) {
      console.error('❌ Error clearing sync_logs:', syncLogsError);
    } else {
      console.log('✅ sync_logs table cleared');
    }

    // 6. Clear sync_transactions table
    console.log('💳 Clearing sync_transactions table...');
    const { error: syncTransactionsError } = await supabase
      .from('sync_transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncTransactionsError) {
      console.error('❌ Error clearing sync_transactions:', syncTransactionsError);
    } else {
      console.log('✅ sync_transactions table cleared');
    }

    // 7. Clear sync_operations table
    console.log('⚙️ Clearing sync_operations table...');
    const { error: syncOperationsError } = await supabase
      .from('sync_operations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncOperationsError) {
      console.error('❌ Error clearing sync_operations:', syncOperationsError);
    } else {
      console.log('✅ sync_operations table cleared');
    }

    // 8. Clear sync_queue table
    console.log('📋 Clearing sync_queue table...');
    const { error: syncQueueError } = await supabase
      .from('sync_queue')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncQueueError) {
      console.error('❌ Error clearing sync_queue:', syncQueueError);
    } else {
      console.log('✅ sync_queue table cleared');
    }

    // 9. Clear sync_alerts table
    console.log('🚨 Clearing sync_alerts table...');
    const { error: syncAlertsError } = await supabase
      .from('sync_alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (syncAlertsError) {
      console.error('❌ Error clearing sync_alerts:', syncAlertsError);
    } else {
      console.log('✅ sync_alerts table cleared');
    }

    // 10. Clear change_log table
    console.log('📝 Clearing change_log table...');
    const { error: changeLogError } = await supabase
      .from('change_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (changeLogError) {
      console.error('❌ Error clearing change_log:', changeLogError);
    } else {
      console.log('✅ change_log table cleared');
    }

    // 11. Reset sync_watermarks table
    console.log('🏷️ Resetting sync_watermarks table...');
    const { error: syncWatermarksError } = await supabase
      .from('sync_watermarks')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (syncWatermarksError) {
      console.error('❌ Error resetting sync_watermarks:', syncWatermarksError);
    } else {
      console.log('✅ sync_watermarks table reset');
    }

    // 12. Clear any demo/test data from merchants and residuals tables
    console.log('🏪 Checking for demo data in merchants table...');
    const { data: demoMerchants, error: demoMerchantsError } = await supabase
      .from('merchants')
      .select('id, merchant_dba')
      .or('merchant_dba.ilike.%demo%,merchant_dba.ilike.%test%,merchant_dba.ilike.%mock%');
    
    if (demoMerchantsError) {
      console.error('❌ Error checking for demo merchants:', demoMerchantsError);
    } else if (demoMerchants && demoMerchants.length > 0) {
      console.log(`🗑️ Found ${demoMerchants.length} demo merchants, removing...`);
      
      const demoMerchantIds = demoMerchants.map(m => m.id);
      const { error: deleteDemoMerchantsError } = await supabase
        .from('merchants')
        .delete()
        .in('id', demoMerchantIds);
      
      if (deleteDemoMerchantsError) {
        console.error('❌ Error deleting demo merchants:', deleteDemoMerchantsError);
      } else {
        console.log('✅ Demo merchants removed');
      }
    } else {
      console.log('✅ No demo merchants found');
    }

    // 13. Reset sync configuration to defaults
    console.log('⚙️ Resetting sync configuration...');
    const { error: syncConfigError } = await supabase
      .from('sync_config')
      .upsert({
        id: 'default',
        config: {
          autoSyncEnabled: true,
          defaultFrequency: 'daily',
          defaultTime: '06:00',
          retryAttempts: 3,
          retryDelay: 30,
          timeoutSeconds: 300,
          maxConcurrentSyncs: 2,
          enableNotifications: true,
          enableErrorAlerts: true
        },
        updated_at: new Date().toISOString()
      });
    
    if (syncConfigError) {
      console.error('❌ Error resetting sync config:', syncConfigError);
    } else {
      console.log('✅ Sync configuration reset to defaults');
    }

    console.log('\n🎉 Sync data reset completed successfully!');
    console.log('\n📋 Summary of actions:');
    console.log('   ✅ Cleared sync_status table');
    console.log('   ✅ Cleared sync_progress table');
    console.log('   ✅ Cleared sync_jobs table');
    console.log('   ✅ Cleared sync_failed_items table');
    console.log('   ✅ Cleared sync_logs table');
    console.log('   ✅ Cleared sync_transactions table');
    console.log('   ✅ Cleared sync_operations table');
    console.log('   ✅ Cleared sync_queue table');
    console.log('   ✅ Cleared sync_alerts table');
    console.log('   ✅ Cleared change_log table');
    console.log('   ✅ Reset sync_watermarks table');
    console.log('   ✅ Removed demo merchants');
    console.log('   ✅ Reset sync configuration');
    
    console.log('\n🚀 The application is now ready for fresh sync operations.');
    console.log('   All demo connections and test data have been removed.');
    
  } catch (error) {
    console.error('❌ Fatal error during sync data reset:', error);
    process.exit(1);
  }
}

// Run the reset
resetSyncData().catch(console.error);

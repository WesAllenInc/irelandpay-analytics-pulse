import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function checkTableStructure() {
  try {
    console.log('🔍 Checking current table structure in Supabase...');
    
    // Get environment variables (standard names first, then prefixed)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ainmbbtycciukbjjdjtl_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    
    // Create client with service role key for admin access
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('✅ Connected with service role');
    
    // Check if merchants table exists and get its structure
    console.log('\n📋 Checking merchants table structure...');
    
    try {
      // Try to select from merchants table to see what columns exist
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Error accessing merchants table:', error.message);
      } else {
        console.log('✅ Merchants table exists');
        if (data && data.length > 0) {
          console.log('📊 Sample data structure:', Object.keys(data[0]));
        } else {
          console.log('📊 Table is empty, checking schema...');
        }
      }
    } catch (error) {
      console.log('❌ Merchants table access failed:', error.message);
    }
    
    // Check other tables
    const tablesToCheck = ['agents', 'residuals', 'sync_jobs', 'user_roles'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table} exists`);
          if (data && data.length > 0) {
            console.log(`📊 ${table} columns:`, Object.keys(data[0]));
          }
        }
      } catch (error) {
        console.log(`❌ Table ${table} access failed:`, error.message);
      }
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. If tables exist but have wrong structure, we need to update them');
    console.log('2. If tables don\'t exist, we can create them fresh');
    console.log('3. If tables exist with correct structure, we can proceed with deployment');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkTableStructure(); 
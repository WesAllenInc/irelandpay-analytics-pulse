import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function runSQLDirectly() {
  try {
    console.log('🚀 Running SQL directly against Supabase...');
    
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
    
    // Read the SQL file
    const sqlContent = readFileSync('create-tables-safe.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}...`);
          console.log(`SQL: ${statement.substring(0, 100)}...`);
          
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} had an issue:`, error.message);
            // Continue with next statement
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message);
          // Continue with next statement
        }
      }
    }
    
    console.log('\n🎉 SQL execution completed!');
    console.log('\n📋 Verifying tables...');
    
    // Verify tables were created
    const tablesToCheck = ['merchants', 'agents', 'residuals', 'sync_jobs', 'user_roles'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table} exists and is accessible`);
        }
      } catch (error) {
        console.log(`❌ Table ${table} access failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

runSQLDirectly(); 
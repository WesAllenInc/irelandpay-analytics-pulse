import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Get environment variables with project ID prefix
    const supabaseUrl = process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables:');
      console.error('ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
      console.error('ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
      return;
    }
    
    console.log('✅ Environment variables found');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey.substring(0, 20) + '...');
    
    // Create client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    console.log('\nTesting basic connection...');
    
    // Try to get information about the database
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Could not query information_schema:', tablesError.message);
      
      // Try a simpler approach - test if we can connect at all
      console.log('\nTesting simple connection...');
      const { data: simpleTest, error: simpleError } = await supabase
        .from('_supabase_migrations')
        .select('*')
        .limit(1);
      
      if (simpleError) {
        console.error('❌ Simple connection test failed:', simpleError.message);
      } else {
        console.log('✅ Basic connection works');
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log('Available tables:', tables?.map(t => t.table_name).join(', ') || 'None');
    }
    
    // Test auth
    console.log('\nTesting auth...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
    } else {
      console.log('✅ Auth connection successful');
      console.log('Session:', authData.session ? 'Active' : 'None');
    }
    
    // Test the application's Supabase client
    console.log('\nTesting application Supabase client...');
    try {
      const { createClient: createAppClient } = await import('./lib/supabase/client.ts');
      const appClient = createAppClient();
      
      console.log('✅ Application client created successfully');
      
      // Test with the app client
      const { data: appTest, error: appError } = await appClient
        .from('_supabase_migrations')
        .select('*')
        .limit(1);
      
      if (appError) {
        console.error('❌ App client test failed:', appError.message);
      } else {
        console.log('✅ App client connection works');
      }
      
    } catch (importError) {
      console.error('❌ Could not import application client:', importError.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSupabaseConnection(); 
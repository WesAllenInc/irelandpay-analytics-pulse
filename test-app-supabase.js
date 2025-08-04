import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Test the application's Supabase client configuration
async function testAppSupabase() {
  try {
    console.log('Testing application Supabase client...');
    
    // Get environment variables with project ID prefix
    const supabaseUrl = process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    
    // Create client using the same configuration as the app
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Client created successfully');
    console.log('URL:', supabaseUrl);
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth test failed:', error.message);
    } else {
      console.log('✅ Auth connection successful');
    }
    
    // Test if we can access any tables (even if they don't exist)
    console.log('\nTesting table access...');
    
    // Try to access a table that should exist after migrations
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('*')
      .limit(1);
    
    if (merchantsError) {
      console.log('❌ Merchants table not accessible:', merchantsError.message);
      
      // Check if this is a permissions issue or table doesn't exist
      if (merchantsError.message.includes('does not exist')) {
        console.log('💡 Database tables need to be created via migrations');
      } else if (merchantsError.message.includes('permission')) {
        console.log('💡 Permission issue - check RLS policies');
      }
    } else {
      console.log('✅ Merchants table accessible');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAppSupabase(); 
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

async function fixSupabaseConnection() {
  console.log('🔧 Fixing Supabase Connection...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Current configuration:');
  console.log('URL:', supabaseUrl);
  console.log('Key (first 50 chars):', supabaseKey ? supabaseKey.substring(0, 50) + '...' : 'Missing');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('\n❌ Missing Supabase credentials');
    console.log('\n📋 To fix this:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project: ainmbbtycciukbjjdjtl');
    console.log('3. Go to Settings > API');
    console.log('4. Copy the "anon public" key');
    console.log('5. Update your .env file with the full key');
    return;
  }
  
  // Test with current key
  console.log('\n🧪 Testing current API key...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Current key failed: ${error.message}`);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔑 The API key appears to be invalid or truncated.');
        console.log('\n📋 Steps to fix:');
        console.log('1. Go to https://supabase.com/dashboard/project/ainmbbtycciukbjjdjtl/settings/api');
        console.log('2. Copy the full "anon public" key (it should be a long JWT token)');
        console.log('3. Update your .env file with the complete key');
        console.log('4. Make sure there are no line breaks or truncation');
        console.log('\nExample format:');
        console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbm1iYnR5Y2NpdWtiampkamRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NzQ5NzQsImV4cCI6MjA0NzU1MDk3NH0.ACTUAL_SIGNATURE_HERE');
      }
    } else {
      console.log('✅ Current API key is working!');
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  
  // Test auth separately
  console.log('\n🔐 Testing auth...');
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log(`❌ Auth failed: ${authError.message}`);
    } else {
      console.log('✅ Auth is working');
    }
  } catch (error) {
    console.log(`❌ Auth test failed: ${error.message}`);
  }
  
  // Check if we can access the project info
  console.log('\n📊 Testing project access...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Project API access is working');
    } else {
      console.log(`❌ Project API access failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Project API test failed: ${error.message}`);
  }
}

fixSupabaseConnection().catch(console.error);

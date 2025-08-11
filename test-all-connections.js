import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import fetch from 'node-fetch';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

async function testAllConnections() {
  console.log('🔍 Testing All Connections for Ireland Pay Analytics Pulse\n');
  
  // Test 1: Environment Variables
  console.log('1️⃣ Testing Environment Variables...');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  // Test 2: Supabase Connection
  console.log('\n2️⃣ Testing Supabase Connection...');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing Supabase credentials');
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test basic connection
      const { data, error } = await supabase
        .from('_supabase_migrations')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Supabase connection failed: ${error.message}`);
      } else {
        console.log('✅ Supabase connection successful');
      }
      
      // Test auth
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.log(`❌ Supabase auth failed: ${authError.message}`);
      } else {
        console.log('✅ Supabase auth working');
      }
    }
  } catch (error) {
    console.log(`❌ Supabase test error: ${error.message}`);
  }
  
  // Test 3: Vercel Deployment
  console.log('\n3️⃣ Testing Vercel Deployment...');
  try {
    const deploymentUrl = 'https://irelandpay-analytics-pulse-wes-allen-inc.vercel.app';
    
    const response = await fetch(deploymentUrl, {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok) {
      console.log(`✅ Vercel deployment is accessible at ${deploymentUrl}`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
    } else {
      console.log(`❌ Vercel deployment returned status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Vercel deployment test failed: ${error.message}`);
  }
  
  // Test 4: API Endpoints
  console.log('\n4️⃣ Testing API Endpoints...');
  const apiEndpoints = [
    '/api/check-env',
    '/api/sync-irelandpay-crm/status',
    '/api/supabase-test'
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      const url = `https://irelandpay-analytics-pulse-wes-allen-inc.vercel.app${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - ${response.status}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
  
  // Test 5: GitHub Repository
  console.log('\n5️⃣ Testing GitHub Repository...');
  try {
    const response = await fetch('https://api.github.com/repos/wes-allen-inc/irelandpay-analytics-pulse', {
      method: 'GET',
      headers: {
        'User-Agent': 'IrelandPay-Analytics-Pulse-Test'
      },
      timeout: 10000
    });
    
    if (response.ok) {
      const repoData = await response.json();
      console.log(`✅ GitHub repository accessible`);
      console.log(`   Name: ${repoData.name}`);
      console.log(`   Description: ${repoData.description || 'No description'}`);
      console.log(`   Stars: ${repoData.stargazers_count}`);
      console.log(`   Last updated: ${repoData.updated_at}`);
    } else {
      console.log(`❌ GitHub repository test failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ GitHub repository test error: ${error.message}`);
  }
  
  // Test 6: Build Status
  console.log('\n6️⃣ Testing Build Status...');
  try {
    const response = await fetch('https://irelandpay-analytics-pulse-wes-allen-inc.vercel.app', {
      method: 'GET',
      timeout: 10000
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for common error indicators
      if (html.includes('Internal Server Error') || html.includes('500')) {
        console.log('❌ Build contains server errors');
      } else if (html.includes('404') || html.includes('Not Found')) {
        console.log('❌ Build contains 404 errors');
      } else if (html.includes('Ireland Pay Analytics') || html.includes('irelandpay')) {
        console.log('✅ Build appears to be working correctly');
      } else {
        console.log('⚠️  Build status unclear - page loaded but content may be unexpected');
      }
    } else {
      console.log(`❌ Build test failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Build test error: ${error.message}`);
  }
  
  console.log('\n🎯 Connection Test Summary:');
  console.log('==========================');
  console.log('• Environment Variables: Check above');
  console.log('• Supabase: Check above');
  console.log('• Vercel Deployment: https://irelandpay-analytics-pulse-wes-allen-inc.vercel.app');
  console.log('• GitHub Repository: https://github.com/wes-allen-inc/irelandpay-analytics-pulse');
  console.log('\n📋 Next Steps:');
  console.log('1. Fix any failed connections above');
  console.log('2. Set up environment variables in Vercel dashboard');
  console.log('3. Configure Supabase environment variables');
  console.log('4. Test the application functionality');
}

testAllConnections().catch(console.error);

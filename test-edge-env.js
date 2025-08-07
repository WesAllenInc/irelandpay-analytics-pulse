import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ainmbbtycciukbjjdjtl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbm1iYnR5Y2NpdWtiampkanRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM2OTI5OCwiZXhwIjoyMDYzOTQ1Mjk4fQ.z4Lralzdldn5tY_T0qSDpvNeu3vJ09izPvNLlX4BC2M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeEnvironment() {
  console.log('🔍 Testing Edge Function environment...');
  
  try {
    // Test a simple edge function call to check environment
    const { data, error } = await supabase.functions.invoke('sync-irelandpay-crm', {
      body: JSON.stringify({
        dataType: 'merchants',
        forceSync: true
      })
    });
    
    if (error) {
      console.error('❌ Edge function error:', error);
      
      // Check if it's a 404 (function not found) or 500 (environment issue)
      if (error.message.includes('404')) {
        console.log('⚠️  Edge function not found - needs to be deployed');
      } else if (error.message.includes('500')) {
        console.log('⚠️  Edge function error - likely environment variables missing');
      }
      return;
    }
    
    console.log('✅ Edge function response:', data);
    
    // Check if we got actual data or an error
    if (data && data.success === false) {
      console.log('❌ Sync failed:', data.error);
      
      // Check for specific error messages
      if (data.error.includes('IRELANDPAY_CRM_API_KEY')) {
        console.log('🔑 Issue: IRELANDPAY_CRM_API_KEY environment variable not set in edge function');
      } else if (data.error.includes('SUPABASE_URL')) {
        console.log('🌐 Issue: SUPABASE_URL environment variable not set in edge function');
      } else if (data.error.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log('🔐 Issue: SUPABASE_SERVICE_ROLE_KEY environment variable not set in edge function');
      }
    } else if (data && data.results && data.results.merchants) {
      const merchants = data.results.merchants;
      console.log('📊 Merchants sync results:');
      console.log(`   Total merchants: ${merchants.total_merchants}`);
      console.log(`   Added: ${merchants.merchants_added}`);
      console.log(`   Updated: ${merchants.merchants_updated}`);
      console.log(`   Failed: ${merchants.merchants_failed}`);
      
      if (merchants.total_merchants === 352) {
        console.log('✅ SUCCESS! Got all 352 merchants - real data!');
      } else if (merchants.total_merchants === 150) {
        console.log('⚠️  Still getting demo data (150 merchants)');
      } else {
        console.log(`📈 Got ${merchants.total_merchants} merchants`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEdgeEnvironment().catch(console.error);

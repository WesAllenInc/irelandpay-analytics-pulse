import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://ainmbbtycciukbjjdjtl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbm1iYnR5Y2NpdWtiampkanRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM2OTI5OCwiZXhwIjoyMDYzOTQ1Mjk4fQ.z4Lralzdldn5tY_T0qSDpvNeu3vJ09izPvNLlX4BC2M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectSync() {
  console.log('🔍 Testing direct Ireland Pay CRM sync...');
  
  try {
    // Test the edge function directly
    const { data, error } = await supabase.functions.invoke('sync-irelandpay-crm', {
      body: JSON.stringify({
        dataType: 'merchants',
        forceSync: true
      })
    });
    
    if (error) {
      console.error('❌ Edge function error:', error);
      return;
    }
    
    console.log('✅ Edge function response:', data);
    
    // Check if we got actual data or demo data
    if (data && data.results && data.results.merchants) {
      const merchants = data.results.merchants;
      console.log('📊 Merchants sync results:');
      console.log(`   Total merchants: ${merchants.total_merchants}`);
      console.log(`   Added: ${merchants.merchants_added}`);
      console.log(`   Updated: ${merchants.merchants_updated}`);
      console.log(`   Failed: ${merchants.merchants_failed}`);
      
      if (merchants.total_merchants === 150) {
        console.log('⚠️  Still getting demo data (150 merchants)');
      } else if (merchants.total_merchants === 352) {
        console.log('✅ Success! Getting real data (352 merchants)');
      } else {
        console.log(`📈 Getting ${merchants.total_merchants} merchants (not demo data)`);
      }
    } else {
      console.log('❌ No merchants data in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectSync().catch(console.error); 
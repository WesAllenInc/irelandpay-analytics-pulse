import fetch from 'node-fetch';

const IRELANDPAY_CRM_API_KEY = 'c1jfpS4tI23CUZ4OCO4YNtYRtdXP9eT4PbdIUULIysGZyaD8gu';
const IRELANDPAY_CRM_BASE_URL = 'https://crm.ireland-pay.com/api/v1';

async function testCRMDirect() {
  console.log('🔍 Testing Ireland Pay CRM API directly...');
  console.log('🔑 API Key:', IRELANDPAY_CRM_API_KEY.substring(0, 10) + '...');
  console.log('🌐 Base URL:', IRELANDPAY_CRM_BASE_URL);
  
  try {
    // Test the merchants endpoint directly
    const response = await fetch(`${IRELANDPAY_CRM_BASE_URL}/merchants?per_page=100&page=1`, {
      method: 'GET',
      headers: {
        'X-API-KEY': IRELANDPAY_CRM_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API response structure:', Object.keys(result));
    
    if (result.data) {
      console.log('📊 Merchants data:');
      console.log(`   Total merchants in response: ${result.data.length}`);
      console.log(`   Meta info:`, result.meta || 'No meta info');
      
      if (result.data.length > 0) {
        console.log('   First merchant sample:', {
          id: result.data[0].id,
          name: result.data[0].business_name || result.data[0].merchant_name,
          status: result.data[0].status
        });
      }
      
      if (result.data.length === 150) {
        console.log('⚠️  Getting 150 merchants - might be demo data');
      } else if (result.data.length === 352) {
        console.log('✅ Success! Getting 352 merchants - real data');
      } else {
        console.log(`📈 Getting ${result.data.length} merchants`);
      }
    } else {
      console.log('❌ No data in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCRMDirect().catch(console.error);

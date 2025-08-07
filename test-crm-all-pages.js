import fetch from 'node-fetch';

const IRELANDPAY_CRM_API_KEY = 'c1jfpS4tI23CUZ4OCO4YNtYRtdXP9eT4PbdIUULIysGZyaD8gu';
const IRELANDPAY_CRM_BASE_URL = 'https://crm.ireland-pay.com/api/v1';

async function testAllPages() {
  console.log('🔍 Testing Ireland Pay CRM API - All Pages...');
  
  let allMerchants = [];
  let page = 1;
  let totalPages = 1;
  
  try {
    while (page <= totalPages) {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await fetch(`${IRELANDPAY_CRM_BASE_URL}/merchants?per_page=100&page=${page}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': IRELANDPAY_CRM_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API error on page ${page}:`, errorText);
        break;
      }
      
      const result = await response.json();
      
      // Update total pages on first request
      if (page === 1) {
        totalPages = result.meta?.last_page || 1;
        console.log(`📊 Total pages: ${totalPages}, Total merchants: ${result.meta?.total || 'unknown'}`);
      }
      
      if (result.data && result.data.length > 0) {
        allMerchants = allMerchants.concat(result.data);
        console.log(`✅ Page ${page}: Got ${result.data.length} merchants (Total so far: ${allMerchants.length})`);
      } else {
        console.log(`⚠️  Page ${page}: No data`);
        break;
      }
      
      page++;
      
      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Final Results:');
    console.log(`   Total merchants fetched: ${allMerchants.length}`);
    console.log(`   Expected total: 352`);
    
    if (allMerchants.length === 352) {
      console.log('✅ SUCCESS! Got all 352 merchants - this is real data, not demo!');
    } else if (allMerchants.length === 150) {
      console.log('⚠️  Still getting demo data (150 merchants)');
    } else {
      console.log(`📈 Got ${allMerchants.length} merchants (different from expected)`);
    }
    
    // Show some sample merchants
    if (allMerchants.length > 0) {
      console.log('\n📋 Sample merchants:');
      allMerchants.slice(0, 3).forEach((merchant, index) => {
        console.log(`   ${index + 1}. ID: ${merchant.id || merchant.mid}, Name: ${merchant.business_name || merchant.merchant_name || 'N/A'}, Status: ${merchant.status || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAllPages().catch(console.error);

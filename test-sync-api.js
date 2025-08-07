import fetch from 'node-fetch';

async function testSyncAPI() {
  console.log('🔍 Testing Ireland Pay CRM sync via API route...');
  
  try {
    // Test the API route directly
    const response = await fetch('http://localhost:3000/api/sync-irelandpay-crm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType: 'merchants',
        forceSync: true
      })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Sync started successfully');
    } else {
      console.error('❌ Sync failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSyncAPI().catch(console.error);

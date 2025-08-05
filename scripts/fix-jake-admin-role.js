import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file or environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixJakeAdminRole() {
  console.log('🔧 Fixing Jake Markey\'s role to admin...');
  
  try {
    // Update Jake Markey's role to admin
    const { data, error } = await supabase
      .from('agents')
      .update({
        role: 'admin',
        agent_name: 'Jake Markey',
        approval_status: 'approved'
      })
      .eq('email', 'jmarkey@irelandpay.com')
      .select();

    if (error) {
      console.error('❌ Error updating Jake\'s role:', error);
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully updated Jake Markey\'s role to admin');
      console.log('Updated record:', data[0]);
    } else {
      console.log('⚠️  No record found for jmarkey@irelandpay.com');
      
      // Try to create the record if it doesn't exist
      console.log('Creating new record for Jake Markey...');
      const { data: newData, error: createError } = await supabase
        .from('agents')
        .insert({
          email: 'jmarkey@irelandpay.com',
          agent_name: 'Jake Markey',
          role: 'admin',
          approval_status: 'approved'
        })
        .select();

      if (createError) {
        console.error('❌ Error creating Jake\'s record:', createError);
        return false;
      }

      console.log('✅ Created new record for Jake Markey:', newData[0]);
    }

    // Also update Wilfredo Vazquez to ensure he has admin role
    console.log('\n🔧 Ensuring Wilfredo Vazquez has admin role...');
    
    const { data: wvData, error: wvError } = await supabase
      .from('agents')
      .update({
        role: 'admin',
        agent_name: 'Wilfredo Vazquez',
        approval_status: 'approved'
      })
      .eq('email', 'wvazquez@irelandpay.com')
      .select();

    if (wvError) {
      console.error('❌ Error updating Wilfredo\'s role:', wvError);
    } else if (wvData && wvData.length > 0) {
      console.log('✅ Successfully updated Wilfredo Vazquez\'s role to admin');
    } else {
      // Create record for Wilfredo if it doesn't exist
      const { data: newWvData, error: createWvError } = await supabase
        .from('agents')
        .insert({
          email: 'wvazquez@irelandpay.com',
          agent_name: 'Wilfredo Vazquez',
          role: 'admin',
          approval_status: 'approved'
        })
        .select();

      if (createWvError) {
        console.error('❌ Error creating Wilfredo\'s record:', createWvError);
      } else {
        console.log('✅ Created new record for Wilfredo Vazquez:', newWvData[0]);
      }
    }

    console.log('\n🎉 Executive role fix complete!');
    console.log('\n📋 Current Executive Configuration:');
    console.log('• Jake Markey (jmarkey@irelandpay.com) - ADMIN');
    console.log('• Wilfredo Vazquez (wvazquez@irelandpay.com) - ADMIN');
    
    console.log('\n🔄 Next Steps:');
    console.log('1. Try logging in again with jmarkey@irelandpay.com');
    console.log('2. You should now be redirected to /dashboard instead of /leaderboard');
    console.log('3. Both executives should have full admin access');

    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the fix
fixJakeAdminRole()
  .then(success => {
    if (success) {
      console.log('\n✅ Role fix completed successfully!');
    } else {
      console.log('\n❌ Role fix failed. Please check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  }); 
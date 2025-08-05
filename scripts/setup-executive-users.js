import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Executive users configuration
const EXECUTIVE_USERS = [
  {
    email: 'jmarkey@irelandpay.com',
    agent_name: 'Jake Markey',
    role: 'admin',
    approval_status: 'approved'
  },
  {
    email: 'wvazquez@irelandpay.com',
    agent_name: 'Wilfredo Vazquez',
    role: 'admin',
    approval_status: 'approved'
  }
];

async function setupExecutiveUsers() {
  console.log('🚀 Setting up executive users for Ireland Pay Analytics...');
  console.log('Only these 2 executives will have access to the application.\n');
  
  try {
    for (const user of EXECUTIVE_USERS) {
      console.log(`📧 Setting up executive: ${user.email}`);
      
      // Step 1: Create/update user in Supabase Auth
      const { data: existingAuthUser, error: authLookupError } = await supabase.auth.admin.listUsers();
      
      if (authLookupError) {
        console.error(`❌ Error looking up auth users:`, authLookupError);
        continue;
      }
      
      let authUser = existingAuthUser.users.find(u => u.email === user.email);
      
      if (!authUser) {
        // Create new auth user
        const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'IrelandPay2025!', // They should change this on first login
          email_confirm: true,
          user_metadata: { 
            name: user.agent_name,
            role: 'admin'
          }
        });
        
        if (createAuthError) {
          console.error(`❌ Error creating auth user ${user.email}:`, createAuthError);
          continue;
        }
        
        authUser = newAuthUser.user;
        console.log(`✅ Created auth user: ${user.email}`);
      } else {
        console.log(`ℹ️  Auth user already exists: ${user.email}`);
      }
      
      // Step 2: Check if user exists in agents table
      const { data: existingAgent, error: agentLookupError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (agentLookupError) {
        console.error(`❌ Error looking up agent ${user.email}:`, agentLookupError);
        continue;
      }
      
      if (existingAgent) {
        // Update existing agent to ensure admin role
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_name: user.agent_name,
            role: user.role,
            approval_status: user.approval_status
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.error(`❌ Error updating agent ${user.email}:`, updateError);
        } else {
          console.log(`✅ Updated agent record: ${user.email}`);
        }
      } else {
        // Create new agent record
        const { error: insertError } = await supabase
          .from('agents')
          .insert({
            email: user.email,
            agent_name: user.agent_name,
            role: user.role,
            approval_status: user.approval_status
          });
        
        if (insertError) {
          console.error(`❌ Error creating agent ${user.email}:`, insertError);
        } else {
          console.log(`✅ Created agent record: ${user.email}`);
        }
      }
      
      console.log(`🎯 Executive setup complete: ${user.email}\n`);
    }
    
    console.log('🎉 Executive users setup complete!');
    console.log('\n📋 Executive Users Configured:');
    EXECUTIVE_USERS.forEach(user => {
      console.log(`   • ${user.email} (${user.agent_name}) - ${user.role.toUpperCase()}`);
    });
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Default password: IrelandPay2025!');
    console.log('   Users should change their password on first login.');
    
    console.log('\n🚫 Security Note:');
    console.log('   Only these 2 executives have access to the application.');
    console.log('   All other users will be denied access.');
    
  } catch (error) {
    console.error('❌ Error setting up executive users:', error);
    process.exit(1);
  }
}

// Run the setup
setupExecutiveUsers(); 
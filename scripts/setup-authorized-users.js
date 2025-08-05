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

// Authorized users configuration
const AUTHORIZED_USERS = [
  {
    email: 'wvazquez@irelandpay.com',
    agent_name: 'William Vazquez',
    role: 'admin', // Give admin access
    approval_status: 'approved'
  },
  {
    email: 'jmarkey@irelandpay.com',
    agent_name: 'John Markey',
    role: 'admin', // Give admin access
    approval_status: 'approved'
  }
];

async function setupAuthorizedUsers() {
  console.log('Setting up authorized users...');
  
  try {
    for (const user of AUTHORIZED_USERS) {
      console.log(`Setting up user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`Error checking existing user ${user.email}:`, fetchError);
        continue;
      }
      
      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_name: user.agent_name,
            role: user.role,
            approval_status: user.approval_status
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.error(`Error updating user ${user.email}:`, updateError);
        } else {
          console.log(`✅ Updated user: ${user.email}`);
        }
      } else {
        // Create new user
        const { error: insertError } = await supabase
          .from('agents')
          .insert(user);
        
        if (insertError) {
          console.error(`Error creating user ${user.email}:`, insertError);
        } else {
          console.log(`✅ Created user: ${user.email}`);
        }
      }
    }
    
    console.log('\n🎉 Authorized users setup complete!');
    console.log('\nUsers configured:');
    AUTHORIZED_USERS.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('Error setting up authorized users:', error);
    process.exit(1);
  }
}

// Run the setup
setupAuthorizedUsers(); 
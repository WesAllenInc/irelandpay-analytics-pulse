/**
 * Create Admin User in Supabase
 * 
 * This script creates an admin user in Supabase using the service role key
 * from your .env file.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdminUser() {
  // Email and password for the admin user
  const email = process.env.ADMIN_EMAIL || 'jmarkey@irelandpay.com';
  const password = process.env.ADMIN_PASSWORD || 'IRLP@2025';
  
  console.log(`Creating admin user with email: ${email}`);
  
  try {
    // Create the user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { role: 'admin' }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return false;
    }

    console.log('User created successfully:', userData.user);

    // Insert the user into the agents table with admin role and approved status
    if (userData && userData.user) {
      const { error: roleError } = await supabase
        .from('agents')
        .insert({
          email: userData.user.email,
          agent_name: 'John Markey',
          role: 'admin',
          approval_status: 'approved'
        });

      if (roleError) {
        console.error('Error setting user role in database:', roleError);
      } else {
        console.log('User role set in database');
      }
    }

    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Execute the function
createAdminUser()
  .then((success) => {
    if (success) {
      console.log('Admin user creation completed successfully.');
    } else {
      console.error('Admin user creation failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Error executing script:', err);
    process.exit(1);
  });

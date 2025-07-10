import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  const email = 'jmarkey@irelandpay.com';
  // Use password from environment variable for security
  const password = process.env.ADMIN_PASSWORD;
  
  if (!password) {
    console.error('Error: ADMIN_PASSWORD environment variable must be set');
    console.error('For security reasons, passwords should not be hardcoded.');
    console.error('Usage: ADMIN_PASSWORD=your_secure_password ts-node create-admin-user.ts');
    process.exit(1);
  }
  const name = 'John Markey';
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('agents')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      console.log(`User ${email} already exists. Updating role to admin and approval status to approved.`);
      
      // Update existing user to admin and approved
      await supabase
        .from('agents')
        .update({ 
          role: 'admin',
          approval_status: 'approved'
        })
        .eq('email', email);
      
      console.log(`User ${email} has been updated to admin role with approved status.`);
      return;
    }
    
    // Create new user in Auth
    console.log(`Creating new admin user: ${email}`);
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });
    
    if (authError) {
      throw authError;
    }
    
    console.log(`Auth user created: ${authUser.user.id}`);
    
    // Add user to agents table with admin role and approved status
    const { error: agentError } = await supabase
      .from('agents')
      .insert({
        email,
        agent_name: name,
        role: 'admin',
        approval_status: 'approved'
      });
    
    if (agentError) {
      throw agentError;
    }
    
    console.log(`Admin user ${email} created successfully with approved status.`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser()
  .then(() => {
    console.log('Admin user setup completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

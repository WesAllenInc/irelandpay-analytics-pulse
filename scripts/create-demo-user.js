// Script to create a demo user for testing purposes
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Demo user credentials - these will be used to sign in
const DEMO_EMAIL = 'demo@irelandpay.com';
const DEMO_PASSWORD = 'Demo@IrelandPay123';

async function createDemoUser() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing Supabase credentials in environment variables.');
    console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  // Initialize Supabase admin client with service role key for admin operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if the user already exists
    const { data: existingUsers, error: searchError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', DEMO_EMAIL)
      .maybeSingle();

    if (searchError) {
      // Try an alternative approach if direct table access fails
      console.log('Attempting to create user regardless...');
    } else if (existingUsers) {
      console.log(`Demo user already exists: ${DEMO_EMAIL}`);
      console.log('You can use these credentials to login:');
      console.log(`Email: ${DEMO_EMAIL}`);
      console.log(`Password: ${DEMO_PASSWORD}`);
      process.exit(0);
    }

    // Create a new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true // Auto-confirm the email
    });

    if (error) {
      throw error;
    }

    console.log('✅ Demo user created successfully!');
    console.log('Use the following credentials to login:');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    
  } catch (error) {
    console.error('Error creating demo user:', error.message);
    process.exit(1);
  }
}

createDemoUser();

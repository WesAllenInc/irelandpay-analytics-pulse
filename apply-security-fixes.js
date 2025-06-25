// Script to apply security fixes directly through Supabase JS client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySqlScript() {
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'supabase', 'migrations', '20250625_fix_security_issues.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Applying security fixes SQL script...');
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('pgtle_admin', { sql });
    
    if (error) {
      console.error('Error applying security fixes:', error);
      return;
    }
    
    console.log('Security fixes applied successfully!');
  } catch (error) {
    console.error('Error reading or executing SQL file:', error);
  }
}

// Execute script
applySqlScript();

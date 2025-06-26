const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  try {
    console.log('Applying approval status migration...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Read migration SQL
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_approval_status_to_agents.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      throw error;
    }
    
    console.log('Migration applied successfully!');
    console.log('✅ Added approval_status column to agents table');
    console.log('✅ Created admin_notifications table');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

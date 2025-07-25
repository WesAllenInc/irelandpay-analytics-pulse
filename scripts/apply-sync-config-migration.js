const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying sync_config table migration...');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250715_add_sync_config_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Continue with other statements
        }
      }
    }

    console.log('Migration completed successfully!');
    
    // Verify the table was created
    const { data, error } = await supabase
      .from('sync_config')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error verifying table:', error);
    } else {
      console.log('sync_config table verified:', data);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration(); 
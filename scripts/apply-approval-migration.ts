import { createSupabaseServiceClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('Applying approval status migration...');
    const supabase = createSupabaseServiceClient();
    
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

applyMigration();

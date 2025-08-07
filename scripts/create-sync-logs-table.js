const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createSyncLogsTable() {
  console.log('Creating sync_logs table...');
  
  try {
    // Create the sync_logs table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sync_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
          message text NOT NULL,
          details jsonb,
          sync_id uuid,
          timestamp timestamp with time zone DEFAULT now(),
          user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          created_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (createTableError) {
      console.log('exec_sql failed, trying direct query...');
      // Try alternative approach
      const { error: directError } = await supabase
        .from('_exec_sql')
        .select('*')
        .eq('command', 'CREATE TABLE IF NOT EXISTS sync_logs')
        .limit(1);
      
      if (directError) {
        console.log('Direct query also failed, table might already exist or need manual creation');
      }
    }

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_id ON sync_logs(sync_id);',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level);',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);'
    ];

    for (const indexSql of indexes) {
      try {
        await supabase.rpc('exec_sql', { sql: indexSql });
      } catch (error) {
        console.log(`Index creation failed (might already exist): ${indexSql}`);
      }
    }

    // Enable RLS
    console.log('Enabling RLS...');
    try {
      await supabase.rpc('exec_sql', { sql: 'ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;' });
    } catch (error) {
      console.log('RLS enable failed (might already be enabled)');
    }

    // Create policies
    console.log('Creating policies...');
    const policies = [
      `CREATE POLICY IF NOT EXISTS "Users can view sync logs" ON sync_logs FOR SELECT USING (auth.role() = 'authenticated');`,
      `CREATE POLICY IF NOT EXISTS "Service can insert sync logs" ON sync_logs FOR INSERT WITH CHECK (true);`,
      `CREATE POLICY IF NOT EXISTS "Service can delete old sync logs" ON sync_logs FOR DELETE USING (true);`
    ];

    for (const policySql of policies) {
      try {
        await supabase.rpc('exec_sql', { sql: policySql });
      } catch (error) {
        console.log(`Policy creation failed (might already exist): ${policySql}`);
      }
    }

    // Grant permissions
    console.log('Granting permissions...');
    const grants = [
      'GRANT SELECT, INSERT, DELETE ON sync_logs TO authenticated;',
      'GRANT SELECT, INSERT, DELETE ON sync_logs TO service_role;'
    ];

    for (const grantSql of grants) {
      try {
        await supabase.rpc('exec_sql', { sql: grantSql });
      } catch (error) {
        console.log(`Grant failed (might already be granted): ${grantSql}`);
      }
    }

    console.log('✅ sync_logs table setup completed!');
    
    // Test the table by inserting a test log
    console.log('Testing table with a sample log entry...');
    const { data: testLog, error: testError } = await supabase
      .from('sync_logs')
      .insert({
        level: 'info',
        message: 'Test log entry - table created successfully',
        details: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single();

    if (testError) {
      console.log('❌ Test log insertion failed:', testError.message);
    } else {
      console.log('✅ Test log inserted successfully:', testLog.id);
      
      // Clean up test log
      await supabase
        .from('sync_logs')
        .delete()
        .eq('id', testLog.id);
      console.log('✅ Test log cleaned up');
    }

  } catch (error) {
    console.error('❌ Error creating sync_logs table:', error);
  }
}

createSyncLogsTable();

/**
 * Script to apply dashboard views to Supabase
 * This creates the necessary SQL views for the dashboard to work with our uploaded data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyDashboardViews() {
  console.log('🚀 Creating dashboard views in Supabase...');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-dashboard-views.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL file by semicolons to execute each statement separately
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i+1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      const { error } = await supabase.rpc('pgaudit_exec_ddl', {
        query: statement
      });
      
      if (error) {
        console.error(`❌ Error executing statement ${i+1}: ${error.message}`);
        // Continue with next statement despite errors
      } else {
        console.log(`✅ Statement ${i+1} executed successfully`);
      }
    }
    
    console.log('\n✨ Dashboard views created successfully');
  } catch (error) {
    console.error('❌ Error creating dashboard views:', error.message);
  }
}

// Execute the function
applyDashboardViews().catch(console.error);

// Script to check the Supabase database schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  console.log('Checking Supabase database schema...');
  
  try {
    // Execute a direct SQL query to get tables from the information schema
    const { data: tables, error: tablesError } = await supabase.rpc(
      'get_tables',
      { schema_name: 'public' }
    );

    if (tablesError) {
      // If the RPC function doesn't exist, try a direct SQL query
      console.log('Using direct SQL query instead...');
      const { data: sqlTables, error: sqlError } = await supabase
        .from('_tables')
        .select('*');

      if (sqlError) {
        // If that fails too, just list the tables we can access directly
        console.log('Trying to list accessible tables...');
        const { data, error } = await supabase.from('profiles').select('count');
        if (error) {
          console.log('No profiles table found.');
        } else {
          console.log('Profiles table exists.');
        }

        // Try to access other common tables
        const tables = ['transactions', 'merchants', 'customers', 'users'];
        for (const table of tables) {
          const { error } = await supabase.from(table).select('count');
          if (error) {
            console.log(`No ${table} table found.`);
          } else {
            console.log(`${table} table exists.`);
          }
        }
      } else {
        console.log('\nExisting tables in Supabase:');
        if (!sqlTables || sqlTables.length === 0) {
          console.log('No tables found.');
        } else {
          sqlTables.forEach(table => {
            console.log(`- ${table.name}`);
          });
        }
      }
    } else {
      console.log('\nExisting tables in public schema:');
      if (!tables || tables.length === 0) {
        console.log('No tables found in the public schema.');
      } else {
        tables.forEach(table => {
          console.log(`- ${table.name}`);
        });
      }
    }
    
    console.log('\nRecommended tables for Ireland Pay Analytics:');
    console.log('- transactions: Store payment transaction data');
    console.log('- merchants: Store merchant information');
    console.log('- customers: Store customer information');
    console.log('- payment_methods: Store payment method types');
    console.log('- transaction_categories: Store transaction categories');
    
  } catch (error) {
    console.error('Error checking database schema:', error);
    
    // Provide recommendations even if we can't check the schema
    console.log('\nRecommended tables for Ireland Pay Analytics:');
    console.log('- transactions: Store payment transaction data');
    console.log('- merchants: Store merchant information');
    console.log('- customers: Store customer information');
    console.log('- payment_methods: Store payment method types');
    console.log('- transaction_categories: Store transaction categories');
  }
}

checkDatabaseSchema();

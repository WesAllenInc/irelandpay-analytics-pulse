// Script to set up the Supabase database for Ireland Pay Analytics
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Setting up Ireland Pay Analytics database...');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // If the RPC method doesn't exist, we need to execute the SQL statements individually
      console.log('RPC method not available. Executing SQL statements via REST API...');
      
      // Split the SQL into individual statements
      const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('pg_execute', { query: statement });
        if (error) {
          console.error(`Error executing statement: ${error.message}`);
        }
      }
      
      console.log('Database setup completed with some statements.');
    } else {
      console.log('Database setup completed successfully!');
    }
    
    // Insert sample data for testing
    await insertSampleData();
    
  } catch (error) {
    console.error('Error setting up database:', error);
    
    // Try an alternative approach - create tables directly via the API
    console.log('Trying alternative approach...');
    await createTablesViaAPI();
  }
}

async function createTablesViaAPI() {
  try {
    // Create merchants table
    console.log('Creating merchants table...');
    const { error: merchantsError } = await supabase
      .from('merchants')
      .insert([
        { 
          name: 'Sample Merchant', 
          email: 'merchant@example.com',
          business_type: 'Retail'
        }
      ])
      .select();
    
    if (merchantsError) {
      if (merchantsError.code === '42P01') {
        console.log('Merchants table does not exist. Creating it first...');
        // We would need to create the table first, but this is complex via the API
        // Instead, guide the user to use the Supabase dashboard
      } else {
        console.error('Error with merchants table:', merchantsError);
      }
    } else {
      console.log('Merchants table exists and sample data inserted.');
    }
    
    // Try to create other tables similarly...
    
  } catch (error) {
    console.error('Error in alternative approach:', error);
    console.log('\nRecommendation: Use the Supabase dashboard to execute the SQL script manually.');
    console.log('1. Go to https://app.supabase.com and open your project');
    console.log('2. Go to the SQL Editor');
    console.log('3. Copy and paste the contents of scripts/setup-database.sql');
    console.log('4. Run the SQL script');
  }
}

async function insertSampleData() {
  console.log('Inserting sample data...');
  
  try {
    // Insert sample merchants
    const { error: merchantsError } = await supabase
      .from('merchants')
      .insert([
        { name: 'Dublin Retail Ltd', email: 'info@dublinretail.com', business_type: 'Retail' },
        { name: 'Cork Cafe', email: 'hello@corkcafe.ie', business_type: 'Food & Beverage' },
        { name: 'Galway Tours', email: 'bookings@galwaytours.com', business_type: 'Travel' },
        { name: 'Limerick Services', email: 'contact@limerickservices.ie', business_type: 'Services' }
      ]);
    
    if (merchantsError) {
      console.error('Error inserting merchants:', merchantsError);
    } else {
      console.log('Sample merchants inserted successfully.');
    }
    
    // Insert sample customers
    const { error: customersError } = await supabase
      .from('customers')
      .insert([
        { first_name: 'John', last_name: 'Murphy', email: 'john.murphy@example.com' },
        { first_name: 'Mary', last_name: 'Kelly', email: 'mary.kelly@example.com' },
        { first_name: 'Patrick', last_name: 'O\'Brien', email: 'patrick.obrien@example.com' },
        { first_name: 'Siobhan', last_name: 'Walsh', email: 'siobhan.walsh@example.com' }
      ]);
    
    if (customersError) {
      console.error('Error inserting customers:', customersError);
    } else {
      console.log('Sample customers inserted successfully.');
    }
    
    // Get merchant IDs
    const { data: merchants } = await supabase.from('merchants').select('id, name');
    
    // Get customer IDs
    const { data: customers } = await supabase.from('customers').select('id');
    
    // Get payment method IDs
    const { data: paymentMethods } = await supabase.from('payment_methods').select('id');
    
    // Get category IDs
    const { data: categories } = await supabase.from('transaction_categories').select('id');
    
    if (merchants && customers && paymentMethods && categories) {
      // Insert sample transactions
      const transactions = [];
      const statuses = ['completed', 'pending', 'failed', 'refunded'];
      const today = new Date();
      
      // Generate transactions for the last 30 days
      for (let i = 0; i < 100; i++) {
        const transactionDate = new Date(today);
        transactionDate.setDate(today.getDate() - Math.floor(Math.random() * 30));
        
        transactions.push({
          merchant_id: merchants[Math.floor(Math.random() * merchants.length)].id,
          customer_id: customers[Math.floor(Math.random() * customers.length)].id,
          payment_method_id: paymentMethods[Math.floor(Math.random() * paymentMethods.length)].id,
          category_id: categories[Math.floor(Math.random() * categories.length)].id,
          amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          reference_number: `REF-${Math.floor(Math.random() * 1000000)}`,
          transaction_date: transactionDate.toISOString()
        });
      }
      
      const { error: transactionsError } = await supabase.from('transactions').insert(transactions);
      
      if (transactionsError) {
        console.error('Error inserting transactions:', transactionsError);
      } else {
        console.log('Sample transactions inserted successfully.');
      }
    }
    
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

setupDatabase();

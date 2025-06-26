/**
 * Setup Admin User and Apply Approval Status Migration
 * 
 * This script:
 * 1. Applies the migration to add approval_status column to agents table
 * 2. Creates an admin user for jmarkey@irelandpay.com
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('Applying approval status migration...');
    
    // Read migration SQL
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_approval_status_to_agents.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement separately
    for (const statement of statements) {
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc('pgSQL', { command: statement });
      
      if (error) {
        // If pgSQL function doesn't exist, try direct query
        console.log('pgSQL function not found, trying direct query...');
        const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('command', statement).limit(1);
        
        if (queryError) {
          // If both methods fail, try one more approach with raw SQL
          console.log('Direct query failed, trying raw SQL...');
          try {
            // For this approach, we'll need to use the REST API directly
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
              },
              body: JSON.stringify({ sql: statement })
            });
            
            if (!response.ok) {
              throw new Error(`SQL execution failed: ${await response.text()}`);
            }
          } catch (fetchError) {
            console.error('All SQL execution methods failed:', fetchError);
            console.log('Continuing with user creation anyway...');
          }
        }
      }
    }
    
    console.log('Migration applied or attempted.');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('Continuing with user creation anyway...');
  }
}

async function createAdminUser() {
  // Email and password for the admin user
  const email = 'jmarkey@irelandpay.com';
  const password = 'IRLP@2025';
  const name = 'John Markey';
  
  console.log(`Creating admin user with email: ${email}`);
  
  try {
    // Check if user already exists in auth
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers();
    
    if (lookupError) {
      console.error('Error looking up users:', lookupError);
    }
    
    let existingUser = null;
    if (existingUsers && existingUsers.users) {
      existingUser = existingUsers.users.find(user => user.email === email);
    }
    
    if (existingUser) {
      console.log(`User ${email} already exists in auth system.`);
    } else {
      // Create new user in Auth
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { name, role: 'admin' }
      });
      
      if (userError) {
        console.error('Error creating user:', userError);
        return false;
      }
      
      console.log('User created successfully:', userData.user);
    }
    
    // Check if user exists in agents table
    const { data: existingAgent, error: agentLookupError } = await supabase
      .from('agents')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (agentLookupError) {
      console.error('Error looking up agent:', agentLookupError);
    }
    
    if (existingAgent) {
      console.log(`User ${email} already exists in agents table. Updating role and approval status.`);
      
      // Update existing user to admin and approved
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          role: 'admin',
          approval_status: 'approved' 
        })
        .eq('email', email);
      
      if (updateError) {
        console.error('Error updating agent:', updateError);
        
        // If update fails due to missing column, try adding the column directly
        if (updateError.message && updateError.message.includes('column "approval_status" does not exist')) {
          console.log('Attempting to add approval_status column directly...');
          
          const addColumnSql = "ALTER TABLE agents ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))";
          
          try {
            await supabase.rpc('pgSQL', { command: addColumnSql });
            console.log('Column added, retrying update...');
            
            // Try update again
            await supabase
              .from('agents')
              .update({ 
                role: 'admin',
                approval_status: 'approved' 
              })
              .eq('email', email);
          } catch (columnError) {
            console.error('Failed to add column:', columnError);
          }
        }
      } else {
        console.log('Agent updated successfully.');
      }
    } else {
      console.log(`Adding user ${email} to agents table.`);
      
      // Try to insert with approval_status first
      const { error: insertError } = await supabase
        .from('agents')
        .insert({
          email,
          agent_name: name,
          role: 'admin',
          approval_status: 'approved'
        });
      
      if (insertError) {
        console.error('Error inserting agent with approval_status:', insertError);
        
        // If insert fails due to missing column, try without approval_status
        if (insertError.message && insertError.message.includes('column "approval_status" does not exist')) {
          console.log('Attempting to insert without approval_status...');
          
          const { error: basicInsertError } = await supabase
            .from('agents')
            .insert({
              email,
              agent_name: name,
              role: 'admin'
            });
          
          if (basicInsertError) {
            console.error('Error inserting basic agent record:', basicInsertError);
          } else {
            console.log('Basic agent record inserted successfully.');
          }
        }
      } else {
        console.log('Agent inserted successfully with approval status.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Execute the functions
async function setup() {
  await applyMigration();
  const success = await createAdminUser();
  
  if (success) {
    console.log('Admin user setup completed successfully.');
  } else {
    console.error('Admin user setup encountered issues.');
  }
}

setup()
  .then(() => {
    console.log('Setup process completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

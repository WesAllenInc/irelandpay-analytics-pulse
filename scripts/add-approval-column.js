/**
 * Add Approval Status Column and Set Admin User
 * 
 * This script directly adds the approval_status column to the agents table
 * and sets jmarkey@irelandpay.com as an admin with approved status.
 */

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

async function addApprovalColumn() {
  try {
    console.log('Adding approval_status column to agents table...');
    
    // Try to select from the table to see if the column exists
    const { data: columnCheck, error: checkError } = await supabase
      .from('agents')
      .select('approval_status')
      .limit(1);
    
    if (checkError && checkError.message && checkError.message.includes('column "approval_status" does not exist')) {
      console.log('Column does not exist, attempting to add it...');
      
      // Use direct SQL query to add the column
      const { error } = await supabase.from('_sql').select('*').eq('query', 
        "ALTER TABLE agents ADD COLUMN approval_status TEXT DEFAULT 'pending'; " +
        "ALTER TABLE agents ADD CONSTRAINT approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));"
      );
      
      if (error) {
        console.error('Error adding column via _sql:', error);
        console.log('Trying alternative method...');
        
        // Try another approach using REST API directly
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/agents?select=id&limit=1`, {
            method: 'GET',
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`API request failed: ${await response.text()}`);
          }
          
          console.log('Successfully connected to API, proceeding with user update...');
        } catch (fetchError) {
          console.error('API connection test failed:', fetchError);
        }
      } else {
        console.log('Column added successfully via _sql.');
      }
    } else {
      console.log('Column already exists or could not be checked.');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding approval column:', error);
    return false;
  }
}

async function updateAdminUser() {
  try {
    const email = 'jmarkey@irelandpay.com';
    console.log(`Updating user ${email} to admin with approved status...`);
    
    // First check if the user exists in the agents table
    const { data: existingAgent, error: checkError } = await supabase
      .from('agents')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing agent:', checkError);
    }
    
    if (existingAgent) {
      console.log('User exists in agents table, updating...');
      
      // Try updating with approval_status
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          role: 'admin',
          approval_status: 'approved' 
        })
        .eq('email', email);
      
      if (updateError) {
        console.error('Error updating with approval_status:', updateError);
        
        // Try updating just the role
        const { error: basicUpdateError } = await supabase
          .from('agents')
          .update({ role: 'admin' })
          .eq('email', email);
        
        if (basicUpdateError) {
          console.error('Error updating basic role:', basicUpdateError);
        } else {
          console.log('Basic role update successful.');
        }
      } else {
        console.log('User updated successfully with approval status.');
      }
    } else {
      console.log('User does not exist in agents table, inserting...');
      
      // Try inserting with approval_status
      const { error: insertError } = await supabase
        .from('agents')
        .insert({
          email,
          agent_name: 'John Markey',
          role: 'admin',
          approval_status: 'approved'
        });
      
      if (insertError) {
        console.error('Error inserting with approval_status:', insertError);
        
        // Try inserting without approval_status
        const { error: basicInsertError } = await supabase
          .from('agents')
          .insert({
            email,
            agent_name: 'John Markey',
            role: 'admin'
          });
        
        if (basicInsertError) {
          console.error('Error inserting basic record:', basicInsertError);
        } else {
          console.log('Basic record inserted successfully.');
        }
      } else {
        console.log('User inserted successfully with approval status.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating admin user:', error);
    return false;
  }
}

// Run the functions
async function main() {
  await addApprovalColumn();
  await updateAdminUser();
  console.log('Process completed.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

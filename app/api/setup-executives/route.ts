import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Executive users configuration
const EXECUTIVE_USERS = [
  {
    email: 'jmarkey@irelandpay.com',
    agent_name: 'Jake Markey',
    role: 'admin',
    approval_status: 'approved'
  },
  {
    email: 'wvazquez@irelandpay.com',
    agent_name: 'Wilfredo Vazquez',
    role: 'admin',
    approval_status: 'approved'
  }
];

export async function POST() {
  try {
    const supabase = createSupabaseServiceClient();
    
    console.log('🚀 Setting up executive users for Ireland Pay Analytics...');
    
    const results = [];
    
    for (const user of EXECUTIVE_USERS) {
      console.log(`📧 Setting up executive: ${user.email}`);
      
      // Step 1: Create/update user in Supabase Auth
      const { data: existingAuthUsers, error: authLookupError } = await supabase.auth.admin.listUsers();
      
      if (authLookupError) {
        console.error(`❌ Error looking up auth users:`, authLookupError);
        results.push({ email: user.email, status: 'error', message: 'Auth lookup failed' });
        continue;
      }
      
      let authUser = existingAuthUsers.users.find(u => u.email === user.email);
      
      if (!authUser) {
        // Create new auth user
        const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'IrelandPay2025!', // They should change this on first login
          email_confirm: true,
          user_metadata: { 
            name: user.agent_name,
            role: 'admin'
          }
        });
        
        if (createAuthError) {
          console.error(`❌ Error creating auth user ${user.email}:`, createAuthError);
          results.push({ email: user.email, status: 'error', message: createAuthError.message });
          continue;
        }
        
        authUser = newAuthUser.user;
        console.log(`✅ Created auth user: ${user.email}`);
        results.push({ email: user.email, status: 'auth_created' });
      } else {
        console.log(`ℹ️  Auth user already exists: ${user.email}`);
        results.push({ email: user.email, status: 'auth_exists' });
      }
      
      // Step 2: Check if user exists in agents table
      const { data: existingAgent, error: agentLookupError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (agentLookupError) {
        console.error(`❌ Error looking up agent ${user.email}:`, agentLookupError);
        results.push({ email: user.email, status: 'error', message: 'Agent lookup failed' });
        continue;
      }
      
      if (existingAgent) {
        // Update existing agent to ensure admin role
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_name: user.agent_name,
            role: user.role,
            approval_status: user.approval_status
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.error(`❌ Error updating agent ${user.email}:`, updateError);
          results.push({ email: user.email, status: 'error', message: updateError.message });
        } else {
          console.log(`✅ Updated agent record: ${user.email}`);
          results.push({ email: user.email, status: 'agent_updated' });
        }
      } else {
        // Create new agent record
        const { error: insertError } = await supabase
          .from('agents')
          .insert({
            email: user.email,
            agent_name: user.agent_name,
            role: user.role,
            approval_status: user.approval_status
          });
        
        if (insertError) {
          console.error(`❌ Error creating agent ${user.email}:`, insertError);
          results.push({ email: user.email, status: 'error', message: insertError.message });
        } else {
          console.log(`✅ Created agent record: ${user.email}`);
          results.push({ email: user.email, status: 'agent_created' });
        }
      }
    }
    
    console.log('🎉 Executive users setup complete!');
    
    return NextResponse.json({
      success: true,
      message: 'Executive users setup complete',
      results,
      executives: EXECUTIVE_USERS.map(u => ({ email: u.email, name: u.agent_name })),
      note: 'Default password: IrelandPay2025! (users should change on first login)'
    });
    
  } catch (error) {
    console.error('❌ Error setting up executive users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// Authorized users configuration
const AUTHORIZED_USERS = [
  {
    email: 'wvazquez@irelandpay.com',
    agent_name: 'William Vazquez',
    role: 'admin'
  },
  {
    email: 'jmarkey@irelandpay.com',
    agent_name: 'John Markey',
    role: 'admin'
  }
];

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    
    console.log('Setting up authorized users...');
    
    const results = [];
    
    for (const user of AUTHORIZED_USERS) {
      console.log(`Setting up user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`Error checking existing user ${user.email}:`, fetchError);
        results.push({ email: user.email, status: 'error', message: fetchError.message });
        continue;
      }
      
      if (existingUser) {
        // Update existing user (without approval_status to avoid schema issues)
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_name: user.agent_name,
            role: user.role
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.error(`Error updating user ${user.email}:`, updateError);
          results.push({ email: user.email, status: 'error', message: updateError.message });
        } else {
          console.log(`✅ Updated user: ${user.email}`);
          results.push({ email: user.email, status: 'updated' });
        }
      } else {
        // Create new user (without approval_status to avoid schema issues)
        const { error: insertError } = await supabase
          .from('agents')
          .insert(user);
        
        if (insertError) {
          console.error(`Error creating user ${user.email}:`, insertError);
          results.push({ email: user.email, status: 'error', message: insertError.message });
        } else {
          console.log(`✅ Created user: ${user.email}`);
          results.push({ email: user.email, status: 'created' });
        }
      }
    }
    
    console.log('🎉 Authorized users setup complete!');
    
    return NextResponse.json({
      success: true,
      message: 'Authorized users setup complete',
      results
    });
    
  } catch (error) {
    console.error('Error setting up authorized users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
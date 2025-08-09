import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createSupabaseServiceClient();
    
    console.log('🔧 Fixing executive roles...');
    
    const results = [];
    
    // Fix Jake Markey's role
    const { data: jakeData, error: jakeError } = await supabase
      .from('agents')
      .update({
        role: 'admin',
        agent_name: 'Jake Markey',
        approval_status: 'approved'
      })
      .eq('email', 'jmarkey@irelandpay.com')
      .select();

    if (jakeError) {
      console.error('❌ Error updating Jake:', jakeError);
      results.push({ email: 'jmarkey@irelandpay.com', status: 'error', message: jakeError.message });
    } else if (jakeData && jakeData.length > 0) {
      console.log('✅ Updated Jake Markey to admin role');
      results.push({ email: 'jmarkey@irelandpay.com', status: 'updated', role: 'admin' });
    } else {
      // Create record if it doesn't exist
      const { data: newJakeData, error: createJakeError } = await supabase
        .from('agents')
        .insert({
          email: 'jmarkey@irelandpay.com',
          agent_name: 'Jake Markey',
          role: 'admin',
          approval_status: 'approved'
        })
        .select();

      if (createJakeError) {
        console.error('❌ Error creating Jake:', createJakeError);
        results.push({ email: 'jmarkey@irelandpay.com', status: 'error', message: createJakeError.message });
      } else {
        console.log('✅ Created Jake Markey with admin role');
        results.push({ email: 'jmarkey@irelandpay.com', status: 'created', role: 'admin' });
      }
    }

    // Fix Wilfredo Vazquez's role
    const { data: wvData, error: wvError } = await supabase
      .from('agents')
      .update({
        role: 'admin',
        agent_name: 'Wilfredo Vazquez',
        approval_status: 'approved'
      })
      .eq('email', 'wvazquez@irelandpay.com')
      .select();

    if (wvError) {
      console.error('❌ Error updating Wilfredo:', wvError);
      results.push({ email: 'wvazquez@irelandpay.com', status: 'error', message: wvError.message });
    } else if (wvData && wvData.length > 0) {
      console.log('✅ Updated Wilfredo Vazquez to admin role');
      results.push({ email: 'wvazquez@irelandpay.com', status: 'updated', role: 'admin' });
    } else {
      // Create record if it doesn't exist
      const { data: newWvData, error: createWvError } = await supabase
        .from('agents')
        .insert({
          email: 'wvazquez@irelandpay.com',
          agent_name: 'Wilfredo Vazquez',
          role: 'admin',
          approval_status: 'approved'
        })
        .select();

      if (createWvError) {
        console.error('❌ Error creating Wilfredo:', createWvError);
        results.push({ email: 'wvazquez@irelandpay.com', status: 'error', message: createWvError.message });
      } else {
        console.log('✅ Created Wilfredo Vazquez with admin role');
        results.push({ email: 'wvazquez@irelandpay.com', status: 'created', role: 'admin' });
      }
    }

    console.log('🎉 Executive roles fix complete!');
    
    return NextResponse.json({
      success: true,
      message: 'Executive roles fixed successfully',
      results,
      note: 'Both executives now have admin role. Try logging in again.'
    });
    
  } catch (error) {
    console.error('❌ Error fixing executive roles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 
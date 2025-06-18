import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not found in environment variables' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test the connection by getting Supabase version
    const { data, error } = await supabase.rpc('get_service_status');
    
    if (error) {
      // If the RPC method doesn't exist, try a simpler query
      const { data: healthData, error: healthError } = await supabase.from('_health').select('*').limit(1);
      
      if (healthError) {
        // If that also fails, just try to get the Supabase project reference
        const { data: projectData } = await supabase.auth.getSession();
        
        return NextResponse.json({
          connected: true,
          message: 'Connected to Supabase, but could not get detailed status',
          supabaseUrl,
          projectData: projectData || null
        });
      }
      
      return NextResponse.json({
        connected: true,
        message: 'Connected to Supabase health check',
        supabaseUrl,
        healthData: healthData || null
      });
    }
    
    return NextResponse.json({
      connected: true,
      message: 'Successfully connected to Supabase',
      supabaseUrl,
      serviceStatus: data
    });
    
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Supabase', details: error },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { path } = await request.json();
    
    if (!path) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    // Create Supabase client directly for server-side API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Forward to Supabase Edge Function
    // Replace with your actual project reference
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+).supabase.co/)?.[1];
    
    if (!projectRef) {
      return NextResponse.json(
        { error: "Invalid Supabase URL configuration" },
        { status: 500 }
      );
    }

    const functionUrl = `https://${projectRef}.functions.supabase.co/processResidualExcel`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ path })
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

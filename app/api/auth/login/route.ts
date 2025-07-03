import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resetRateLimitForIP } from '@/lib/auth-rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const supabase = createSupabaseServerClient();
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If authentication fails, return error
    if (error) {
      console.error('[API] Login failed:', error.message);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // If authentication succeeds, reset rate limit for this IP
    // This is optional since the middleware already handles this,
    // but added here for demonstration purposes
    const clientIP = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    resetRateLimitForIP(clientIP);
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      user: data.user,
      message: 'Successfully logged in'
    });
  } catch (error) {
    console.error('[API] Login exception:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

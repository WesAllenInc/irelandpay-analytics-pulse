import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resetRateLimitForIP } from '@/lib/auth-rate-limiter';
import { logRequest, logError } from '@/lib/logging';

export async function POST(request: NextRequest) {
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { endpoint: 'api/auth/login' }
  });
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
      logError('[API] Login failed', new Error(error.message));
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // If authentication succeeds, reset rate limit for this IP
    // This is optional since the middleware already handles this,
    // but added here for demonstration purposes
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    resetRateLimitForIP(clientIP);
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      user: data.user,
      message: 'Successfully logged in'
    });
  } catch (error) {
    logError('[API] Login exception', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

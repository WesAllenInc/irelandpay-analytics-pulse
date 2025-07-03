import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resetRateLimitForIP } from '@/lib/auth-rate-limiter';
import { logRequest, logError } from '@/lib/logging';
import { z } from 'zod';
import { validateRequest, successResponse, errorResponse } from '@/lib/api-utils';

// Define the login request schema
const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Define the login response schema
const LoginResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string().email().optional(),
    app_metadata: z.record(z.any()).optional(),
    user_metadata: z.record(z.any()).optional(),
    aud: z.string().optional(),
    created_at: z.string().optional()
  }).optional(),
  message: z.string().optional()
});

// TypeScript type for login request
type LoginRequest = z.infer<typeof LoginRequestSchema>;

export async function POST(request: NextRequest) {
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { endpoint: 'api/auth/login' }
  });
  
  try {
    // Validate the request body
    const validation = await validateRequest<LoginRequest>(
      request, 
      LoginRequestSchema, 
      'Invalid login credentials format'
    );
    
    // If validation failed, return the error response
    if (validation.response) return validation.response;
    
    // Extract validated data
    const { email, password } = validation.data!;
    const supabase = createSupabaseServerClient();
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If authentication fails, return error
    if (error) {
      logError('[API] Login failed', new Error(error.message));
      return errorResponse('Invalid credentials', 401);
    }
    
    // If authentication succeeds, reset rate limit for this IP
    // This is optional since the middleware already handles this,
    // but added here for demonstration purposes
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    resetRateLimitForIP(clientIP);
    
    // Prepare success response data
    const responseData = { 
      success: true,
      user: data.user,
      message: 'Successfully logged in'
    };
    
    // Return the validated success response
    return successResponse(responseData, 'Successfully logged in');
  } catch (error) {
    logError('[API] Login exception', error instanceof Error ? error : new Error(String(error)));
    return errorResponse('An error occurred during login', 500);
  }
}

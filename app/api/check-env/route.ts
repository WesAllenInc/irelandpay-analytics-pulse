import { NextResponse } from 'next/server';
import { env, type Env } from '@/lib/env';

function isServerEnv(e: Env): e is { SUPABASE_SERVICE_ROLE_KEY: string } {
  return (e as any).SUPABASE_SERVICE_ROLE_KEY !== undefined;
}

export async function GET() {
  // Only return this in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      message: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  // Check environment variables using the validated env object
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌',
    SUPABASE_SERVICE_ROLE_KEY: isServerEnv(env) && env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
      ? 'Set ✅' : 'Missing ❌',
  };

  return NextResponse.json(envCheck);
}

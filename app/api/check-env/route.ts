import { NextResponse } from 'next/server';

export async function GET() {
  // Only return this in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      message: 'This endpoint is only available in development mode'
    }, { status: 403 });
  }

  // Check environment variables (masking sensitive values)
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? 'Set ✅' : 'Missing ❌',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL 
      ? 'Set ✅' : 'Missing ❌',
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID 
      ? 'Set ✅' : 'Missing ❌',
  };

  return NextResponse.json(envCheck);
}

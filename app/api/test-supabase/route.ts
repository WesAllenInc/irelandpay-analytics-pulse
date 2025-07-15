import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/lib/supabase/test-connection';

export async function GET() {
  const result = await testSupabaseConnection();
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }
  
  return NextResponse.json(result);
}

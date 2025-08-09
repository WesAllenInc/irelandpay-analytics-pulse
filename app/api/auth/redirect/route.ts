import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('to') || '/dashboard';
  
  console.log('🔍 [API REDIRECT] Starting redirect process');
  console.log('🔍 [API REDIRECT] Target:', target);
  
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  console.log('🔍 [API REDIRECT] Session found:', !!session);
  console.log('🔍 [API REDIRECT] User email:', session?.user?.email);
  
  if (!session?.user?.email) {
    console.log('❌ [API REDIRECT] No session, redirecting to auth');
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  
  // Check if user is an executive
  const { isExecutiveUser } = await import('@/lib/auth/executive-check');
  const isExecutive = isExecutiveUser(session.user.email);
  
  console.log('🔍 [API REDIRECT] Is executive:', isExecutive);
  
  if (isExecutive) {
    console.log('✅ [API REDIRECT] Executive user, redirecting to dashboard');
    // Add a small delay to ensure dashboard loads properly
    await new Promise(resolve => setTimeout(resolve, 2000));
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // For non-executive users, check database role
  const { data: agentData } = await supabase
    .from('agents')
    .select('role')
    .eq('email', session.user.email)
    .single();
  
  console.log('🔍 [API REDIRECT] Agent data:', agentData);
  
  const redirectPath = agentData?.role === 'admin' ? '/dashboard' : '/leaderboard';
  console.log('✅ [API REDIRECT] Redirecting to:', redirectPath);
  
  // Add a small delay to ensure page loads properly
  await new Promise(resolve => setTimeout(resolve, 2000));
  return NextResponse.redirect(new URL(redirectPath, request.url));
} 
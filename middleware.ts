import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from './lib/supabase';

// Define public routes that don't need authentication
const publicRoutes = [
  '/auth',
  '/auth/callback',
  '/_next',
  '/api/auth',
  '/favicon.ico',
  '/static'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Get session from Supabase
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // If user is not authenticated, redirect to auth page
  if (!session) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // If authenticated, fetch the user role
  const { data: userData } = await supabase
    .from('agents')
    .select('role')
    .eq('email', session.user.email || '')
    .single();
  
  const role = userData?.role || 'agent';
  
  // Redirect from root to appropriate dashboard
  if (pathname === '/') {
    const redirectUrl = role === 'admin' 
      ? new URL('/dashboard', request.url) 
      : new URL('/leaderboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Role-based access control
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/leaderboard', request.url));
  }
  
  if (pathname === '/dashboard' && role !== 'admin') {
    return NextResponse.redirect(new URL('/leaderboard', request.url));
  }
  
  return NextResponse.next();
}

// Apply middleware to specific paths
export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/admin/:path*',
    '/leaderboard',
    '/upload'
  ]
};

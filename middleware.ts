import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not logged in, redirect to login page
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Get user role from user metadata or database
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const userRole = userData?.role || 'agent';

  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isAgentPath = request.nextUrl.pathname.startsWith('/agent');

  // Redirect based on role and path
  if (isAdminPath && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/agent', request.url));
  }

  if (isAgentPath && userRole === 'admin') {
    // Allow admins to access agent pages if they navigate there directly
    return res;
  }

  // For the root path, redirect based on role
  if (request.nextUrl.pathname === '/') {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/agent', request.url));
    }
  }

  return res;
}

// Apply middleware to specific paths
export const config = {
  matcher: ['/', '/agent/:path*', '/admin/:path*'],
};

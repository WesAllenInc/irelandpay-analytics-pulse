import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from './lib/supabase';
import { authRateLimiter, resetRateLimitForIP } from './lib/auth-rate-limiter';
import { logRequest, debug, error as logError } from './lib/logging';

// Define public routes that don't need authentication
const publicRoutes = [
  '/auth',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/api',
  '/_next',
  '/favicon.ico',
  '/static',
  '/public'
];

export async function middleware(request: NextRequest) {
  // Auth-specific rate limiting for login endpoints
  if (request.nextUrl.pathname.startsWith('/auth/login') || request.nextUrl.pathname.startsWith('/api/auth/login')) {
    return authRateLimiter(request, async () => {
      // Continue with normal middleware processing
      return handleMiddleware(request);
    });
  }

  // For non-auth endpoints, proceed normally
  return handleMiddleware(request);
}

// Main middleware handler extracted to be used by rate limiter
async function handleMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get Supabase server client
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { pathname }
  });
  
  // Log authentication status without exposing session details
  debug('Checking authentication status', {
    isAuthenticated: !!session?.user?.email,
    pathname
  });

  // Only treat as authenticated if session?.user?.email exists
  if (!session || !session.user || !session.user.email) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Fetch user role if user is authenticated
  let userData = null;
  let role = 'agent'; // Default role
  
  if (session?.user?.email) {
    try {
      // First try with 'role' column
      const { data, error } = await supabase
        .from('agents')
        .select('role')
        .eq('email', session.user.email)
        .single();
      
      if (error) {
        logError('[Middleware] Error fetching role', error);
        // If role column doesn't exist, just use the default 'agent' role
      } else if (data) {
        role = data.role || 'agent';
      }
    } catch (err) {
      logError('[Middleware] Exception in role fetch', err instanceof Error ? err : new Error(String(err)));
      // Keep default role on error
    }
  }

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
    // Match all paths except those starting with the following
    '/((?!api|_next/static|_next/image|favicon.ico|static|public|auth).*)',
  ],
};

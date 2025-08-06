import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "./lib/supabase";
import { authRateLimiter } from "./lib/auth-rate-limiter";
import { logRequest, debug, error as logError } from "./lib/edge-logging";
import { validateCSRFToken, extractCSRFToken, refreshCSRFToken } from './lib/csrf';
import { hasAdminAccess } from "./lib/auth/executive-check";

// DEVELOPMENT/DEMO MODE: Set to true to bypass authentication temporarily
const DEMO_MODE = true;

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

// Simple admin route check without importing the problematic middleware
function isAdminRoute(pathname: string): boolean {
  const adminPaths = [
    '/admin',
    '/settings/api-sync',
    '/api/sync-irelandpay-crm',
    '/api/admin',
    '/dashboard/analytics',
    '/dashboard/settings'
  ];

  return adminPaths.some(adminPath => pathname.startsWith(adminPath));
}

export async function middleware(request: NextRequest) {
  // DEMO MODE: Bypass all authentication checks
  if (DEMO_MODE) {
    return NextResponse.next();
  }

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
    const response = NextResponse.next();
    // Still refresh CSRF token for public routes (for forms, etc.)
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/static')) {
      void refreshCSRFToken();
    }
    return response;
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
    pathname,
    hasSession: !!session,
    userEmail: session?.user?.email
  });

  // Check if user is authenticated
  if (!session?.user?.email) {
    debug('User not authenticated, redirecting to auth', { pathname });
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Check if user has admin access (either executive or database admin)
  const hasAdmin = await hasAdminAccess(session.user.email, supabase);
  
  if (!hasAdmin) {
    debug('User does not have admin access', { 
      email: session.user.email, 
      pathname 
    });
    return NextResponse.redirect(new URL('/unauthorized?error=admin-required', request.url));
  }

  // Check if this is an admin route - only allow admin users
  if (isAdminRoute(pathname)) {
    if (!hasAdmin) {
      debug('Non-admin user attempting to access admin route', { 
        email: session.user.email, 
        pathname 
      });
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    // Admin users can access admin routes
    debug('Admin user accessing admin route', { 
      email: session.user.email, 
      pathname 
    });
  }
  
  // CSRF protection for state-changing operations
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const token = extractCSRFToken(request);
    if (!validateCSRFToken(token)) {
      debug('Invalid CSRF token detected', { pathname, method: request.method });
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
  }

  // User is authenticated and authorized, proceed
  const response = NextResponse.next();
  
  // Refresh CSRF token for authenticated requests
  if (!pathname.startsWith('/_next') && !pathname.startsWith('/static')) {
    void refreshCSRFToken();
  }
  
  return response;
}


// Apply middleware to specific paths
export const config = {
  matcher: [
    // Match all paths except those starting with the following
    '/((?!api|_next/static|_next/image|favicon.ico|static|public|auth).*)',
  ],
};

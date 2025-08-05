import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "./lib/supabase";
import { authRateLimiter } from "./lib/auth-rate-limiter";
import { logRequest, debug, error as logError } from "./lib/edge-logging";
import { validateCSRFToken, extractCSRFToken, refreshCSRFToken } from './lib/csrf';

// DEVELOPMENT/DEMO MODE: Set to false to enable proper authentication
const DEMO_MODE = false;

// Allowed users whitelist
const ALLOWED_USERS = [
  'wvazquez@irelandpay.com',
  'jmarkey@irelandpay.com'
];

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
    pathname
  });

  // Check if user is authenticated
  if (!session?.user?.email) {
    debug('User not authenticated, redirecting to auth', { pathname });
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Check if user is in the allowed whitelist
  if (!ALLOWED_USERS.includes(session.user.email.toLowerCase())) {
    debug('Unauthorized user attempting to access protected route', { 
      email: session.user.email, 
      pathname 
    });
    return NextResponse.redirect(new URL('/auth?error=unauthorized', request.url));
  }

  // Check if this is an admin route - redirect to unauthorized for now
  // We'll handle admin auth in API routes instead of middleware
  if (isAdminRoute(pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
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

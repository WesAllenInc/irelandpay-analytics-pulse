import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { adminService } from '@/lib/auth/admin-service';

export interface AdminContext {
  admin: any;
  userId: string;
  supabase: any;
}

export async function adminAuthMiddleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Check admin session token from cookie
  const adminSessionToken = request.cookies.get('admin_session')?.value;
  
  if (adminSessionToken) {
    const isValidSession = await adminService.validateAdminSession(adminSessionToken);
    if (!isValidSession) {
      // Clear invalid session cookie
      res.cookies.delete('admin_session');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  } else {
    // Check if user is admin
    const isAdmin = await adminService.isAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Create new admin session
    try {
      const adminSession = await adminService.createAdminSession(session.user.id);
      res.cookies.set('admin_session', adminSession.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      });
    } catch (error) {
      console.error('Error creating admin session:', error);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return res;
}

// API route protection wrapper
export async function withAdminAuth(
  handler: (req: NextRequest, context: AdminContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const supabase = createMiddlewareClient({ req: req, res: NextResponse.next() });
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const admin = await adminService.getCurrentAdmin();
    
    if (!admin || admin.user_id !== user.id) {
      // Log unauthorized access attempt
      await adminService.logAdminAction(
        user.id,
        'admin.access.denied',
        'api',
        req.nextUrl.pathname,
        { method: req.method }
      );

      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Create context with admin info
    const context: AdminContext = {
      admin,
      userId: user.id,
      supabase
    };

    // Log API access
    await adminService.logAdminAction(
      user.id,
      'admin.api.access',
      'api',
      req.nextUrl.pathname,
      { method: req.method }
    );

    return handler(req, context);
  };
}

// Check if route requires admin access
export function isAdminRoute(pathname: string): boolean {
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

// Get admin session from request
export async function getAdminSessionFromRequest(request: NextRequest): Promise<string | null> {
  return request.cookies.get('admin_session')?.value || null;
}

// Validate admin session and return admin user
export async function validateAdminSession(sessionToken: string): Promise<any | null> {
  if (!sessionToken) return null;

  const isValid = await adminService.validateAdminSession(sessionToken);
  if (!isValid) return null;

  const session = await adminService.getAdminSession(sessionToken);
  return session;
} 
import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken, extractCSRFToken, refreshCSRFToken } from './csrf';

/**
 * Type definition for API route handlers
 */
type ApiRouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with CSRF protection for state-changing operations
 * 
 * @param handler The original API route handler
 * @returns A wrapped handler with CSRF validation
 */
export function withCsrfProtection(handler: ApiRouteHandler): ApiRouteHandler {
  return async (req: NextRequest, context?: any) => {
    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req, context);
    }
    
    // Extract and validate CSRF token
    const token = extractCSRFToken(req);
    
    if (!validateCSRFToken(token)) {
      console.warn('CSRF validation failed', {
        path: req.nextUrl.pathname,
        method: req.method,
      });
      
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
    
    // Token is valid, proceed to handler
    return handler(req, context);
  };
}

/**
 * Middleware function for Server Actions to validate CSRF tokens
 * 
 * @param formData FormData containing the CSRF token
 * @returns true if valid, throws an error if invalid
 */
export async function validateServerActionCsrf(formData: FormData): Promise<boolean> {
  // Get the CSRF token from the form data
  const token = formData.get('_csrf') as string;
  
  if (!validateCSRFToken(token)) {
    throw new Error('Invalid or missing CSRF token');
  }
  
  return true;
}

/**
 * Helper function to include CSRF token in server-rendered forms
 */
export function getServerCsrfField() {
  const token = refreshCSRFToken();
  
  return {
    name: '_csrf',
    value: token
  };
}

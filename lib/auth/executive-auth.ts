import { createSupabaseServerClient } from '@/lib/supabase/server';

// Executive users configuration
export const EXECUTIVE_USERS = [
  'jmarkey@irelandpay.com',
  'wvazquez@irelandpay.com'
] as const;

export type ExecutiveEmail = typeof EXECUTIVE_USERS[number];

/**
 * Check if a user is an authorized executive
 */
export function isExecutiveUser(email: string | null | undefined): email is ExecutiveEmail {
  return email !== null && email !== undefined && EXECUTIVE_USERS.includes(email as ExecutiveEmail);
}

/**
 * Get executive user details
 */
export function getExecutiveUserDetails(email: ExecutiveEmail) {
  const executiveDetails = {
    'jmarkey@irelandpay.com': {
      name: 'Jake Markey',
      role: 'admin'
    },
    'wvazquez@irelandpay.com': {
      name: 'Wilfredo Vazquez',
      role: 'admin'
    }
  };
  
  return executiveDetails[email];
}

/**
 * Verify executive access for server-side operations
 */
export async function verifyExecutiveAccess(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.email) {
      return {
        authorized: false,
        error: 'No valid session found'
      };
    }
    
    // Check if user is an executive
    if (!isExecutiveUser(session.user.email)) {
      return {
        authorized: false,
        error: 'Access denied. Only authorized executives can access this application.',
        userEmail: session.user.email
      };
    }
    
    return {
      authorized: true,
      user: {
        email: session.user.email,
        ...getExecutiveUserDetails(session.user.email as ExecutiveEmail)
      }
    };
    
  } catch (error) {
    return {
      authorized: false,
      error: 'Authentication verification failed'
    };
  }
}

/**
 * Middleware wrapper for executive-only routes
 */
export function withExecutiveAuth(handler: Function) {
  return async (request: Request) => {
    const authResult = await verifyExecutiveAccess(request);
    
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ 
          error: authResult.error || 'Access denied',
          userEmail: authResult.userEmail 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return handler(request, authResult.user);
  };
} 
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

// Constants for CSRF implementation
const CSRF_SECRET = process.env.CSRF_SECRET || 'ireland-pay-analytics-csrf-secret';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_FORM_FIELD = '_csrf';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Type for CSRF token payload
interface CSRFTokenPayload {
  token: string;
  expires: number;
}

/**
 * Generate a CSRF token and set it as a cookie
 */
export function generateCSRFToken(): string {
  // Generate a random token
  const randomToken = randomBytes(32).toString('hex');
  
  // Create a payload with expiration time
  const payload: CSRFTokenPayload = {
    token: randomToken,
    expires: Date.now() + TOKEN_EXPIRY
  };
  
  // Serialize and encrypt the payload
  const serializedPayload = JSON.stringify(payload);
  const signature = createHash('sha256')
    .update(`${serializedPayload}${CSRF_SECRET}`)
    .digest('hex');
  
  // Create the final token (payload + signature)
  const csrfToken = `${Buffer.from(serializedPayload).toString('base64')}.${signature}`;
  
  // Set the token as a cookie
  cookies().set({
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'strict', // Set SameSite to strict as requested
    maxAge: TOKEN_EXPIRY / 1000 // Convert to seconds for cookie
  });
  
  return csrfToken;
}

/**
 * Validate a CSRF token against the stored token
 */
export function validateCSRFToken(token: string | null | undefined): boolean {
  if (!token) return false;
  
  try {
    // Get the token from the cookie
    const storedToken = cookies().get(CSRF_COOKIE_NAME)?.value;
    if (!storedToken) return false;
    
    // Extract and verify parts of the token
    const [payloadBase64, providedSignature] = token.split('.');
    const [storedPayloadBase64, storedSignature] = storedToken.split('.');
    
    if (!payloadBase64 || !providedSignature) return false;
    if (!storedPayloadBase64 || !storedSignature) return false;
    
    // Verify that signatures match
    if (providedSignature !== storedSignature) return false;
    if (payloadBase64 !== storedPayloadBase64) return false;
    
    // Deserialize the payload
    const serializedPayload = Buffer.from(payloadBase64, 'base64').toString();
    const payload: CSRFTokenPayload = JSON.parse(serializedPayload);
    
    // Check if the token is expired
    if (payload.expires < Date.now()) return false;
    
    // If we reach here, the token is valid
    return true;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Middleware to refresh CSRF token if it's expired or doesn't exist
 */
export function refreshCSRFToken(): string {
  try {
    const storedToken = cookies().get(CSRF_COOKIE_NAME)?.value;
    
    if (!storedToken) {
      return generateCSRFToken();
    }
    
    // Check if the token is valid and not expired
    const [payloadBase64] = storedToken.split('.');
    if (!payloadBase64) return generateCSRFToken();
    
    const serializedPayload = Buffer.from(payloadBase64, 'base64').toString();
    const payload: CSRFTokenPayload = JSON.parse(serializedPayload);
    
    // If token is about to expire (less than 1 hour remaining), refresh it
    if (payload.expires < Date.now() + 3600000) {
      return generateCSRFToken();
    }
    
    return storedToken;
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    return generateCSRFToken();
  }
}

/**
 * Get the current CSRF token from cookies or generate a new one
 */
export function getCSRFToken(): string {
  return refreshCSRFToken();
}

/**
 * Extract CSRF token from request (header, body, or query)
 */
export function extractCSRFToken(req: NextRequest | Request): string | null {
  // Try to get token from header
  const headerToken = req.headers.get(CSRF_HEADER);
  if (headerToken) return headerToken;
  
  // For form submissions and other requests with body
  // Note: This requires the request body to be parsed elsewhere
  return null;
}

/**
 * CSRF protection middleware for API routes
 */
export async function csrfMiddleware(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return handler(req);
  }
  
  // Extract and validate the CSRF token
  const token = extractCSRFToken(req);
  if (!validateCSRFToken(token)) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid or missing CSRF token' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Token is valid, proceed with the request
  return handler(req);
}

/**
 * Helper function to include CSRF token in forms
 */
export function csrfFormField(): { name: string, value: string } {
  const token = getCSRFToken();
  return {
    name: CSRF_FORM_FIELD,
    value: token
  };
}

/**
 * Get headers object with CSRF token for fetch/axios requests
 */
export function getCSRFHeaders(): HeadersInit {
  return {
    [CSRF_HEADER]: getCSRFToken()
  };
}

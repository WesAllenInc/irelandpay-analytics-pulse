import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
export async function generateCSRFToken(): Promise<string> {
  // Generate a random token using Web Crypto API
  const randomBuffer = new Uint8Array(32);
  crypto.getRandomValues(randomBuffer);
  const randomToken = Array.from(randomBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Create a payload with expiration time
  const payload: CSRFTokenPayload = {
    token: randomToken,
    expires: Date.now() + TOKEN_EXPIRY
  };
  
  // Serialize the payload
  const serializedPayload = JSON.stringify(payload);
  
  // Create signature using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(`${serializedPayload}${CSRF_SECRET}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create the final token (payload + signature)
  const csrfToken = `${btoa(serializedPayload)}.${signature}`;
  
  // Set the token as a cookie
  const cookieStore = await cookies();
  cookieStore.set({
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
export async function validateCSRFToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  
  try {
    // Get the token from the cookie
    const cookieStore = await cookies();
    const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
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
export async function refreshCSRFToken(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (!storedToken) {
      return await generateCSRFToken();
    }
    
    // Check if the token is valid and not expired
    const [payloadBase64] = storedToken.split('.');
    if (!payloadBase64) return await generateCSRFToken();
    
    const serializedPayload = Buffer.from(payloadBase64, 'base64').toString();
    const payload: CSRFTokenPayload = JSON.parse(serializedPayload);
    
    // If token is about to expire (less than 1 hour remaining), refresh it
    if (payload.expires < Date.now() + 3600000) {
      return await generateCSRFToken();
    }
    
    return storedToken;
  } catch (error) {
    console.error('Error refreshing CSRF token:', error);
    return await generateCSRFToken();
  }
}

/**
 * Get the current CSRF token from cookies or generate a new one
 */
export async function getCSRFToken(): Promise<string> {
  return await refreshCSRFToken();
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
  const isValid = await validateCSRFToken(token);
  
  if (!isValid) {
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
export async function csrfFormField(): Promise<{ name: string, value: string }> {
  const token = await getCSRFToken();
  return {
    name: CSRF_FORM_FIELD,
    value: token
  };
}

/**
 * Get headers object with CSRF token for fetch/axios requests
 */
export async function getCSRFHeaders(): Promise<HeadersInit> {
  return {
    [CSRF_HEADER]: await getCSRFToken()
  };
}

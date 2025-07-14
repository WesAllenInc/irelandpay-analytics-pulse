import { NextRequest, NextResponse } from 'next/server';

// Interface for rate limit data
interface RateLimitData {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
  attemptsSinceBlock: number;
}

// In-memory storage for rate limiting
// This can be replaced with Redis or another solution in the future
const rateLimitStore: Record<string, RateLimitData> = {};

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const PROGRESSIVE_DELAYS = [1000, 2000, 4000, 8000, 16000]; // in milliseconds

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Try to get IP from headers first (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Try to get IP from other headers
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  // In Next.js 15, we need to use a different approach
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown-ip';
}

/**
 * Log rate limit violation
 */
function logViolation(ip: string, path: string, attempts: number): void {
  console.warn(
    `[RATE-LIMIT] Violation - IP: ${ip}, Path: ${path}, Attempts: ${attempts}, Time: ${new Date().toISOString()}`
  );
  
  // In a production environment, you might want to log to a service like
  // Datadog, Sentry, or your own logging system
}

/**
 * Calculate delay based on number of attempts since blocking
 */
function getProgressiveDelay(attemptsSinceBlock: number): number {
  const index = Math.min(attemptsSinceBlock - 1, PROGRESSIVE_DELAYS.length - 1);
  return index >= 0 ? PROGRESSIVE_DELAYS[index] : 0;
}

/**
 * Reset rate limit data for successful authentication
 */
export function resetRateLimitForIP(ip: string): void {
  delete rateLimitStore[ip];
}

/**
 * Authentication rate limiter middleware
 */
export async function authRateLimiter(
  request: NextRequest,
  handler: () => Promise<Response>
): Promise<Response> {
  const { pathname } = request.nextUrl;
  
  // Only apply rate limiting to authentication endpoints
  if (!pathname.startsWith('/auth/login') && !pathname.startsWith('/api/auth/login')) {
    return handler();
  }

  const ip = getClientIP(request);
  const now = Date.now();
  
  // Initialize or get existing rate limit data
  let rateData = rateLimitStore[ip] || {
    attempts: 0,
    firstAttempt: now,
    lastAttempt: now,
    blocked: false,
    attemptsSinceBlock: 0
  };

  // Check if we should reset the window (if 15 minutes have passed since first attempt)
  if (!rateData.blocked && now - rateData.firstAttempt > WINDOW_MS) {
    rateData = {
      attempts: 0,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
      attemptsSinceBlock: 0
    };
  }

  // Check if IP is currently blocked with a progressive delay
  if (rateData.blocked && rateData.blockedUntil && now < rateData.blockedUntil) {
    const waitTime = Math.ceil((rateData.blockedUntil - now) / 1000);
    logViolation(ip, pathname, rateData.attempts);
    
    return new NextResponse(
      JSON.stringify({
        error: 'Too many login attempts',
        message: `Please wait ${waitTime} seconds before trying again`,
        retryAfter: waitTime
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(waitTime).toString()
        }
      }
    );
  }

  // If IP was blocked but delay time has passed, update the attempts since block
  if (rateData.blocked && rateData.blockedUntil && now >= rateData.blockedUntil) {
    rateData.attemptsSinceBlock += 1;
    const progressiveDelay = getProgressiveDelay(rateData.attemptsSinceBlock);
    rateData.blockedUntil = now + progressiveDelay;
    rateData.lastAttempt = now;
    rateLimitStore[ip] = rateData;

    logViolation(ip, pathname, rateData.attempts);
    
    const waitTime = Math.ceil(progressiveDelay / 1000);
    return new NextResponse(
      JSON.stringify({
        error: 'Too many login attempts',
        message: `Progressive delay: Please wait ${waitTime} seconds before trying again`,
        retryAfter: waitTime
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': waitTime.toString()
        }
      }
    );
  }

  // Increment attempt count
  rateData.attempts += 1;
  rateData.lastAttempt = now;

  // Check if max attempts reached
  if (rateData.attempts > MAX_ATTEMPTS) {
    rateData.blocked = true;
    rateData.attemptsSinceBlock = 1;
    const progressiveDelay = getProgressiveDelay(rateData.attemptsSinceBlock);
    rateData.blockedUntil = now + progressiveDelay;
    rateLimitStore[ip] = rateData;
    
    logViolation(ip, pathname, rateData.attempts);
    
    const waitTime = Math.ceil(progressiveDelay / 1000);
    return new NextResponse(
      JSON.stringify({
        error: 'Too many login attempts',
        message: `Rate limit exceeded. Please wait ${waitTime} seconds before trying again`,
        retryAfter: waitTime
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': waitTime.toString()
        }
      }
    );
  }

  // Store updated rate limit data
  rateLimitStore[ip] = rateData;

  // Proceed with the request
  const response = await handler();
  
  // Check if login was successful (status 2xx)
  if (response.status >= 200 && response.status < 300) {
    // Reset rate limit on successful login
    resetRateLimitForIP(ip);
  }

  return response;
}

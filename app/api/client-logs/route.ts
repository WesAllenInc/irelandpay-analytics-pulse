/**
 * API endpoint to receive and process client-side logs
 * This allows critical client-side errors to be recorded in the server logs
 */
import { NextRequest, NextResponse } from 'next/server';
import logger from '../../../lib/logging';

// Rate limiting helper to prevent abuse
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const MAX_LOGS_PER_MINUTE = 50; // Maximum logs per IP per minute
const RESET_INTERVAL = 60 * 1000; // 1 minute in milliseconds

export async function POST(request: NextRequest) {
  try {
    // Apply basic rate limiting by IP
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    let limiterData = rateLimiter.get(clientIp);
    
    if (!limiterData || now > limiterData.resetTime) {
      // First request or reset period passed
      limiterData = { count: 1, resetTime: now + RESET_INTERVAL };
      rateLimiter.set(clientIp, limiterData);
    } else {
      // Increment count for existing IP
      limiterData.count++;
      
      // Check if over limit
      if (limiterData.count > MAX_LOGS_PER_MINUTE) {
        logger.warn('Client log rate limit exceeded', { 
          ip: clientIp,
          count: limiterData.count
        });
        return NextResponse.json({ error: 'Too many log requests' }, { status: 429 });
      }
    }
    
    const body = await request.json();
    const { level, message, metadata } = body;
    
    if (!level || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate log level
    if (!['error', 'warn', 'info', 'debug'].includes(level)) {
      return NextResponse.json({ error: 'Invalid log level' }, { status: 400 });
    }
    
    // Log the client-side event to server logs
    logger.log(message, {
      level: level as any,
      metadata: {
        ...metadata,
        source: 'client',
        clientLogged: true,
        // Include request context that's safe to log
        clientIp: process.env.NODE_ENV === 'development' ? clientIp : undefined
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError('Failed to process client log', error);
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 });
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

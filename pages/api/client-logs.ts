/**
 * API endpoint to receive and process client-side logs
 * This allows critical client-side errors to be recorded in the server logs
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { withLogging, ExtendedNextApiRequest } from '../../lib/logging-middleware';
import logger from '../../lib/logging';

// Rate limiting helper to prevent abuse
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const MAX_LOGS_PER_MINUTE = 50; // Maximum logs per IP per minute
const RESET_INTERVAL = 60 * 1000; // 1 minute in milliseconds

async function clientLogsHandler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Apply basic rate limiting by IP
  const clientIp = req.socket.remoteAddress || 'unknown';
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
      return res.status(429).json({ error: 'Too many log requests' });
    }
  }
  
  try {
    const { level, message, metadata } = req.body;
    
    if (!level || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate log level
    if (!['error', 'warn', 'info', 'debug'].includes(level)) {
      return res.status(400).json({ error: 'Invalid log level' });
    }
    
    // Log the client-side event to server logs
    logger.log(message, {
      level: level as any,
      metadata: {
        ...metadata,
        source: 'client',
        clientLogged: true,
        // Include request context that's safe to log
        requestId: req.requestId,
        clientIp: process.env.NODE_ENV === 'development' ? clientIp : undefined
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.logError('Failed to process client log', error);
    return res.status(500).json({ error: 'Failed to process log' });
  }
}

// Wrap with logging middleware for consistent request logging
export default withLogging(clientLogsHandler);

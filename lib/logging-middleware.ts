/**
 * Logging middleware for Next.js API routes
 * Provides automatic request/response logging, timing, and context tracking
 */
import { type NextApiRequest, type NextApiResponse } from 'next';
import logger from './logging';
import { createId } from '@paralleldrive/cuid2';
import { createSupabaseServerClient } from './supabase/server';

export interface ExtendedNextApiRequest extends NextApiRequest {
  userId?: string;
  startTime?: number;
  requestId?: string;
}

/**
 * Creates a logging middleware for Next.js API routes that:
 * - Generates a unique requestId for each request
 * - Extracts userId from authenticated sessions
 * - Logs request details on start
 * - Logs response status and duration on completion
 * - Automatically redacts sensitive information
 */
export const withLogging = (
  handler: (req: ExtendedNextApiRequest, res: NextApiResponse) => Promise<void> | void
) => {
  return async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
    // Generate unique request ID
    const requestId = req.headers['x-request-id'] as string || createId();
    req.requestId = requestId;
    
    // Record start time for performance measurement
    req.startTime = performance.now();
    
    // Try to extract userId from auth session
    try {
      // Create server client and get session
      const supabase = createSupabaseServerClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        req.userId = session.user.id;
      }
    } catch (error) {
      // No session or auth error, continue without userId
      logger.debug('No user session found for request', { requestId });
    }
    
    // Log the incoming request with extracted context
    logger.logRequest({
      url: req.url,
      method: req.method,
      ip: req.socket.remoteAddress,
      headers: req.headers,
      userId: req.userId
    });
    
    // Create a custom response end handler to log completion
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      // Calculate request duration
      const duration = performance.now() - (req.startTime || 0);
      
      // Log the response
      logger.logResponse(
        { method: req.method, url: req.url },
        { statusCode: res.statusCode },
        undefined,
        { 
          metadata: {
            requestId,
            responseTime: `${Math.round(duration)}ms`,
            userId: req.userId
          }
        }
      );
      
      // Call the original end method
      return originalEnd.call(this, chunk, encoding);
    };
    
    // Execute the handler
    try {
      await handler(req, res);
    } catch (error) {
      // Log any uncaught errors
      logger.logError(`Uncaught error in API route: ${req.url}`, error, {
        requestId,
        path: req.url,
        method: req.method,
        userId: req.userId
      });
      
      // Send error response if not already sent
      if (!res.writableEnded) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
};

/**
 * Wraps handler function with performance tracking and error logging
 * Use for App Router route handlers
 */
export const withAppRouterLogging = (
  handler: (...args: any[]) => Promise<any> | any
) => {
  return async (...args: any[]) => {
    const requestId = createId();
    const startTime = performance.now();
    
    // Extract request from arguments (first arg in App Router handlers)
    const req = args[0];
    
    // Log the incoming request (with limited info available from Request object)
    let url = 'unknown';
    let method = 'unknown';
    
    try {
      url = req.url || 'unknown';
      method = req.method || 'unknown';
      
      logger.info(`Request started: ${method} ${url}`, {
        requestId,
        path: url,
        method
      });
    } catch (error) {
      // Ignore extraction errors
    }
    
    // Execute the handler with performance tracking
    try {
      const result = await handler(...args);
      
      // Calculate request duration
      const duration = performance.now() - startTime;
      
      // Log successful completion
      logger.info(`Request completed: ${method} ${url}`, {
        requestId,
        responseTime: `${Math.round(duration)}ms`
      });
      
      return result;
    } catch (error) {
      // Calculate duration even for errors
      const duration = performance.now() - startTime;
      
      // Log the error with context
      logger.logError(`Error in route handler: ${url}`, error, {
        requestId,
        path: url,
        method,
        responseTime: `${Math.round(duration)}ms`
      });
      
      throw error; // Re-throw to let Next.js error handlers take over
    }
  };
};

export default withLogging;

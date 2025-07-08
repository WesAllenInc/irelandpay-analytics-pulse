/**
 * Enhanced Structured Logging Utility for Ireland Pay Analytics
 * Uses Winston for advanced logging features:
 * - Log levels (error, warn, info, debug)
 * - Automatic request context injection
 * - PII redaction
 * - JSON format in production, pretty format in development
 * - Performance metrics tracking
 * - Error handling integration
 */
import winston from 'winston';
import { createId } from '@paralleldrive/cuid2';
import { performance } from 'perf_hooks';

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define custom log format colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston logger
winston.addColors(colors);

// TypeScript types for our logger
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';
export type LogMetadata = Record<string, any>;

export interface LogOptions {
  level?: LogLevel;
  metadata?: LogMetadata;
  redactKeys?: string[];
  requestId?: string;
  userId?: string;
}

export interface TimingMetric {
  label: string;
  start: number;
  end?: number;
  duration?: number;
}

// Create and maintain context for each request/process
class LoggingContext {
  private static instance: LoggingContext;
  private context: Map<string, any> = new Map();
  private timings: Map<string, TimingMetric> = new Map();
  private currentRequestId: string | null = null;
  
  private constructor() {}
  
  public static getInstance(): LoggingContext {
    if (!LoggingContext.instance) {
      LoggingContext.instance = new LoggingContext();
    }
    return LoggingContext.instance;
  }
  
  public setRequestId(id: string | null): void {
    this.currentRequestId = id;
    if (id) {
      this.set('requestId', id);
    }
  }
  
  public getRequestId(): string {
    return this.currentRequestId || 'no-request-id';
  }
  
  public set(key: string, value: any): void {
    this.context.set(key, value);
  }
  
  public get(key: string): any {
    return this.context.get(key);
  }
  
  public clear(): void {
    this.context.clear();
    this.timings.clear();
    this.currentRequestId = null;
  }
  
  public getContext(): Record<string, any> {
    return Object.fromEntries(this.context.entries());
  }
  
  public startTimer(label: string): string {
    const id = `${label}-${createId()}`;
    this.timings.set(id, {
      label,
      start: performance.now(),
    });
    return id;
  }
  
  public endTimer(id: string): TimingMetric | null {
    const timing = this.timings.get(id);
    if (!timing) return null;
    
    timing.end = performance.now();
    timing.duration = timing.end - timing.start;
    
    return timing;
  }
  
  public getTimings(): Record<string, TimingMetric> {
    return Object.fromEntries(this.timings.entries());
  }
}

// Get log level from environment variable (defaults to 'info')
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && Object.keys(levels).includes(envLevel)) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

// Create context instance
const loggingContext = LoggingContext.getInstance();

/**
 * Custom formatter to redact sensitive information
 */
const redactSensitiveData = (data: any, redactKeys: string[] = []): any => {
  if (!data || typeof data !== 'object') return data;
  
  // Default sensitive keys to redact (expanded list)
  const sensitiveKeys = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'apiKey', 'api_key',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token', 'session',
    'credential', 'auth', 'authorization', 'cookie', 'cookies', 'jwt',
    'email', 'mail', 'phone', 'tel', 'mobile', 'address', 'street', 'zip', 'postal',
    'ssn', 'social', 'card', 'credit', 'ccnum', 'cvv', 'pan', 'dob', 'birth',
    'user_metadata', 'userMetadata', 'secret', 'private', 'license',
    ...redactKeys
  ];

  // Regex patterns for emails, credit cards, and API keys
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const apiKeyRegex = /([a-zA-Z0-9]{20,}|sk_[a-zA-Z0-9]+|pk_[a-zA-Z0-9]+)/g;
  const creditCardRegex = /\b(?:\d{4}[- ]?){3}\d{4}\b/g;
  
  const redacted = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in redacted) {
    // Skip non-own properties
    if (!Object.prototype.hasOwnProperty.call(redacted, key)) continue;
    
    const value = redacted[key];

    // If the key contains sensitive information, redact the value
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } 
    // If the value is a string, check for patterns that need redaction
    else if (typeof value === 'string') {
      let redactedValue = value;
      
      // Redact email addresses
      redactedValue = redactedValue.replace(emailRegex, '[EMAIL REDACTED]');
      
      // Redact API keys
      redactedValue = redactedValue.replace(apiKeyRegex, '[API_KEY REDACTED]');
      
      // Redact credit card numbers
      redactedValue = redactedValue.replace(creditCardRegex, '[CC REDACTED]');
      
      // Update only if redactions were made
      if (redactedValue !== value) {
        redacted[key] = redactedValue;
      }
    } 
    // Recursively redact nested objects
    else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, redactKeys);
    }
  }
  
  return redacted;
};

// Configure Winston formats
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    // Format the message for development - pretty and readable
    const metaString = Object.keys(metadata).length 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create Winston Logger
const winstonLogger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format: process.env.NODE_ENV === 'development' ? developmentFormat : productionFormat,
  defaultMeta: {
    service: 'irelandpay-analytics'
  },
  transports: [
    // Write to console
    new winston.transports.Console({
      stderrLevels: ['error'],
      consoleWarnLevels: ['warn']
    }),
    // Additional transports can be added here for production:
    // - File transport
    // - Daily rotate file transport
    // - HTTP/remote logging service
  ],
  exitOnError: false
});

/**
 * Main logging function with enhanced features
 */
export const log = (
  message: string, 
  options: LogOptions = {}
): void => {
  const level = options.level || 'info';
  
  // Get context metadata for the current request
  const contextMetadata = loggingContext.getContext();
  
  // Merge provided metadata with context metadata
  const metadata: LogMetadata = {
    ...contextMetadata,
    ...options.metadata,
    requestId: options.requestId || contextMetadata.requestId || 'no-request-id',
    userId: options.userId || contextMetadata.userId,
    timestamp: new Date().toISOString(),
  };

  // Add performance metrics if any are available
  const timings = loggingContext.getTimings();
  if (Object.keys(timings).length > 0) {
    metadata.performance = Object.values(timings)
      .filter(t => t.duration) // Only include completed timings
      .reduce((acc: Record<string, number>, curr) => {
        if (curr.label && curr.duration) {
          acc[curr.label] = Math.round(curr.duration * 100) / 100; // Round to 2 decimal places
        }
        return acc;
      }, {});
  }
  
  // Redact sensitive information
  const redactedMetadata = redactSensitiveData(metadata, options.redactKeys);
  
  // Log with Winston
  winstonLogger.log({
    level,
    message,
    ...redactedMetadata
  });
};

/**
 * Enhanced request logging with context tracking
 */
export const logRequest = (
  req: { url?: string; method?: string; ip?: string; headers?: any; userId?: string },
  options: LogOptions = {}
): string => {
  // Generate a request ID or use one from headers if present
  const requestId = req.headers?.['x-request-id'] || createId();
  loggingContext.setRequestId(requestId);
  
  // Extract safe request metadata
  let url;
  try {
    url = req.url ? new URL(req.url, 'http://localhost') : { pathname: 'unknown', origin: 'unknown' };
  } catch (e) {
    // Handle relative URLs
    url = { pathname: req.url || 'unknown', origin: 'unknown' };
  }

  // Start a timer for the request
  const timerId = loggingContext.startTimer('request_duration');
  
  // Set common context values
  loggingContext.set('path', url.pathname);
  loggingContext.set('method', req.method || 'UNKNOWN');
  if (req.userId) {
    loggingContext.set('userId', req.userId);
  }
  
  // Create metadata for the log entry
  const metadata: LogMetadata = {
    requestId,
    path: url.pathname,
    method: req.method || 'UNKNOWN',
    userAgent: req.headers?.['user-agent'],
    referer: req.headers?.referer || req.headers?.referrer,
    // Only include certain headers and IP in development
    ...(process.env.NODE_ENV === 'development' && { 
      ip: req.ip,
      headers: redactSensitiveData(req.headers)
    }),
  };

  // Add userId if present
  if (req.userId) {
    metadata.userId = req.userId;
  }

  log(`Request started: ${req.method} ${url.pathname}`, {
    level: 'http',
    metadata,
    requestId,
    redactKeys: options.redactKeys,
  });
  
  return timerId;
};

/**
 * Log response information with performance metrics
 */
export const logResponse = (
  req: { method?: string; url?: string },
  res: { statusCode?: number },
  timerId?: string,
  options: LogOptions = {}
): void => {
  // Identify path for logging
  let path = 'unknown';
  try {
    path = req.url ? new URL(req.url, 'http://localhost').pathname : 'unknown';
  } catch (e) {
    // Handle relative URLs
    path = req.url || 'unknown';
  }

  // Get timing information if timer was started
  let duration: number | undefined;
  if (timerId) {
    const timing = loggingContext.endTimer(timerId);
    duration = timing?.duration;
  }

  // Get request context
  const requestId = loggingContext.getRequestId();
  const metadata: LogMetadata = {
    requestId,
    statusCode: res.statusCode,
    path,
    method: req.method,
  };

  // Add duration if available
  if (duration !== undefined) {
    metadata.responseTime = `${Math.round(duration)}ms`;
  }

  // Determine log level based on status code
  let level: LogLevel = 'info';
  if (res.statusCode && res.statusCode >= 500) {
    level = 'error';
  } else if (res.statusCode && res.statusCode >= 400) {
    level = 'warn';
  }

  log(`Request completed: ${req.method} ${path} ${res.statusCode}`, {
    level,
    metadata,
    requestId,
    redactKeys: options.redactKeys,
  });

  // Clear request context when done
  loggingContext.clear();
};

/**
 * Track API call performance
 */
export const trackApiCall = (apiName: string): { start: () => void; end: () => void } => {
  const timerId = loggingContext.startTimer(`api_${apiName}`);
  
  return {
    start: () => {}, // Timer already started when created
    end: () => {
      const timing = loggingContext.endTimer(timerId);
      if (timing?.duration) {
        log(`API call to ${apiName} completed`, {
          level: 'debug',
          metadata: {
            api: apiName,
            duration: `${Math.round(timing.duration)}ms`,
          },
        });
      }
    },
  };
};

/**
 * Enhanced error logging with context tracking
 */
export const logError = (
  message: string,
  error?: Error | unknown,
  metadata?: LogMetadata
): void => {
  const errorData: LogMetadata = {
    ...(metadata || {}),
    requestId: loggingContext.getRequestId(),
  };

  // Only include non-sensitive error data
  if (error instanceof Error) {
    errorData.name = error.name;
    errorData.message = error.message;
    
    // Include stack trace but filter out sensitive paths
    errorData.stack = error.stack
      ?.split('\n')
      .filter(line => !line.includes('node_modules') && !line.includes('internal/'))
      .join('\n');

    // Add additional properties if they exist
    if ('code' in error) errorData.code = (error as any).code;
    if ('statusCode' in error) errorData.statusCode = (error as any).statusCode;
    if ('cause' in error && error.cause) errorData.cause = String(error.cause);
  } else if (error !== undefined) {
    errorData.rawError = String(error);
  }

  log(message, {
    level: 'error',
    metadata: errorData
  });
};

/**
 * Debug logging (detailed development information)
 */
export const debug = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'debug', metadata });
};

/**
 * HTTP logging (request/response details)
 */
export const http = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'http', metadata });
};

/**
 * Info logging (standard operational information)
 */
export const info = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'info', metadata });
};

/**
 * Warning logging (potential issues)
 */
export const warn = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'warn', metadata });
};

/**
 * Error logging (operational failures)
 */
export const error = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'error', metadata });
};

/**
 * Create a middleware for Express/Next.js API routes
 */
export const createLoggerMiddleware = () => {
  return (req: any, res: any, next: Function) => {
    // Extract user ID from session if available
    const userId = req.session?.user?.id || req.user?.id;
    const requestObj = { ...req, userId };
    
    // Log the incoming request
    const timerId = logRequest(requestObj);
    
    // Store original end method
    const originalEnd = res.end;
    
    // Override end method to log response
    res.end = function(chunk: any, encoding: string) {
      // Log response
      logResponse(req, res, timerId);
      
      // Call the original end method
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
};

/**
 * Helper to track performance of functions or code blocks
 */
export const withPerformanceTracking = async <T>(
  operation: string, 
  fn: () => Promise<T> | T
): Promise<T> => {
  const timerId = loggingContext.startTimer(operation);
  try {
    const result = await fn();
    const timing = loggingContext.endTimer(timerId);
    
    debug(`Operation '${operation}' completed`, {
      duration: timing?.duration ? `${Math.round(timing.duration)}ms` : 'unknown'
    });
    
    return result;
  } catch (err) {
    // End timer even if operation failed
    loggingContext.endTimer(timerId);
    throw err;
  }
};

// Default export as named functions
export default {
  log,
  logRequest,
  logResponse,
  logError,
  trackApiCall,
  withPerformanceTracking,
  createLoggerMiddleware,
  debug,
  http,
  info,
  warn,
  error
};

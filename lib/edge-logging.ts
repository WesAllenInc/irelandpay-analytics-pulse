/**
 * Edge-compatible logging for Next.js middleware
 * Simple implementation that works in Edge Runtime without Node.js APIs
 */

import { createId } from '@paralleldrive/cuid2';

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';
export type LogMetadata = Record<string, any>;

export interface LogOptions {
  level?: LogLevel;
  metadata?: LogMetadata;
  redactKeys?: string[];
  requestId?: string;
  userId?: string;
}

// Simple context storage for Edge Runtime
class LoggingContext {
  private static instance: LoggingContext;
  private context: Map<string, any> = new Map();
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
    this.currentRequestId = null;
  }
  
  public getContext(): Record<string, any> {
    return Object.fromEntries(this.context.entries());
  }
}

// Create context instance
const loggingContext = LoggingContext.getInstance();

// Simple redaction for sensitive data
const redactSensitiveData = (data: any, redactKeys: string[] = []): any => {
  if (!data || typeof data !== 'object') return data;
  
  // Default sensitive keys to redact
  const sensitiveKeys = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'apiKey', 'api_key',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token',
    ...redactKeys
  ];

  const result = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in result) {
    // Check if the key should be redacted
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursive redaction for nested objects
      result[key] = redactSensitiveData(result[key], redactKeys);
    }
  }
  
  return result;
};

// Simple logging function compatible with Edge Runtime
export const log = (
  message: string,
  options: LogOptions = {}
): void => {
  const { level = 'info', metadata = {}, redactKeys = [] } = options;
  
  // Generate or use provided request ID
  const requestId = options.requestId || loggingContext.getRequestId();
  
  // Create the log object
  const logObject = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId,
    ...redactSensitiveData(metadata, redactKeys)
  };
  
  // Simple console output
  switch (level) {
    case 'error':
      console.error(JSON.stringify(logObject));
      break;
    case 'warn':
      console.warn(JSON.stringify(logObject));
      break;
    case 'debug':
      console.debug(JSON.stringify(logObject));
      break;
    default:
      console.log(JSON.stringify(logObject));
  }
};

// Log request info
export const logRequest = (
  req: { url?: string; method?: string; ip?: string; headers?: any; userId?: string },
  options: LogOptions = {}
): string => {
  const requestId = options.requestId || createId();
  loggingContext.setRequestId(requestId);
  
  const url = req.url || 'unknown';
  const method = req.method || 'unknown';
  
  const metadata = {
    url,
    method,
    ip: req.ip || 'unknown',
    userAgent: req.headers?.['user-agent'] || 'unknown',
    ...options.metadata
  };
  
  log(`Request: ${method} ${url}`, {
    level: 'http',
    metadata,
    requestId
  });
  
  return requestId;
};

// Log error with safe formatting
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
    errorData.stack = error.stack;
  } else if (error !== undefined) {
    errorData.rawError = String(error);
  }

  log(message, {
    level: 'error',
    metadata: errorData
  });
};

// Convenience methods for different log levels
export const debug = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'debug', metadata });
};

export const info = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'info', metadata });
};

export const warn = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'warn', metadata });
};

export const error = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'error', metadata });
};

// Default export for convenience
export default {
  log,
  logRequest,
  logError,
  debug,
  info,
  warn,
  error
};

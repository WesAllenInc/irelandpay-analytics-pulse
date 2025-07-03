/**
 * Structured logging utility for Ireland Pay Analytics
 * Controls logging levels and formats based on environment variables
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMetadata = Record<string, any>;

interface LogOptions {
  level?: LogLevel;
  metadata?: LogMetadata;
  redactKeys?: string[];
}

// Get log level from environment variable (defaults to 'info')
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

// Log level hierarchy
const logLevelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Check if a log should be output based on current log level
 */
const shouldLog = (messageLevel: LogLevel): boolean => {
  const currentLevel = getLogLevel();
  return logLevelOrder[messageLevel] >= logLevelOrder[currentLevel];
};

/**
 * Redact sensitive fields from objects before logging
 */
const redactSensitiveData = (data: any, redactKeys: string[] = []): any => {
  if (!data || typeof data !== 'object') return data;
  
  // Default sensitive keys to redact
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
    'accessToken', 'refreshToken', 'session', 'credential', 'auth',
    'email', 'phone', 'address', 'user_metadata', 'user',
    ...redactKeys
  ];
  
  const redacted = Array.isArray(data) 
    ? [...data] 
    : { ...data };
  
  for (const key in redacted) {
    // If the key is sensitive, redact its value
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveData(redacted[key], redactKeys);
    }
  }
  
  return redacted;
};

/**
 * Format a log message with structured metadata
 */
const formatLogMessage = (
  message: string, 
  options: LogOptions = {}
): { message: string; metadata: LogMetadata } => {
  // Basic metadata that's safe to include
  const metadata: LogMetadata = {
    timestamp: new Date().toISOString(),
    level: options.level || 'info',
    ...options.metadata
  };
  
  // Include environment in development
  if (process.env.NODE_ENV === 'development') {
    metadata.environment = process.env.NODE_ENV;
  }
  
  return {
    message,
    metadata: redactSensitiveData(metadata, options.redactKeys)
  };
};

/**
 * Main logging function
 */
const log = (
  message: string, 
  options: LogOptions = {}
): void => {
  const level = options.level || 'info';
  
  if (!shouldLog(level)) return;
  
  const { message: formattedMessage, metadata } = formatLogMessage(message, options);
  
  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[DEBUG] ${formattedMessage}`, metadata);
      }
      break;
    case 'info':
      console.log(`[INFO] ${formattedMessage}`, metadata);
      break;
    case 'warn':
      console.warn(`[WARN] ${formattedMessage}`, metadata);
      break;
    case 'error':
      console.error(`[ERROR] ${formattedMessage}`, metadata);
      break;
  }
};

/**
 * Format and log request information
 */
export const logRequest = (
  req: { url?: string; method?: string; ip?: string; headers?: any },
  options: LogOptions = {}
): void => {
  // Extract safe request metadata
  const url = req.url ? new URL(req.url) : { pathname: 'unknown', origin: 'unknown' };
  const metadata: LogMetadata = {
    path: url.pathname,
    method: req.method || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    // Only include IP in development
    ...(process.env.NODE_ENV === 'development' && { ip: req.ip }),
  };

  log(`Request to ${url.pathname}`, {
    level: options.level || 'info',
    metadata,
    redactKeys: options.redactKeys
  });
};

/**
 * Format and log error information (without sensitive details)
 */
export const logError = (
  message: string,
  error?: Error | unknown,
  metadata?: LogMetadata
): void => {
  const errorData: LogMetadata = {
    ...(metadata || {})
  };

  // Only include non-sensitive error data
  if (error instanceof Error) {
    errorData.name = error.name;
    errorData.message = error.message;
    
    // In development, include stack trace but filter out sensitive paths
    if (process.env.NODE_ENV === 'development') {
      errorData.stack = error.stack
        ?.split('\n')
        .filter(line => !line.includes('node_modules') && !line.includes('internal/'))
        .join('\n');
    }
  }

  log(message, {
    level: 'error',
    metadata: errorData
  });
};

/**
 * Debug logging (only active in development)
 */
export const debug = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'debug', metadata });
};

/**
 * Info logging
 */
export const info = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'info', metadata });
};

/**
 * Warning logging
 */
export const warn = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'warn', metadata });
};

/**
 * Error logging
 */
export const error = (message: string, metadata: LogMetadata = {}): void => {
  log(message, { level: 'error', metadata });
};

// Default export as named functions
export default {
  logRequest,
  logError,
  debug,
  info,
  warn,
  error
};

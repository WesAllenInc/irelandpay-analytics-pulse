/**
 * Client-side logging utilities for React components
 * Provides browser-compatible logging that integrates with the server-side logging system
 */
import { createId } from '@paralleldrive/cuid2';

// Basic log levels
export type ClientLogLevel = 'error' | 'warn' | 'info' | 'debug';

// Client-side metadata format (similar to server-side but adapted for browser)
export interface ClientLogMetadata {
  [key: string]: any;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Session identifier that persists during the user's session
const SESSION_ID = createId();

/**
 * Generate a fingerprint for the current browser session
 * This helps correlate logs from the same user session
 */
const getBrowserFingerprint = (): string => {
  // Try to get stored session ID from sessionStorage
  let fingerprint = sessionStorage.getItem('logging_session_id');
  
  // If no stored ID, generate and store a new one
  if (!fingerprint) {
    fingerprint = SESSION_ID;
    try {
      sessionStorage.setItem('logging_session_id', fingerprint);
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  return fingerprint;
};

/**
 * Add browser-specific context to logs
 */
const enrichWithBrowserContext = (metadata: ClientLogMetadata = {}): ClientLogMetadata => {
  return {
    ...metadata,
    sessionId: getBrowserFingerprint(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
};

/**
 * Redact sensitive data from client-side logs
 * Simplified version of the server-side redaction
 */
const redactSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'apiKey',
    'accessToken', 'refreshToken', 'credential', 'auth',
    'email', 'phone', 'address'
  ];
  
  const redacted = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in redacted) {
    if (!Object.prototype.hasOwnProperty.call(redacted, key)) continue;
    
    // Redact sensitive keys
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } 
    // Recursively redact nested objects
    else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
};

/**
 * Format client-side log messages
 */
const formatLogForConsole = (
  level: ClientLogLevel,
  message: string,
  metadata: ClientLogMetadata = {}
): [string, any] => {
  const enrichedMetadata = enrichWithBrowserContext(metadata);
  const redactedMetadata = redactSensitiveData(enrichedMetadata);
  
  // Format log message for console
  return [`[${level.toUpperCase()}] ${message}`, redactedMetadata];
};

/**
 * Send logs to server (for important logs)
 * This can be used to send critical client-side errors to the server
 */
export const sendLogToServer = async (
  level: ClientLogLevel,
  message: string,
  metadata: ClientLogMetadata = {}
): Promise<void> => {
  try {
    const enrichedMetadata = enrichWithBrowserContext(metadata);
    
    await fetch('/api/client-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        metadata: redactSensitiveData(enrichedMetadata)
      }),
      // Don't wait for success to continue execution
      keepalive: true
    });
  } catch (e) {
    // Silently fail if log sending fails
    console.debug('Failed to send log to server', e);
  }
};

/**
 * Log error and optionally send to server
 */
export const logError = (
  message: string,
  error?: Error | unknown,
  metadata: ClientLogMetadata = {},
  sendToServer: boolean = true
): void => {
  const errorData = { ...metadata };
  
  // Extract useful data from error object
  if (error instanceof Error) {
    errorData.name = error.name;
    errorData.message = error.message;
    errorData.stack = error.stack;
  } else if (error !== undefined) {
    errorData.rawError = String(error);
  }
  
  // Log to console
  const [formattedMessage, formattedMetadata] = formatLogForConsole('error', message, errorData);
  console.error(formattedMessage, formattedMetadata);
  
  // Optionally send to server
  if (sendToServer) {
    sendLogToServer('error', message, errorData);
  }
};

/**
 * Component performance tracking
 */
export const useComponentPerformance = (componentName: string): { 
  start: (operation: string) => string;
  end: (timerId: string) => number | undefined;
} => {
  const timers = new Map<string, number>();
  
  return {
    start: (operation: string): string => {
      const timerId = `${componentName}-${operation}-${createId()}`;
      timers.set(timerId, performance.now());
      return timerId;
    },
    end: (timerId: string): number | undefined => {
      const startTime = timers.get(timerId);
      if (startTime === undefined) return undefined;
      
      const duration = performance.now() - startTime;
      timers.delete(timerId);
      
      // Log performance metric
      const [formattedMessage, formattedMetadata] = formatLogForConsole('debug', 
        `Component operation completed: ${timerId}`,
        { component: componentName, duration: `${Math.round(duration)}ms` }
      );
      console.debug(formattedMessage, formattedMetadata);
      
      return duration;
    }
  };
};

/**
 * Standard logging functions
 */
export const debug = (message: string, metadata: ClientLogMetadata = {}): void => {
  const [formattedMessage, formattedMetadata] = formatLogForConsole('debug', message, metadata);
  console.debug(formattedMessage, formattedMetadata);
};

export const info = (message: string, metadata: ClientLogMetadata = {}): void => {
  const [formattedMessage, formattedMetadata] = formatLogForConsole('info', message, metadata);
  console.log(formattedMessage, formattedMetadata);
};

export const warn = (message: string, metadata: ClientLogMetadata = {}): void => {
  const [formattedMessage, formattedMetadata] = formatLogForConsole('warn', message, metadata);
  console.warn(formattedMessage, formattedMetadata);
};

export const error = (message: string, metadata: ClientLogMetadata = {}): void => {
  const [formattedMessage, formattedMetadata] = formatLogForConsole('error', message, metadata);
  console.error(formattedMessage, formattedMetadata);
  
  // By default, we don't send info/warn logs to server
  // but all error logs are important
  sendLogToServer('error', message, metadata);
};

/**
 * Error boundary logger for React components
 */
export const logComponentError = (
  error: Error, 
  componentStack: string,
  componentName: string
): void => {
  logError(
    `Error in component: ${componentName}`,
    error,
    { componentStack, component: componentName },
    true // Always send component errors to server
  );
};

export default {
  debug,
  info,
  warn,
  error,
  logError,
  logComponentError,
  useComponentPerformance,
  sendLogToServer
};

# Enhanced Logging System Guide

This document explains how to use the new logging system implemented in the Ireland Pay Analytics project.

## Overview

The logging system offers:

- **Structured logging** with Winston for consistent, searchable logs
- **Log levels** (error, warn, info, http, debug) for filtering
- **Request context tracking** (requestId, userId, path)
- **Automatic PII redaction** (emails, API keys, passwords, etc.)
- **Environment-aware formatting** (JSON in production, pretty in development)
- **Performance metrics** for requests and operations
- **Error handling integration**
- **Client-side logging** with server reporting for critical issues

## Core Components

The logging system consists of three main components:

1. **Server-side Logger** (`lib/logging.ts`)
   - Winston-based logger with structured output
   - Context tracking and performance metrics
   - Automatic PII redaction

2. **API Middleware** (`lib/logging-middleware.ts`)
   - Request/response logging for API routes
   - Error handling and performance tracking
   - Compatible with both Pages Router and App Router

3. **Client-side Logger** (`lib/client-logging.ts`)
   - Browser-compatible logging
   - Component performance tracking
   - Error boundary integration
   - Server reporting for critical client-side errors

## Server-side Logging Usage

### Basic Logging

```typescript
import logger from '@/lib/logging';

// Different log levels
logger.debug('Detailed debug info', { additionalContext: 'value' });
logger.info('Standard information message');
logger.http('HTTP-related information');
logger.warn('Warning condition');
logger.error('Error condition');
```

### Request Logging

```typescript
// In API routes or middleware
logger.logRequest(req, { 
  // Optional additional metadata
  metadata: { feature: 'agent-dashboard' } 
});

// When request completes
logger.logResponse(req, res, timerId);
```

### Error Logging

```typescript
try {
  // Your code here
} catch (error) {
  logger.logError('Failed to process data', error, {
    // Additional context
    userId: '123',
    operation: 'data-sync'
  });
}
```

### Performance Tracking

```typescript
// Method 1: Using trackApiCall
const apiCall = logger.trackApiCall('supabase_query');
// Your database operations
apiCall.end(); // End timing

// Method 2: Using withPerformanceTracking
const result = await logger.withPerformanceTracking('data_processing', async () => {
  // Your async operation
  return processedData;
});
```

## API Route Integration

### Pages Router (api/*)

```typescript
import { withLogging } from '@/lib/logging-middleware';

async function handler(req, res) {
  // Your handler logic
}

// Wrap handler with logging
export default withLogging(handler);
```

### App Router (app/api/*)

```typescript
import { withAppRouterLogging } from '@/lib/logging-middleware';

async function GET(request, { params }) {
  // Your handler logic
}

// Wrap with logging
export const GET = withAppRouterLogging(GET);
```

## Client-side Logging Usage

### Basic Client Logging

```typescript
import clientLogger from '@/lib/client-logging';

clientLogger.debug('Debug info');
clientLogger.info('User clicked button', { buttonId: 'submit' });
clientLogger.warn('Form validation warning', { field: 'email' });
clientLogger.error('Failed to load data', { component: 'AgentTable' });
```

### Component Performance Tracking

```typescript
import clientLogger from '@/lib/client-logging';

function YourComponent() {
  const perf = clientLogger.useComponentPerformance('YourComponent');
  
  useEffect(() => {
    const timerId = perf.start('data_fetch');
    
    // Your async operations
    
    const duration = perf.end(timerId);
    // duration will be in milliseconds
  }, []);
  
  // Rest of component
}
```

### Error Boundary Integration

```typescript
import clientLogger from '@/lib/client-logging';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  useEffect(() => {
    clientLogger.logComponentError(
      error,
      'Component stack trace',
      'ComponentName'
    );
  }, [error]);
  
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function YourComponent() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* Component content */}
    </ErrorBoundary>
  );
}
```

### Sending Critical Logs to Server

For critical client-side errors that need server-side tracking:

```typescript
try {
  // Critical operation
} catch (error) {
  clientLogger.logError(
    'Critical client-side error',
    error,
    { component: 'PaymentForm' },
    true // Send to server
  );
}
```

## Creating the Server Endpoint for Client Logs

To receive client-side logs on the server, create this API route:

```typescript
// pages/api/client-logs.ts
import { withLogging } from '@/lib/logging-middleware';
import logger from '@/lib/logging';

async function clientLogsHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { level, message, metadata } = req.body;
    
    // Log the client-side event to server logs
    logger.log(message, {
      level: level,
      metadata: {
        ...metadata,
        source: 'client',
        clientLogged: true
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.logError('Failed to process client log', error);
    return res.status(500).json({ error: 'Failed to process log' });
  }
}

export default withLogging(clientLogsHandler);
```

## Configuration

The logging level is controlled by the `LOG_LEVEL` environment variable (default is 'info' in production, 'debug' in development). Valid values are:

- `debug` - Most verbose (includes all logs)
- `http` - HTTP request logs and higher
- `info` - Standard information and higher
- `warn` - Warnings and errors only
- `error` - Only errors

## Best Practices

1. **Use appropriate log levels**:
   - `debug` - Detailed troubleshooting information
   - `http` - Request/response logs
   - `info` - Normal operational messages
   - `warn` - Warning conditions
   - `error` - Error conditions that need attention

2. **Include context in logs**:
   - Add relevant identifiers (userId, requestId, etc.)
   - Include operation names and component names
   - Add business context (what was being attempted)

3. **Redact sensitive information**:
   - Never log passwords, tokens, or personal data
   - Use the built-in redaction for known sensitive fields
   - Add custom fields to redact when needed

4. **Track performance metrics**:
   - Use `trackApiCall` for external API calls
   - Use `withPerformanceTracking` for critical operations
   - Add component performance tracking for UX monitoring

5. **Handle errors consistently**:
   - Always use `logError` for error conditions
   - Include the original error object for stack traces
   - Add relevant context about the operation

## Integration with Monitoring Tools

This logging system outputs structured logs which can be integrated with monitoring tools:

- **JSON format in production** allows easy integration with log aggregation services
- **RequestId tracking** enables following request flows across logs
- **Performance metrics** provide insights for monitoring and alerts
- **Error tracking** can be linked to notification systems

## Example Logging Flow

A typical API request might generate logs in this sequence:

1. Request received → `logRequest` logs basic request info
2. API processing → various `info` logs showing progress
3. Database queries → `trackApiCall` logs performance
4. Response sent → `logResponse` logs status and timing

For detailed examples, see:
- `examples/api-route-logging.ts` for API routes
- `examples/component-logging.tsx` for React components

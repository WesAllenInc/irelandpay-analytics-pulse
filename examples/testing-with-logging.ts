/**
 * Example of integrating the logging system with Vitest tests
 * Demonstrates how to use logging for test debugging and monitoring
 */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import logger from '../lib/logging';
import { createMockSupabaseClient } from '../__tests__/utils/supabase-mocks';

// Example test helper that sets up logging in the test environment
export function setupTestLogging() {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };
  
  // Mock logging to capture test logs
  const testLogs: Array<{level: string; message: string; meta: any}> = [];
  
  // Create spy on logger methods
  vi.spyOn(logger, 'info');
  vi.spyOn(logger, 'error');
  vi.spyOn(logger, 'warn');
  vi.spyOn(logger, 'debug');
  
  // Set up console capture for test output
  console.log = (...args) => {
    testLogs.push({ level: 'info', message: args[0], meta: args[1] || {} });
    originalConsole.log(...args);
  };
  
  console.error = (...args) => {
    testLogs.push({ level: 'error', message: args[0], meta: args[1] || {} });
    originalConsole.error(...args);
  };
  
  console.warn = (...args) => {
    testLogs.push({ level: 'warn', message: args[0], meta: args[1] || {} });
    originalConsole.warn(...args);
  };
  
  console.debug = (...args) => {
    testLogs.push({ level: 'debug', message: args[0], meta: args[1] || {} });
    originalConsole.debug(...args);
  };
  
  // Function to restore console methods
  const restoreConsole = () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
    vi.restoreAllMocks();
  };
  
  // Helper to find logs matching criteria
  const findLogs = (criteria: { level?: string; message?: string | RegExp }) => {
    return testLogs.filter(log => {
      let match = true;
      if (criteria.level) {
        match = match && log.level === criteria.level;
      }
      if (criteria.message) {
        if (criteria.message instanceof RegExp) {
          match = match && criteria.message.test(log.message);
        } else {
          match = match && log.message.includes(criteria.message);
        }
      }
      return match;
    });
  };
  
  // Return utilities for test cases
  return {
    testLogs,
    findLogs,
    restoreConsole
  };
}

// Example test suite for an ingestion function that uses the logging system
describe('Merchant Ingestion Function', () => {
  // Set up test logging and mocks
  const { testLogs, findLogs, restoreConsole } = setupTestLogging();
  
  // Example merchant data for tests
  const testMerchant = {
    id: 'test-merchant-123',
    name: 'Test Merchant',
    volume: 10000,
    bps: 25,
    residual: 250
  };
  
  // Create mock Supabase client
  const supabaseMock = createMockSupabaseClient({
    data: {
      merchants: [testMerchant]
    }
  });
  
  // Reset before each test
  beforeEach(() => {
    testLogs.length = 0; // Clear the logs array
    vi.resetAllMocks();
  });
  
  // Clean up after tests
  afterEach(() => {
    restoreConsole();
  });
  
  it('should log successful merchant ingestion', async () => {
    // Example function to test - this would be imported from your actual code
    // In a real test, you would import your actual function:
    // const { ingestMerchantData } = await import('../lib/data-ingestion');
    
    // For this example, we'll define a mock function
    const ingestMerchantData = async (client: any, data: any[]) => {
      logger.info('Starting merchant data ingestion', { count: data.length });
      
      const timer = logger.trackApiCall('merchant_ingestion');
      
      // Example database operation using the client
      await client.from('merchants').upsert(data);
      
      timer.end();
      
      logger.info('Merchant data ingestion completed', { count: data.length });
      
      return { success: true, count: data.length };
    };
    
    // Run the function with the mock
    const result = await ingestMerchantData(supabaseMock, [testMerchant]);
    
    // Verify the function result
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    
    // Verify proper logging occurred
    const infoLogs = findLogs({ level: 'info', message: 'Merchant data ingestion completed' });
    expect(infoLogs).toHaveLength(1);
    expect(infoLogs[0].meta).toHaveProperty('count', 1);
    
    // Verify performance metrics were logged
    const perfLogs = findLogs({ message: /ingestion_duration/ });
    expect(perfLogs.length).toBeGreaterThan(0);
  });
  
  it('should log errors during failed merchant ingestion', async () => {
    // Create an error-throwing mock
    const errorMock = {
      ...supabaseMock,
      from: () => ({
        upsert: () => {
          throw new Error('Database error');
        }
      })
    };
    
    // For this example, we'll define a mock function as in the previous test
    const ingestMerchantData = async (client: any, data: any[]) => {
      logger.info('Starting merchant data ingestion', { count: data.length });
      
      // Will throw error due to our errorMock
      await client.from('merchants').upsert(data);
      
      return { success: true, count: data.length };
    };
    
    // Run with the error mock
    await expect(ingestMerchantData(errorMock, [testMerchant]))
      .rejects.toThrow('Database error');
    
    // Verify error was properly logged
    const errorLogs = findLogs({ level: 'error', message: 'Failed to ingest merchant data' });
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].meta).toHaveProperty('error');
  });
  
  it('should track performance of merchant validation', async () => {
    // Mock the trackApiCall function to verify it's used
    const trackSpy = vi.spyOn(logger, 'withPerformanceTracking');
    
    // Example validation function that would use performance tracking
    const validateMerchantData = async (data: any[]) => {
      // Use the performance tracking wrapper from our logger
      return await logger.withPerformanceTracking('validate_merchant_data', async () => {
        // Simulate validation
        await new Promise(resolve => setTimeout(resolve, 50));
        return { valid: true, data };
      });
    };
    
    // Run the validation function
    const result = await validateMerchantData([testMerchant]);
    
    // Verify performance tracking was used
    expect(trackSpy).toHaveBeenCalledWith(
      'validate_merchant_data',
      expect.any(Function)
    );
    
    // Verify the result
    expect(result.valid).toBe(true);
  });
});

// Example of testing with mock request/response objects
export const apiRouteTestExample = `
import { createMocks } from 'node-mocks-http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import agentDashboardHandler from '@/pages/api/agents/[agentId]/dashboard';
import logger from '@/lib/logging';

describe('Agent Dashboard API', () => {
  const { findLogs, restoreConsole } = setupTestLogging();
  
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  afterEach(() => {
    restoreConsole();
  });

  it('should log request and response for successful request', async () => {
    // Create mock request/response
    const { req, res } = createMocks({
      method: 'GET',
      query: { agentId: 'agent-123' },
      headers: {
        'x-request-id': 'test-request-id'
      }
    });

    // Call the API handler
    await agentDashboardHandler(req, res);

    // Verify response
    expect(res._getStatusCode()).toBe(200);
    
    // Verify request was logged
    const requestLogs = findLogs({ message: /Request started/ });
    expect(requestLogs).toHaveLength(1);
    expect(requestLogs[0].meta).toHaveProperty('requestId', 'test-request-id');
    
    // Verify response was logged with timing
    const responseLogs = findLogs({ message: /Request completed/ });
    expect(responseLogs).toHaveLength(1);
    expect(responseLogs[0].meta).toHaveProperty('statusCode', 200);
    expect(responseLogs[0].meta).toHaveProperty('responseTime');
  });
});
`;

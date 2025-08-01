import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  CircuitBreaker, 
  RetryableError, 
  FatalError, 
  isRetryableError, 
  executeWithResilience 
} from '@crm/resilience';

describe('Resilience Module', () => {
  beforeEach(() => {
    // Reset circuit breaker state before each test
    const circuitBreaker = CircuitBreaker.getInstance();
    // Access private properties for testing (not ideal but necessary for testing)
    (circuitBreaker as any)._failures = 0;
    (circuitBreaker as any)._isOpen = false;
    (circuitBreaker as any)._lastFailureTime = null;
  });

  describe('CircuitBreaker', () => {
    it('should be a singleton', () => {
      const instance1 = CircuitBreaker.getInstance();
      const instance2 = CircuitBreaker.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start in closed state', () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should open after max failures', () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      
      // Record failures up to the threshold (5 by default)
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }
      
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should reset failure count after success', () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      
      // Record some failures
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      // Record success
      circuitBreaker.recordSuccess();
      
      // Should still be closed
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should execute operation when closed', async () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error when circuit is open', async () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }
      
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(RetryableError);
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should record failure when operation throws', async () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Operation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Types', () => {
    it('should create RetryableError correctly', () => {
      const error = new RetryableError('Test retryable error');
      expect(error.message).toBe('Test retryable error');
      expect(error.name).toBe('RetryableError');
    });

    it('should create FatalError correctly', () => {
      const error = new FatalError('Test fatal error');
      expect(error.message).toBe('Test fatal error');
      expect(error.name).toBe('FatalError');
    });
  });

  describe('isRetryableError', () => {
    it('should return false for FatalError', () => {
      const error = new FatalError('Fatal error');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return true for RetryableError', () => {
      const error = new RetryableError('Retryable error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for authentication errors', () => {
      const error401 = { status: 401 };
      const error403 = { status: 403 };
      
      expect(isRetryableError(error401)).toBe(false);
      expect(isRetryableError(error403)).toBe(false);
    });

    it('should return true for server errors (5xx)', () => {
      const error500 = { status: 500 };
      const error502 = { status: 502 };
      const error503 = { status: 503 };
      
      expect(isRetryableError(error500)).toBe(true);
      expect(isRetryableError(error502)).toBe(true);
      expect(isRetryableError(error503)).toBe(true);
    });

    it('should return true for network errors', () => {
      const connectionError = { code: 'ECONNRESET' };
      const notFoundError = { code: 'ENOTFOUND' };
      
      expect(isRetryableError(connectionError)).toBe(true);
      expect(isRetryableError(notFoundError)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const timeoutError = { code: 'ETIMEDOUT' };
      const timeoutMessageError = { message: 'Request timeout' };
      
      expect(isRetryableError(timeoutError)).toBe(true);
      expect(isRetryableError(timeoutMessageError)).toBe(true);
    });

    it('should return false for client errors (4xx) except specific ones', () => {
      const error400 = { status: 400 };
      const error404 = { status: 404 };
      const error422 = { status: 422 };
      
      expect(isRetryableError(error400)).toBe(false);
      expect(isRetryableError(error404)).toBe(false);
      expect(isRetryableError(error422)).toBe(true); // 422 is retryable
    });

    it('should return true for rate limiting (429)', () => {
      const rateLimitError = { status: 429 };
      expect(isRetryableError(rateLimitError)).toBe(true);
    });
  });

  describe('executeWithResilience', () => {
    it('should execute successful operation', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should return error when circuit is open', async () => {
      const circuitBreaker = CircuitBreaker.getInstance();
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }
      
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toEqual({
        success: false,
        error: 'Service temporarily unavailable due to repeated failures',
        details: 'Circuit breaker is open'
      });
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new RetryableError('Temporary error'))
        .mockResolvedValueOnce('success');
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on fatal errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new FatalError('Fatal error'));
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toEqual({
        success: false,
        error: 'Operation failed after maximum retry attempts',
        details: 'Fatal error'
      });
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should return error after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new RetryableError('Persistent error'));
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toEqual({
        success: false,
        error: 'Operation failed after maximum retry attempts',
        details: 'Persistent error'
      });
      // Should have been called 4 times (1 initial + 3 retries)
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });

    it('should handle unknown errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Unknown error'));
      
      const result = await executeWithResilience(mockOperation);
      
      expect(result).toEqual({
        success: false,
        error: 'Operation failed after maximum retry attempts',
        details: 'Unknown error'
      });
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
}); 
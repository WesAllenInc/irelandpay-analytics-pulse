import { CircuitBreakerState } from '@/types/sync';

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private halfOpenRequests = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime.getTime() > this.timeout) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - API temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  getLastFailureTime(): Date | undefined {
    return this.lastFailureTime;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = undefined;
  }
}

// Singleton instance for global circuit breaker
let globalCircuitBreaker: CircuitBreaker | null = null;

export function getGlobalCircuitBreaker(): CircuitBreaker {
  if (!globalCircuitBreaker) {
    globalCircuitBreaker = new CircuitBreaker(
      parseInt(process.env.IRELANDPAY_CIRCUIT_MAX_FAILURES || '5'),
      parseInt(process.env.IRELANDPAY_CIRCUIT_RESET_SECONDS || '60') * 1000,
      3
    );
  }
  return globalCircuitBreaker;
}

// Utility function to execute with circuit breaker
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  circuitBreaker?: CircuitBreaker
): Promise<T> {
  const cb = circuitBreaker || getGlobalCircuitBreaker();
  return cb.execute(operation);
} 
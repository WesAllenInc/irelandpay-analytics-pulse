import { describe, it, expect } from 'vitest';

describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have proper environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have DOM environment available', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });
}); 
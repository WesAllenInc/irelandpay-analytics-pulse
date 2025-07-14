// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the window.matchMedia function for components that might use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  constructor(callback: IntersectionObserverCallback) {}
  disconnect() { return null; }
  observe() { return null; }
  takeRecords() { return []; }
  unobserve() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  disconnect() { return null; }
  observe() { return null; }
  unobserve() { return null; }
};

// Mock fetch if not already mocked in individual test files
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Silence React 18 console warnings during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0]) ||
    /Warning: The current testing environment is not configured to support act/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};

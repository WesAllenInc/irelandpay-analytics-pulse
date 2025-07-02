import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Setup for jsdom environment
beforeAll(() => {
  // Create a root element where React components will be mounted
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);

  // Mock createObjectURL and revokeObjectURL
  if (typeof window !== 'undefined') {
    Object.defineProperty(window.URL, 'createObjectURL', {
      writable: true,
      value: vi.fn().mockReturnValue('mock-url'),
    });
    
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    // Mock matchMedia
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

    // Mock window.fetch
    window.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })
    );
  }

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock HTMLElement.prototype.scrollIntoView
  if (typeof HTMLElement !== 'undefined') {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  }

  // Setup for clipboard API used by user-event
  if (typeof navigator !== 'undefined') {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(''),
      }
    });
  }

  // Suppress React 18 console errors 
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    if (
      errorMessage.includes('ReactDOM.render is no longer supported') || 
      errorMessage.includes('Target container is not a DOM element') ||
      errorMessage.includes('createRoot')
    ) {
      return; // Suppress React 18 specific errors
    }
    originalError(...args);
  };
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
  
  // Ensure a clean DOM element exists for React to mount to
  if (!document.getElementById('root')) {
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }
});

afterEach(() => {
  // Clean up DOM after each test
  cleanup();
  
  // Clear any timers
  vi.clearAllTimers();
});

afterAll(() => {
  vi.restoreAllMocks();
});

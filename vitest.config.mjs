// vitest.config.mjs - Using .mjs extension to ensure ESM mode
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// Run tests if NODE_ENV is 'test' or if we're in CI
const shouldRunTests = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: shouldRunTests ? [
      '__tests__/basic.test.ts'
    ] : [],
    setupFiles: shouldRunTests ? ['__tests__/setup.ts'] : [],
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './'),
      '@backend': resolve(process.cwd(), './lib'),
      '@crm': resolve(process.cwd(), './lib'),
      '@api': resolve(process.cwd(), './app/api'),
      '@lib': resolve(process.cwd(), './lib')
    },
  },
  define: {
    'process.env': {}
  },
});

// vitest.config.mjs - Using .mjs extension to ensure ESM mode
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts', 
      'tests/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx'
    ],
    setupFiles: ['__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './')
    },
  },
  define: {
    'process.env': {}
  },
});

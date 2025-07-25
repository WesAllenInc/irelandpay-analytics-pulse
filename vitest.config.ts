/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitest.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  define: {
    'process.env': {}
  },
  test: {
    root: './',
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts', 
      'tests/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx'
    ],
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      enabled: true,
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/__tests__/**',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
  },
});

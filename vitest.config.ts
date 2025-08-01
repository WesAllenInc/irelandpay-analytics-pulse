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
    setupFiles: ['__tests__/setup.ts'],
    include: [
      'tests/**/*.test.ts', 
      'tests/**/*.test.tsx',
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx'
    ],
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
        '**/__mocks__/**',
      ]
    },
    watch: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@backend': path.resolve(__dirname, './src/backend'),
      '@crm': path.resolve(__dirname, './src/crm'),
      '@api': path.resolve(__dirname, './src/api'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
});

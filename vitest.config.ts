import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
        '.next/',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    testTimeout: 10000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@nexus/auth': resolve(__dirname, './packages/auth/src'),
      '@nexus/database': resolve(__dirname, './packages/database/src'),
      '@nexus/ui': resolve(__dirname, './packages/ui/src'),
      '@nexus/canvas-engine': resolve(__dirname, './packages/canvas-engine/src'),
      '@nexus/deployment': resolve(__dirname, './packages/deployment/src'),
      '@nexus/workflow-engine': resolve(__dirname, './packages/workflow-engine/src'),
      '@nexus/ai-assistant': resolve(__dirname, './packages/ai-assistant/src'),
    },
  },
});
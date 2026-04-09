import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 70 },
    },
  },
});

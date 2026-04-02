import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { process: false, Buffer: false, global: false },
      exclude: ['process', 'crypto'],
    }),
  ],
  base: './',
  server: { port: 3000 },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

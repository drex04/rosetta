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
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            /src\/components\/panels\/OutputPanel|src\/lib\/rmlExecute|rmlmapper-js/.test(
              id,
            )
          )
            return 'panel-output';
          if (
            /src\/components\/panels\/ValidationPanel|src\/store\/validationStore|rdf-validate-shacl/.test(
              id,
            )
          )
            return 'panel-validate';
          if (/src\/components\/panels\/MappingPanel/.test(id))
            return 'panel-map';
          if (id.includes('node_modules/n3')) return 'vendor-n3';
          if (id.includes('node_modules/jsonld')) return 'vendor-jsonld';
          if (
            id.includes('node_modules/@comake/rmlmapper-js') ||
            id.includes('node_modules/rmlmapper')
          )
            return 'vendor-rml';
          if (
            id.includes('node_modules/@codemirror') ||
            id.includes('node_modules/@lezer')
          )
            return 'vendor-codemirror';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@comake/rmlmapper-js'],
  },
});

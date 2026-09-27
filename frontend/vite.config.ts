import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'events', 'process', 'stream', 'util'],
      globals: { Buffer: true, global: true, process: true },
    })
  ],
  build: {
    target: 'esnext'
  },
  resolve: {
    alias: {
      'isomorphic-ws': fileURLToPath(new URL('./src/isomorphic-ws-browser.ts', import.meta.url)),
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js-protocol',
    ],
  },
  server: {
    port: 3000,
    host: true
  }
});

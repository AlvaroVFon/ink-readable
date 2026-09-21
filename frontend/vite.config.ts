/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Prettier is only imported dynamically (format on save); pre-bundling these
  // subpath entries keeps the dev server from failing to resolve them on demand.
  optimizeDeps: {
    include: ['prettier/standalone', 'prettier/plugins/markdown'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8082',
      },
      '/health': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8082',
      },
    },
  },
  test: {
    clearMocks: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

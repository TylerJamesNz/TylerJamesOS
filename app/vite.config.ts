import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import harnessSubmit from './vite-plugins/harness-submit'

export default defineConfig({
  plugins: [react(), harnessSubmit()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts: ['tylerbatchelor.local', 'localhost'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

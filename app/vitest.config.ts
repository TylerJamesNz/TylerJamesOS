import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig({
  ...viteConfig,
  test: {
    include: [
      'src/**/*.test.{ts,tsx}',
      '../supabase/functions/**/*.test.ts',
    ],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

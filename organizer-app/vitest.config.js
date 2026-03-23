import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '.'),
      '#app': path.resolve(__dirname, 'tests/unit/mocks/nuxt-app.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/unit/setup/vitest.setup.ts')],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/e2e/**',
      '**/tests/e2e/**'
    ],
    include: [
      '**/tests/unit/**/*.test.{js,ts}',
      '**/tests/unit/**/*.spec.{js,ts}',
    ],
  }
})

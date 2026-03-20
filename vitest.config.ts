import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'lib/security/**',
        'lib/auth.ts',
        'lib/validations/sale.schema.ts',
        'lib/validations/retiro-caja.schema.ts',
      ],
      thresholds: {
        statements: 75,
      },
    },
  },
})

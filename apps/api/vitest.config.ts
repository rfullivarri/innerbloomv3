import { defineConfig } from 'vitest/config';

const shouldEnforceCoverage = process.env.STRICT_COVERAGE === 'true';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    setupFiles: ['src/tests/setup-env.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      // We focus coverage on security-critical surfaces to track auth regressions.
      include: [
        'src/middlewares/**',
        'src/services/auth-service.ts',
        'src/controllers/**',
        'src/routes/**',
        'src/lib/validation.ts',
      ],
      exclude: [
        'src/index.ts',
        'src/db.ts',
        'src/db/schema/**',
        'src/types.ts',
        'scripts/**',
        'src/routes/webhooks/**',
      ],
      thresholds: shouldEnforceCoverage
        ? {
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80,
          }
        : undefined,
    },
  },
});

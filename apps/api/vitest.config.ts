import { defineConfig } from 'vitest/config';

const shouldEnforceCoverage = process.env.STRICT_COVERAGE === 'true';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    setupFiles: [],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
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

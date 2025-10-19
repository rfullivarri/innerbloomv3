import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  expect: {
    timeout: 7_500,
  },
  webServer: {
    command: 'npm --workspace @innerbloom/web run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      MOCK_CLERK: 'true',
      VITE_USE_MOCK_AUTH: 'true',
      VITE_CLERK_PUBLISHABLE_KEY: 'test_pk_mock',
      VITE_API_BASE_URL: 'http://127.0.0.1:5173',
    },
  },
});

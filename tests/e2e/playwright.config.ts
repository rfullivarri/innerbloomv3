import { defineConfig, devices } from '@playwright/test';

const MOBILE_PROJECTS = [
  {
    name: 'webkit-mobile',
    use: {
      ...devices['iPhone 14 Pro'],
      browserName: 'webkit' as const,
    },
  },
  {
    name: 'chromium-mobile',
    use: {
      ...devices['Pixel 7'],
      browserName: 'chromium' as const,
    },
  },
];

export default defineConfig({
  testDir: './missions-v2',
  timeout: 90_000,
  fullyParallel: false,
  expect: {
    timeout: 7_500,
  },
  projects: MOBILE_PROJECTS,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
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

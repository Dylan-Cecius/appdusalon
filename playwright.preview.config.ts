import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'preview-safety.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'preview-desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'preview-mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_PREVIEW_DEMO_ONLY: 'true',
    },
  },
});

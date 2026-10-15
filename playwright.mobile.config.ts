import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './mobile-tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone-small', use: { ...devices['iPhone SE'] } },
    { name: 'iphone-portrait', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 13 landscape'] } },
    { name: 'ipad', use: { ...devices['iPad Mini'] } },
  ],
  webServer: {
    command: 'node scripts/mobile/serve-demo.mjs',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

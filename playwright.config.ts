import { defineConfig } from '@playwright/test';

const local = process.env.SMOKE_LOCAL === '1';
const baseURL = process.env.SMOKE_BASE_URL || (local ? 'http://127.0.0.1:4179' : 'https://useclis.com');

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 45_000,
  globalTimeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI
    ? [['github'], ['line'], ['html', { outputFolder: 'artifacts/smoke-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'artifacts/smoke-report', open: 'never' }]],
  outputDir: 'artifacts/smoke-results',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'small-phone', use: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  ],
  ...(local ? {
    webServer: {
      command: 'npx astro preview --host 127.0.0.1 --port 4179',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  } : {}),
});

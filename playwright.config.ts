import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests run against the built extension (dist/) in real Chromium.
 * Specs import `test` from tests/e2e/fixtures.ts, which launches the
 * persistent context an extension needs; see the comment there.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Each test gets its own browser profile, but launching several extension
  // browsers at once is slow and flaky on CI runners.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});

import { defineConfig } from '@playwright/test';

/**
 * Manual smoke test against real public websites (`npm run smoke:real-sites`).
 * Never part of CI: live sites change daily and tests must not depend on them.
 */
export default defineConfig({
  testDir: './tests/smoke',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  use: {
    // Page CSP and Trusted Types would block the harness's injection technique,
    // not SiteCheck itself, which runs in the extension's isolated world.
    bypassCSP: true,
    viewport: { width: 1280, height: 800 },
  },
});

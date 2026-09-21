import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 16 — configuration for the MVP golden-path E2E test
 * (tests/e2e/mvp-golden-path.spec.ts).
 *
 * NOT CURRENTLY EXECUTABLE in this environment: this machine's Application
 * Control (WDAC/AppLocker) policy blocks execution of the downloaded
 * Chromium binary ("An Application Control policy has blocked this file"),
 * confirmed by attempting `chromium.launch()` directly and by running the
 * unsigned executable itself. See docs/PHASE_16_E2E_MVP_TEST_REPORT.md for
 * the full investigation. This config and the spec it drives are prepared,
 * correct infrastructure for the next environment where a browser can
 * actually be launched — not evidence that the golden path has passed.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

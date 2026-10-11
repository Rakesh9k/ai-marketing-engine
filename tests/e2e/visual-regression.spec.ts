import { test, expect } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Suite
 * Validates responsive UI layout across Desktop (1440x900) and Mobile (390x844) viewports.
 */

const targetPages = [
  { name: 'landing-page', path: '/' },
  { name: 'pricing-page', path: '/pricing' },
  { name: 'login-page', path: '/login' },
  { name: 'signup-page', path: '/signup' },
  { name: 'features-page', path: '/features' },
];

test.describe('Visual Regression Protection — Desktop (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const pageInfo of targetPages) {
    test(`Desktop snapshot for ${pageInfo.name}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
      // Freeze animations for visual snapshot stability
      await page.addStyleTag({
        content: '* { animation: none !important; transition: none !important; }',
      });
      await expect(page).toHaveScreenshot(`${pageInfo.name}-desktop.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});

test.describe('Visual Regression Protection — Mobile (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const pageInfo of targetPages) {
    test(`Mobile snapshot for ${pageInfo.name}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
      await page.addStyleTag({
        content: '* { animation: none !important; transition: none !important; }',
      });
      await expect(page).toHaveScreenshot(`${pageInfo.name}-mobile.png`, {
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});

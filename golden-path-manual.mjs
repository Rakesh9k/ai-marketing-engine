import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOT_DIR = 'C:\\Users\\admin\\AppData\\Local\\Temp\\claude\\d--brainwise-AI-marketing-Agent-ai-marketing-engine\\076e192b-625d-46b7-a73a-16076ee9cd94\\scratchpad\\shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const stamp = Date.now();
const identity = {
  email: `golden-path-${stamp}@example.test`,
  password: `GoldenPath!${stamp}Aa1`,
  businessName: `Kondapur Biryani House ${stamp}`,
  productName: `Chicken Biryani ${stamp}`,
};

const log = (...args) => console.log(new Date().toISOString(), ...args);
const results = {};

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  try {
    // ---- Step 1: Open Mitra ----
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(1500);
    await shot(page, '01-home');
    results.open = 'PASS';
    log('STEP 1 open: OK, title=', await page.title());

    // ---- Step 2: Signup ----
    await page.goto('http://localhost:3000/signup');
    await page.getByLabel('Email').fill(identity.email);
    await page.getByLabel('Password', { exact: true }).fill(identity.password);
    await page.getByLabel('Confirm Password').fill(identity.password);
    await shot(page, '02-signup-filled');
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await page.waitForURL(/onboarding|dashboard/, { timeout: 20000 });
    await page.waitForTimeout(1500);
    results.signup = 'PASS';
    log('STEP 2 signup: OK, url=', page.url());
    await shot(page, '02-signup-after');

    // ---- Step 3: Onboarding (5-step wizard) ----
    // Signup does NOT auto-navigate into onboarding (PublicOnlyRoute sends
    // an authenticated user straight to /dashboard). Real customer flow is
    // signup -> dashboard's own "no business yet" empty state -> onboarding.
    let onboardingUrl = page.url();
    if (!onboardingUrl.includes('onboarding')) {
      const createBusinessBtn = page.getByRole('button', { name: /create business/i });
      if (await createBusinessBtn.count() > 0) {
        await createBusinessBtn.first().click();
        await page.waitForURL(/onboarding/, { timeout: 10000 });
      } else {
        await page.goto('http://localhost:3000/onboarding');
      }
    }
    await page.waitForTimeout(1000);

    if (page.url().includes('onboarding')) {
      await page.locator('input[placeholder="e.g., Biryani House"]').fill(identity.businessName);
      await page.getByRole('button', { name: 'Continue' }).click();
      await shot(page, '03-onboarding-step1');

      await page.locator('input[placeholder="e.g., Hyderabad"]').fill('Hyderabad');
      await page.locator('input[placeholder="e.g., Telangana"]').fill('Telangana');
      await page.locator('input[placeholder="e.g., Kondapur"]').fill('Kondapur');
      await page.getByRole('button', { name: 'Continue' }).click();
      await shot(page, '03-onboarding-step2');

      const phoneInputs = page.locator('input[placeholder="e.g., +91 98765 43210"]');
      await phoneInputs.nth(0).fill('9876543210');
      await phoneInputs.nth(1).fill('9876543210');
      await page.getByRole('button', { name: 'Continue' }).click();
      await shot(page, '03-onboarding-step3');

      await page.getByRole('button', { name: 'Continue' }).click();
      await shot(page, '03-onboarding-step4');

      await page.getByRole('button', { name: /Complete Setup/i }).click();
      await page.waitForURL(/dashboard/, { timeout: 20000 });
      await page.waitForTimeout(1500);
      results.onboarding = 'PASS';
      log('STEP 3 onboarding: OK, url=', page.url());
    } else {
      results.onboarding = 'FAIL - could not reach /onboarding, url=' + page.url();
      log('STEP 3 FAILED:', results.onboarding);
    }
    await shot(page, '03-onboarding-done');

    // ---- Step 4: Business persistence (refresh dashboard) ----
    await page.reload();
    await page.waitForTimeout(2000);
    const dashboardText = await page.locator('body').innerText();
    results.businessPersistence = dashboardText.includes('No business set up yet')
      ? 'FAIL - business not found after refresh'
      : 'PASS';
    log('STEP 4 business persistence:', results.businessPersistence);
    await shot(page, '04-dashboard-refreshed');

    // ---- Step 5: Add product ----
    await page.goto('http://localhost:3000/products/new');
    await page.waitForTimeout(1500);
    await shot(page, '05-product-new');
    const preProductText = await page.locator('body').innerText();
    if (preProductText.includes('set up a business') || preProductText.includes('No business')) {
      results.addProduct = 'FAIL - business not found on /products/new';
      log('STEP 5 FAILED: business not detected on /products/new. Body:', preProductText.slice(0, 200));
    } else {
      await page.locator('input[placeholder="e.g., Chicken Biryani"]').fill(identity.productName);
      await page.locator('input[placeholder="e.g., 299"]').fill('299');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('D:\\brainwise AI marketing Agent\\ai-marketing-engine\\tests\\e2e\\fixtures\\test-product.jpg');
      await shot(page, '06-photo-selected');
      await page.getByRole('button', { name: 'Upload Image' }).click();
      await page.waitForTimeout(4000);
      await shot(page, '06-photo-uploaded');
      const uploadStateText = await page.locator('body').innerText();
      results.uploadPhoto = /uploaded successfully|remove photo/i.test(uploadStateText) ? 'PASS' : 'UNKNOWN';

      await page.getByRole('button', { name: 'Save Product' }).click();
      await page.waitForURL(/\/products$/, { timeout: 15000 });
      await page.waitForTimeout(1000);
      results.addProduct = 'PASS';
      log('STEP 5/6 product+photo: OK, url=', page.url(), 'uploadPhoto=', results.uploadPhoto);
    }
    await shot(page, '05-06-products-list');

    await page.reload();
    await page.waitForTimeout(1500);
    const productsListText = await page.locator('body').innerText();
    results.productPersistence = productsListText.includes(identity.productName) ? 'PASS' : 'FAIL';
    log('Product persistence after refresh:', results.productPersistence);

    // ---- Step 7: Create campaign ----
    await page.goto('http://localhost:3000/campaigns/new');
    await page.waitForTimeout(1500);
    await shot(page, '07-campaign-new');

    await page.getByRole('button', { name: /Weekend Offer/i }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);
    await shot(page, '07-campaign-step1-objective');

    await page.getByRole('button', { name: new RegExp(identity.productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
    const campaignFileInput = page.locator('input[type="file"]');
    if (await campaignFileInput.count() > 0) {
      await campaignFileInput.first().setInputFiles('D:\\brainwise AI marketing Agent\\ai-marketing-engine\\tests\\e2e\\fixtures\\test-product.jpg');
      const uploadBtn = page.getByRole('button', { name: 'Upload Image' });
      if (await uploadBtn.count() > 0) {
        await uploadBtn.click().catch(() => {});
        await page.waitForTimeout(3000);
      }
    }
    await shot(page, '07-campaign-step2-product');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    await page.locator('select').first().selectOption('percentage');
    await page.locator('input[placeholder="e.g., Weekend Biryani Special"]').fill('Weekend Biryani Special');
    await page.locator('input[placeholder="e.g., 349"]').fill('349');
    await page.locator('input[placeholder="e.g., 299"]').fill('299');
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    const fmt = (d) => d.toISOString().split('T')[0];
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(fmt(today));
    await dateInputs.nth(1).fill(fmt(nextWeek));
    await shot(page, '07-campaign-step3-offer');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    await shot(page, '07-campaign-step4-audience');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Order on WhatsApp/i }).click();
    await shot(page, '07-campaign-step5-cta');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /^English$/i }).click();
    await page.getByRole('button', { name: /Hyderabadi/i }).click();
    await shot(page, '07-campaign-step6-language');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /^Funny$/i }).click();
    await shot(page, '07-campaign-step7-style');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);

    const reviewText = await page.locator('body').innerText();
    results.campaignReview = reviewText.includes(identity.productName) ? 'PASS' : 'FAIL';
    log('STEP 7 campaign review:', results.campaignReview);
    await shot(page, '07-campaign-step8-review');

    const creditsMatch = reviewText.match(/Current balance:\s*(\d+|—)\s*credits/);
    log('Credits before generation:', creditsMatch ? creditsMatch[1] : 'not found');
    results.creditsBefore = creditsMatch ? creditsMatch[1] : 'unknown';

    // ---- Step 8/9: Generate (credit reservation + AI generation) ----
    await page.getByRole('button', { name: /Generate Campaign/i }).click();
    await shot(page, '08-generate-clicked');
    results.generateClicked = 'PASS';

    await page.waitForURL(/\/campaigns\/[^/]+$/, { timeout: 60000 }).catch((e) => {
      log('Did not navigate to campaign detail within 60s:', e.message);
    });
    await shot(page, '09-after-generate-wait');
    log('URL after generate:', page.url());

    if (/\/campaigns\/[^/]+$/.test(page.url())) {
      await page.waitForFunction(
        () => /verified|failed|truth check/i.test(document.body.innerText),
        { timeout: 90000 }
      ).catch(() => {});
      const campaignDetailText = await page.locator('body').innerText();
      results.pipelineOutcome = /failed/i.test(campaignDetailText)
        ? 'FAIL-SAFE (pipeline reached failed state, as expected without AI credentials)'
        : /verified/i.test(campaignDetailText)
          ? 'PASS (verified)'
          : 'UNKNOWN - ' + campaignDetailText.slice(0, 500);
      log('Pipeline outcome:', results.pipelineOutcome);
      await shot(page, '10-campaign-detail-final');

      results.campaignUrl = page.url();
    } else {
      results.pipelineOutcome = 'UNKNOWN - did not reach campaign detail page, still at ' + page.url();
    }

    // ---- Logout / Login persistence ----
    const logoutBtn = page.getByRole('button', { name: /log ?out|sign ?out/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL(/login|signup|^http:\/\/localhost:3000\/$/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      results.logout = /login|signup/.test(page.url()) ? 'PASS' : 'UNKNOWN - url=' + page.url();
      log('Logout:', results.logout, page.url());
      await shot(page, '11-after-logout');

      // Try direct protected navigation while logged out
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForTimeout(1500);
      results.unauthAccessBlocked = /login/.test(page.url()) ? 'PASS' : 'FAIL - reached ' + page.url() + ' while logged out';
      log('Unauth access to /dashboard blocked:', results.unauthAccessBlocked);
      await shot(page, '12-unauth-dashboard-attempt');

      // Login again
      await page.goto('http://localhost:3000/login');
      await page.getByLabel('Email').fill(identity.email);
      await page.getByLabel('Password').fill(identity.password);
      await page.getByRole('button', { name: /log ?in|sign in/i }).click();
      await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      results.loginAgain = /dashboard/.test(page.url()) ? 'PASS' : 'FAIL - url=' + page.url();
      log('Login again:', results.loginAgain);
      await shot(page, '13-after-relogin');

      // Verify campaign persists
      await page.goto('http://localhost:3000/campaigns');
      await page.waitForTimeout(1500);
      const campaignsListText = await page.locator('body').innerText();
      results.campaignPersistsAfterRelogin = campaignsListText.includes(identity.productName) ? 'PASS' : 'UNKNOWN';
      log('Campaign persists after relogin:', results.campaignPersistsAfterRelogin);
      await shot(page, '14-campaigns-after-relogin');
    } else {
      results.logout = 'BLOCKED - no logout button found';
    }

    // ---- Billing page check ----
    await page.goto('http://localhost:3000/billing');
    await page.waitForTimeout(1500);
    await shot(page, '15-billing');
    const billingText = await page.locator('body').innerText();
    results.billingPageRenders = /Billing|Plan|Credits/i.test(billingText) ? 'PASS' : 'FAIL';
    results.billingHasUpgradeButton = /Upgrade to this Plan/i.test(billingText) ? 'PASS' : 'UNKNOWN';
    log('Billing page:', results.billingPageRenders, 'upgrade button present:', results.billingHasUpgradeButton);

    // Attempt clicking Upgrade to see real behavior (will fail server-side
    // without Razorpay credentials - want to observe exactly how).
    const upgradeBtn = page.getByRole('button', { name: /Upgrade to this Plan/i }).first();
    if (await upgradeBtn.count() > 0) {
      await upgradeBtn.click();
      await page.waitForTimeout(4000);
      await shot(page, '16-billing-after-upgrade-click');
      const afterClickText = await page.locator('body').innerText();
      results.upgradeClickOutcome = afterClickText.slice(0, 300);
    }

    results.consoleErrors = consoleErrors.slice(0, 60);
  } catch (err) {
    results.fatalError = err.message;
    log('FATAL ERROR:', err.message);
    await shot(page, '99-fatal-error');
  } finally {
    await browser.close();
  }

  fs.writeFileSync(
    path.join(SHOT_DIR, '..', 'results.json'),
    JSON.stringify({ identity, results }, null, 2)
  );
  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify({ identity, results }, null, 2));
}

main();

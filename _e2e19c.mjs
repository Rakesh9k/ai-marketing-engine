import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL;
const OUT = process.env.OUT_DIR;
const stamp = Date.now();
const id = {
  email: `mitra-e2e-19c-${stamp}@example.test`,
  password: `E2e19c!${stamp}Aa1`,
  businessName: `[E2E-19C TEST] Biryani House ${stamp}`,
  productName: `E2E Biryani ${stamp}`,
};
const R = {
  steps: {},
  net: { hosts: {}, callables: [], appcheck: [], auth: [], failed: [], emulatorHits: [] },
  console: [],
};
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const shot = (p, n) =>
  p.screenshot({ path: path.join(OUT, 'shots', n + '.png'), fullPage: true }).catch(() => {});

function wire(page) {
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      R.console.push(m.type() + ': ' + m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => R.console.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('request', (r) => {
    const u = new URL(r.url());
    R.net.hosts[u.host] = (R.net.hosts[u.host] || 0) + 1;
    if (/localhost|127\.0\.0\.1/.test(u.host)) R.net.emulatorHits.push(r.url());
  });
  page.on('requestfailed', (r) =>
    R.net.failed.push(r.url().slice(0, 140) + ' :: ' + (r.failure()?.errorText || ''))
  );
  page.on('response', (r) => {
    const u = r.url();
    const s = r.status();
    if (/cloudfunctions\.net|\.run\.app/.test(u)) {
      R.net.callables.push({ fn: u.split('/').pop().split('?')[0], status: s });
    } else if (/firebaseappcheck\.googleapis\.com/.test(u)) {
      R.net.appcheck.push({ call: u.split('?')[0].split('/').slice(-1)[0], status: s });
    } else if (/identitytoolkit|securetoken/.test(u)) {
      R.net.auth.push({ call: u.split('?')[0].split('/').slice(-1)[0], status: s });
    } else if (s >= 400 && !/favicon/.test(u)) {
      R.net.failed.push(s + ' ' + u.slice(0, 140));
    }
  });
}

async function bodyText(page) {
  return page.locator('body').innerText();
}

async function run() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  wire(page);
  const S = R.steps;

  try {
    await page.goto(BASE + '/');
    await page.waitForTimeout(2500);
    await shot(page, '01-home');
    S.A_load = (await page.title()).includes('Mitra') ? 'PASS' : 'FAIL';

    await page.goto(BASE + '/signup');
    await page.getByLabel('Email').fill(id.email);
    await page.getByLabel('Password', { exact: true }).fill(id.password);
    await page.getByLabel('Confirm Password').fill(id.password);
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await page.waitForURL(/onboarding|dashboard/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, '02-after-signup');
    S.B_signup = /onboarding|dashboard/.test(page.url())
      ? 'PASS'
      : 'FAIL url=' + page.url() + ' body=' + (await bodyText(page)).slice(0, 200);
    if (S.B_signup !== 'PASS') throw new Error('signup failed');

    if (!page.url().includes('onboarding')) {
      const b = page.getByRole('button', { name: /create business/i });
      if (await b.count()) {
        await b.first().click();
        await page.waitForURL(/onboarding/, { timeout: 10000 });
      } else {
        await page.goto(BASE + '/onboarding');
      }
    }
    await page.locator('input[placeholder="e.g., Biryani House"]').fill(id.businessName);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.locator('input[placeholder="e.g., Hyderabad"]').fill('Hyderabad');
    await page.locator('input[placeholder="e.g., Telangana"]').fill('Telangana');
    await page.locator('input[placeholder="e.g., Kondapur"]').fill('Kondapur');
    await page.getByRole('button', { name: 'Continue' }).click();
    const ph = page.locator('input[placeholder="e.g., +91 98765 43210"]');
    await ph.nth(0).fill('9876543210');
    await ph.nth(1).fill('9876543210');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /Complete Setup/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, '03-after-onboarding');
    S.D_createBusiness = /dashboard/.test(page.url())
      ? 'PASS (reached dashboard)'
      : 'FAIL url=' + page.url() + ' body=' + (await bodyText(page)).slice(0, 250);
    await page.reload();
    await page.waitForTimeout(2500);
    S.D_businessPersists = (await bodyText(page)).includes('No business set up yet')
      ? 'FAIL'
      : 'PASS';

    await page.goto(BASE + '/products/new');
    await page.waitForTimeout(2000);
    await page.locator('input[placeholder="e.g., Chicken Biryani"]').fill(id.productName);
    await page.locator('input[placeholder="e.g., 299"]').fill('299');
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.resolve('tests/e2e/fixtures/test-product.jpg'));
    await page.getByRole('button', { name: 'Upload Image' }).click();
    await page.waitForTimeout(6000);
    await shot(page, '04-upload');
    S.E_storageUpload = /uploaded successfully|remove photo/i.test(await bodyText(page))
      ? 'PASS'
      : 'FAIL/UNKNOWN';
    await page.getByRole('button', { name: 'Save Product' }).click();
    await page.waitForURL(/\/products$/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await shot(page, '05-products');
    S.E_productSaved = (await bodyText(page)).includes(id.productName) ? 'PASS' : 'FAIL';
  } catch (e) {
    S.fatal = e.message.slice(0, 300);
    await shot(page, '99-fatal');
  }

  try {
    const lo = page.getByRole('button', { name: /log ?out|sign ?out/i });
    if (await lo.count()) {
      await lo.first().click();
      await page.waitForTimeout(2500);
    }
    await page.goto(BASE + '/dashboard');
    await page.waitForTimeout(2500);
    S.F_logoutBlocksProtected = /login/.test(page.url()) ? 'PASS' : 'FAIL url=' + page.url();
    await page.goto(BASE + '/login');
    await page.getByLabel('Email').fill(id.email);
    await page.getByLabel('Password').fill(id.password);
    await page.getByRole('button', { name: /log ?in|sign in/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    S.F_loginAgain = /dashboard/.test(page.url()) ? 'PASS' : 'FAIL url=' + page.url();
    await page.reload();
    await page.waitForTimeout(2000);
    S.F_authPersistsOnRefresh = /dashboard/.test(page.url()) ? 'PASS' : 'FAIL';

    await page.goto(BASE + '/billing');
    await page.waitForTimeout(2500);
    await shot(page, '06-billing');
    const bt = await bodyText(page);
    S.I_billingRenders = /Billing|Plan|Credits/i.test(bt) ? 'PASS' : 'FAIL';
    S.I_upgradeButton = /Upgrade to this Plan/i.test(bt) ? 'present' : 'absent';

    await page.goto(BASE + '/campaigns/abc123');
    await page.waitForTimeout(3000);
    await shot(page, '07-campaign-nonexistent');
    S.campaignRoute_nonexistent = /not found|doesn.t exist|don.t have access/i.test(
      await bodyText(page)
    )
      ? 'PASS (proper not-found state)'
      : 'UNKNOWN';

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/dashboard');
    await page.waitForTimeout(2000);
    await shot(page, '08-mobile-dashboard');
    S.mobile_noHorizontalOverflow = (await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    ))
      ? 'PASS'
      : 'FAIL';
  } catch (e) {
    S.fatal2 = e.message.slice(0, 300);
  }

  await browser.close();
  R.console = [...new Set(R.console)].slice(0, 40);
  const summarize = (a) =>
    Object.entries(
      a.reduce((m, x) => {
        const k = JSON.stringify(x);
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {})
    ).map(([k, v]) => k + ' x' + v);
  R.net.callables = summarize(R.net.callables);
  R.net.appcheck = summarize(R.net.appcheck);
  R.net.auth = summarize(R.net.auth);
  R.net.failed = [...new Set(R.net.failed)].slice(0, 25);
  fs.writeFileSync(
    path.join(OUT, 'cred.json'),
    JSON.stringify({ email: id.email, password: id.password })
  );
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ email: id.email, R }, null, 2));
  console.log(JSON.stringify({ email: id.email, R }, null, 2));
}
run();

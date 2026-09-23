import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL;
const OUT = process.env.OUT_DIR;
const FN = 'https://asia-south1-brainwise-ai-marketing-engine.cloudfunctions.net';
const PROJECT = 'brainwise-ai-marketing-engine';
const credA = JSON.parse(fs.readFileSync(path.join(process.env.CRED_DIR, 'cred.json'), 'utf8'));
const stamp = Date.now();
const productName = `E2E Biryani ${stamp}`;
const R = { steps: {}, ids: {}, imageResponses: [], callables: [], consoleErrors: [], negative: {} };
const S = R.steps;
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, 'shots', n + '.png'), fullPage: true }).catch(() => {});
const LAUNCH = { headless: false, args: ['--disable-blink-features=AutomationControlled'] };
const CTX = { viewport: { width: 1280, height: 900 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' };
const text = (p) => p.locator('body').innerText();

function wire(page, tag, sink) {
  page.on('console', (m) => { if (m.type() === 'error') R.consoleErrors.push(`[${tag}] ` + m.text().slice(0, 220)); });
  page.on('request', (r) => {
    const d = r.postData() || '';
    const m = d.match(/documents\/businesses\/([A-Za-z0-9_-]{6,})/) || decodeURIComponent(r.url()).match(/businesses\/([A-Za-z0-9_-]{6,})/);
    if (m && sink && !sink.businessId) sink.businessId = m[1];
  });
  page.on('response', async (r) => {
    const u = r.url();
    if (/_next\/image/.test(u)) R.imageResponses.push({ tag, status: r.status(), ct: r.headers()['content-type'] });
    if (/cloudfunctions\.net/.test(u)) R.callables.push({ tag, fn: u.split('/').pop().split('?')[0], status: r.status() });
    if (sink && /exchangeRecaptchaEnterpriseToken/.test(u) && r.status() === 200) { try { sink.appCheck = (await r.json()).token; } catch {} }
    if (sink && /accounts:signUp|accounts:signInWithPassword/.test(u) && r.status() === 200) { try { const j = await r.json(); sink.idToken = j.idToken; sink.uid = j.localId; } catch {} }
  });
}

async function warm(page) {
  await page.goto(BASE + '/');
  await page.mouse.move(200, 200);
  await page.mouse.move(640, 420, { steps: 25 });
  await page.waitForTimeout(1200);
}
async function typeInto(page, label, value, opts = {}) {
  const el = page.getByLabel(label, opts);
  await el.click();
  await el.pressSequentially(value, { delay: 40 });
}

async function login(page, cred) {
  await warm(page);
  await page.goto(BASE + '/login');
  await typeInto(page, 'Email', cred.email);
  await typeInto(page, 'Password', cred.password);
  await page.getByRole('button', { name: /log ?in|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function userA() {
  const sink = {};
  const browser = await chromium.launch(LAUNCH);
  const page = await (await browser.newContext(CTX)).newPage();
  page.setDefaultTimeout(20000);
  wire(page, 'A', sink);
  try {
    await login(page, credA);
    S.A1_login = /dashboard/.test(page.url()) ? 'PASS' : 'FAIL url=' + page.url();
    // dashboard data (index fix); retry while the new index finishes building
    let dash = '';
    for (let i = 0; i < 12; i++) { dash = await text(page); if (!/Failed to load dashboard data/.test(dash)) break; await page.waitForTimeout(30000); await page.reload(); await page.waitForTimeout(3000); }
    await shot(page, 'A-dashboard');
    S.A2_dashboardData = /Failed to load dashboard data/.test(dash) ? 'FAIL - ' + dash.slice(0, 120) : 'PASS';
    if (S.A2_dashboardData !== 'PASS') throw new Error('dashboard failed');
    R.ids.businessId = sink.businessId || null;
    S.A3_businessOnDashboard = /No business set up yet/.test(dash) ? 'FAIL' : 'PASS';

    // product + storage + image
    await page.goto(BASE + '/products/new'); await page.waitForTimeout(2500);
    await page.locator('input[placeholder="e.g., Chicken Biryani"]').fill(productName);
    await page.locator('input[placeholder="e.g., 299"]').fill('299');
    await page.locator('input[type="file"]').setInputFiles(path.resolve('tests/e2e/fixtures/test-product.jpg'));
    await page.getByRole('button', { name: 'Upload Image' }).click();
    await page.waitForTimeout(7000); await shot(page, 'A-upload');
    S.A4_storageUpload = /uploaded successfully|remove photo/i.test(await text(page)) ? 'PASS' : 'FAIL: ' + (await text(page)).slice(0, 160);
    if (!/^PASS/.test(S.A4_storageUpload)) throw new Error('upload failed');
    await page.getByRole('button', { name: 'Save Product' }).click();
    await page.waitForURL(/\/products$/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000); await shot(page, 'A-products');
    S.A5_productSaved = (await text(page)).includes(productName) ? 'PASS' : 'FAIL';
    await page.reload(); await page.waitForTimeout(3000);
    S.A5b_productPersists = (await text(page)).includes(productName) ? 'PASS' : 'FAIL';
    S.A6_productImages = await page.evaluate(() => [...document.images].map((i) => ({ ok: i.complete && i.naturalWidth > 0, viaNextImage: /_next\/image/.test(i.currentSrc), src: i.currentSrc.replace(/\?.*/, '').slice(0, 90) })).slice(0, 4));

    // campaign wizard -> one generation
    await page.goto(BASE + '/campaigns/new'); await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /Weekend Offer/i }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(600);
    await page.getByRole('button', { name: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
    const cf = page.locator('input[type="file"]');
    if (await cf.count()) { await cf.first().setInputFiles(path.resolve('tests/e2e/fixtures/test-product.jpg')); const ub = page.getByRole('button', { name: 'Upload Image' }); if (await ub.count()) { await ub.click().catch(() => {}); await page.waitForTimeout(4000); } }
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(600);
    await page.locator('select').first().selectOption('percentage');
    await page.locator('input[placeholder="e.g., Weekend Biryani Special"]').fill('Weekend Biryani Special');
    await page.locator('input[placeholder="e.g., 349"]').fill('349');
    await page.locator('input[placeholder="e.g., 299"]').fill('299');
    const fmt = (d) => d.toISOString().split('T')[0];
    const di = page.locator('input[type="date"]'); await di.nth(0).fill(fmt(new Date())); await di.nth(1).fill(fmt(new Date(Date.now() + 7 * 864e5)));
    for (const step of ['audience']) { await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(500); }
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Order on WhatsApp/i }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^English$/i }).click(); await page.getByRole('button', { name: /Hyderabadi/i }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^Funny$/i }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(800);
    const review = await text(page); await shot(page, 'A-campaign-review');
    S.A7_campaignReview = review.includes(productName) ? 'PASS' : 'FAIL';
    R.creditsBefore = (review.match(/Current balance:\s*(\d+|—)\s*credits/) || [])[1] || 'unknown';
    await page.getByRole('button', { name: /Generate Campaign/i }).click();
    await page.waitForURL(/\/campaigns\/[^/]+$/, { timeout: 90000 }).catch(() => {});
    R.ids.campaignUrl = page.url();
    S.A8_campaignRequestReachedBackend = /\/campaigns\/[^/]+$/.test(page.url()) ? 'PASS (navigated to campaign)' : 'FAIL/UNKNOWN url=' + page.url();
    if (/\/campaigns\/[^/]+$/.test(page.url())) {
      R.ids.campaignId = page.url().split('/').pop().split('?')[0];
      await page.waitForFunction(() => /verified|failed|truth check|ready|review/i.test(document.body.innerText), { timeout: 120000 }).catch(() => {});
      await page.waitForTimeout(3000); await shot(page, 'A-campaign-detail');
      const cd = await text(page);
      S.A9_campaignOutcome = /failed/i.test(cd) ? 'PIPELINE FAILED STATE: ' + (cd.match(/[^\n]*failed[^\n]*/i) || [''])[0].slice(0, 160) : /verified/i.test(cd) ? 'verified' : 'UNKNOWN: ' + cd.slice(0, 200);
      S.A10_campaignImages = await page.evaluate(() => [...document.images].map((i) => ({ ok: i.complete && i.naturalWidth > 0, viaNextImage: /_next\/image/.test(i.currentSrc) })).slice(0, 6));
    }
    await page.goto(BASE + '/campaigns'); await page.waitForTimeout(3000);
    const after = await text(page);
    S.A11_campaignListed = after.includes(productName) || /Weekend Biryani Special/.test(after) ? 'PASS' : 'UNKNOWN';
    await page.goto(BASE + '/billing'); await page.waitForTimeout(3500); await shot(page, 'A-billing');
    const bt = await text(page);
    S.A12_billing = /Billing|Plan|Credits/i.test(bt) && !/Failed to load/i.test(bt) ? 'PASS renders' : 'FAIL: ' + bt.slice(0, 160);
    S.A12b_plansShown = /Upgrade to this Plan/i.test(bt) ? 'upgrade button present' : 'no upgrade button';
    await page.goto(BASE + '/usage'); await page.waitForTimeout(3000);
    const ut = await text(page); R.creditsAfterText = (ut.match(/(\d+)\s*credits?/i) || [])[0] || null;
    await page.goto(BASE + '/campaigns/abc123'); await page.waitForTimeout(3500);
    S.A13_nonexistentCampaign = /not found|doesn.t exist|don.t have access/i.test(await text(page)) ? 'PASS (not-found state)' : 'UNKNOWN';
    // logout
    await page.goto(BASE + '/dashboard'); await page.waitForTimeout(2500);
    const lo = page.getByRole('button', { name: /log ?out|sign ?out/i });
    S.A14_logoutControl = (await lo.count()) ? 'found' : 'NOT FOUND';
    if (await lo.count()) { await lo.first().click(); await page.waitForTimeout(3000); }
    await page.goto(BASE + '/dashboard'); await page.waitForTimeout(2500);
    S.A15_protectedAfterLogout = /login/.test(page.url()) ? 'PASS' : 'FAIL url=' + page.url();
    await login(page, credA);
    S.A16_loginAgain = /dashboard/.test(page.url()) ? 'PASS' : 'FAIL';
    await page.reload(); await page.waitForTimeout(2500);
    S.A17_persistsOnRefresh = /dashboard/.test(page.url()) && !/Failed to load/.test(await text(page)) ? 'PASS' : 'FAIL';
    await page.goto(BASE + '/campaigns'); await page.waitForTimeout(3000);
    S.A18_dataAfterRelogin = /Weekend Biryani Special/.test(await text(page)) ? 'PASS (campaign persists)' : 'UNKNOWN';
  } catch (e) { S.A_stopped = e.message.slice(0, 260); await shot(page, 'A-stop'); }
  await browser.close();
  return sink;
}

async function userB(sinkA) {
  const sink = {};
  const email = `mitra-e2e-19c-B-${stamp}@example.test`;
  const password = `E2e19cB!${stamp}Aa1`;
  const browser = await chromium.launch(LAUNCH);
  const page = await (await browser.newContext(CTX)).newPage();
  page.setDefaultTimeout(20000);
  wire(page, 'B', sink);
  try {
    await warm(page);
    await page.goto(BASE + '/signup');
    await typeInto(page, 'Email', email);
    await typeInto(page, 'Password', password, { exact: true });
    await typeInto(page, 'Confirm Password', password);
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    await page.waitForURL(/onboarding|dashboard/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    S.B1_signupSecondUser = /onboarding|dashboard/.test(page.url()) ? 'PASS' : 'FAIL';
    R.ids.userB_email = email;
    const bid = R.ids.businessId; const cid = R.ids.campaignId;
    if (cid) {
      await page.goto(BASE + '/campaigns/' + cid); await page.waitForTimeout(4000); await shot(page, 'B-other-campaign');
      const t = await text(page);
      R.negative.B_ui_otherUsersCampaign = /not found|doesn.t exist|don.t have access/i.test(t) ? 'REJECTED (not-found/no-access state)' : 'NOT REJECTED?: ' + t.slice(0, 160);
    }
    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sink.idToken, 'X-Firebase-AppCheck': sink.appCheck || '' };
    if (bid && sink.idToken) {
      const fs1 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/businesses/${bid}`, { headers: { Authorization: 'Bearer ' + sink.idToken } });
      R.negative.B_firestoreRead_otherUsersBusiness = fs1.status === 403 || fs1.status === 404 ? `REJECTED (HTTP ${fs1.status})` : `NOT REJECTED: HTTP ${fs1.status}`;
      const c1 = await fetch(`${FN}/getBusiness`, { method: 'POST', headers: H, body: JSON.stringify({ data: { businessId: bid } }) });
      R.negative.B_callable_getBusiness_otherUsers = c1.status >= 400 ? `REJECTED (HTTP ${c1.status}: ${(await c1.text()).slice(0, 90)})` : 'NOT REJECTED: ' + (await c1.text()).slice(0, 90);
      if (cid) {
        const c2 = await fetch(`${FN}/getCampaign`, { method: 'POST', headers: H, body: JSON.stringify({ data: { campaignId: cid, businessId: bid } }) });
        R.negative.B_callable_getCampaign_otherUsers = c2.status >= 400 ? `REJECTED (HTTP ${c2.status}: ${(await c2.text()).slice(0, 90)})` : 'NOT REJECTED: ' + (await c2.text()).slice(0, 90);
      }
      const c3 = await fetch(`${FN}/createProduct`, { method: 'POST', headers: H, body: JSON.stringify({ data: { businessId: bid, name: 'x', price: 1 } }) });
      R.negative.B_callable_createProduct_underOtherBusiness = c3.status >= 400 ? `REJECTED (HTTP ${c3.status}: ${(await c3.text()).slice(0, 90)})` : 'NOT REJECTED: ' + (await c3.text()).slice(0, 90);
      const c4 = await fetch(`${FN}/getBusiness`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sink.idToken }, body: JSON.stringify({ data: { businessId: bid } }) });
      R.negative.B_callable_validAuth_noAppCheck = c4.status >= 400 ? `REJECTED (HTTP ${c4.status})` : 'NOT REJECTED: HTTP ' + c4.status;
    } else { R.negative.note = 'missing businessId or B token; cross-tenant API tests not run'; }
  } catch (e) { S.B_stopped = e.message.slice(0, 260); }
  await browser.close();
}

const sinkA = await userA();
if (S.A2_dashboardData === 'PASS') await userB(sinkA);
R.callables = [...new Set(R.callables.map((c) => `${c.tag} ${c.fn} ${c.status}`))];
R.consoleErrors = [...new Set(R.consoleErrors)].slice(0, 20);
R.imageResponses = [...new Set(R.imageResponses.map((c) => `${c.tag} ${c.status} ${c.ct}`))];
fs.writeFileSync(path.join(OUT, 'results2.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));

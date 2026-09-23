import { chromium } from '@playwright/test';

const BASE = 'https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app';
const FN = 'https://asia-south1-brainwise-ai-marketing-engine.cloudfunctions.net';
const PROJECT = 'brainwise-ai-marketing-engine';
const VICTIM_BUSINESS_ID = process.argv[2]; // business owned by the FIRST test user
const stamp = Date.now();
const email = `mitra-e2e-19c-neg-${stamp}@example.test`;
const password = `E2eNeg!${stamp}Aa1`;

const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] });
const page = await (await browser.newContext({ locale: 'en-IN', timezoneId: 'Asia/Kolkata', viewport: { width: 1280, height: 900 } })).newPage();
const tok = {};
page.on('response', async (r) => {
  const u = r.url();
  if (/exchangeRecaptchaEnterpriseToken/.test(u) && r.status() === 200) tok.appCheck = (await r.json()).token;
  if (/accounts:signUp/.test(u) && r.status() === 200) { const j = await r.json(); tok.idToken = j.idToken; tok.uid = j.localId; }
});

await page.goto(BASE + '/');
await page.mouse.move(200, 200);
await page.mouse.move(640, 420, { steps: 25 });
await page.waitForTimeout(1200);
await page.goto(BASE + '/signup');
for (const [label, val, opts] of [['Email', email, {}], ['Password', password, { exact: true }], ['Confirm Password', password, {}]]) {
  const el = page.getByLabel(label, opts);
  await el.click();
  await el.pressSequentially(val, { delay: 40 });
}
await page.getByRole('button', { name: /sign up|create account/i }).click();
await page.waitForURL(/onboarding|dashboard/, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);
console.log('second user (attacker) signup:', /onboarding|dashboard/.test(page.url()) ? 'PASS' : 'FAIL ' + page.url());
console.log('tokens captured: idToken', !!tok.idToken, '| appCheck', !!tok.appCheck);
await browser.close();
if (!tok.idToken) process.exit(1);

const results = [];
const check = (name, ok, detail) => results.push(`${ok ? 'REJECTED ' : 'NOT REJECTED!!'}  ${name}  ${detail}`);
const call = async (fn, data, headers) => {
  const r = await fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ data }) });
  return { status: r.status, body: (await r.text()).slice(0, 110).replace(/\s+/g, ' ') };
};
const full = { Authorization: 'Bearer ' + tok.idToken, 'X-Firebase-AppCheck': tok.appCheck };

// sanity: attacker CAN call with valid auth+appcheck on their own scope (proves the headers are good)
const own = await call('listBusinesses', {}, full);
results.push(`sanity   listBusinesses with attacker's own valid Auth+AppCheck -> HTTP ${own.status}`);

let r = await call('getBusiness', { businessId: VICTIM_BUSINESS_ID }, full);
check("getBusiness on another user's business (valid Auth+AppCheck)", r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('createProduct', { businessId: VICTIM_BUSINESS_ID, name: 'x', category: 'Main', price: 1 }, full);
check("createProduct under another user's business", r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('getUploadUrl', { businessId: VICTIM_BUSINESS_ID, assetType: 'product', fileName: 'a.jpg', contentType: 'image/jpeg', fileSize: 1000 }, full);
check("getUploadUrl for another user's business", r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('getBusiness', { businessId: VICTIM_BUSINESS_ID }, { Authorization: 'Bearer ' + tok.idToken });
check('getBusiness with valid Auth but NO App Check', r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('getBusiness', { businessId: VICTIM_BUSINESS_ID }, { Authorization: 'Bearer ' + tok.idToken, 'X-Firebase-AppCheck': 'invalid.app.check' });
check('getBusiness with valid Auth but INVALID App Check', r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('getBusiness', { businessId: VICTIM_BUSINESS_ID }, { 'X-Firebase-AppCheck': tok.appCheck });
check('getBusiness with valid App Check but NO Auth', r.status >= 400, `HTTP ${r.status} ${r.body}`);
r = await call('getBusiness', { businessId: VICTIM_BUSINESS_ID }, { Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.e30.bad', 'X-Firebase-AppCheck': tok.appCheck });
check('getBusiness with FAKE Auth token + valid App Check', r.status >= 400, `HTTP ${r.status} ${r.body}`);

const fsBase = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
let f = await fetch(`${fsBase}/businesses/${VICTIM_BUSINESS_ID}`, { headers: { Authorization: 'Bearer ' + tok.idToken } });
check("Firestore direct read of another user's business doc", f.status === 403 || f.status === 404, `HTTP ${f.status}`);
f = await fetch(`${fsBase}:runQuery`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok.idToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'products' }], where: { fieldFilter: { field: { fieldPath: 'businessId' }, op: 'EQUAL', value: { stringValue: VICTIM_BUSINESS_ID } } }, limit: 5 } }) });
const fj = await f.json();
const denied = fj[0]?.error?.status === 'PERMISSION_DENIED';
check("Firestore query of another user's products", denied, `${fj[0]?.error?.status || 'returned ' + fj.filter((x) => x.document).length + ' docs'}`);
f = await fetch(`${fsBase}/businesses/${VICTIM_BUSINESS_ID}?updateMask.fieldPaths=name`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + tok.idToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'HACKED' } } }) });
check("Firestore WRITE to another user's business doc", f.status === 403 || f.status === 404, `HTTP ${f.status}`);
f = await fetch(`${fsBase}/users/${tok.uid}?updateMask.fieldPaths=role`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + tok.idToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }) });
check('Privilege escalation: write own users/{uid}.role = admin', f.status === 403 || f.status === 404, `HTTP ${f.status}`);
const st = await fetch(`https://firebasestorage.googleapis.com/v0/b/${PROJECT}.firebasestorage.app/o?prefix=businesses%2F${VICTIM_BUSINESS_ID}%2F`, { headers: { Authorization: 'Firebase ' + tok.idToken } });
check("Storage list of another user's business folder", st.status === 403 || st.status === 401, `HTTP ${st.status}`);

console.log(results.join('\n'));

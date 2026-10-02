import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'https://mitra-web--brainwise-ai-marketing-engine.asia-southeast1.hosted.app';
const P = 'brainwise-ai-marketing-engine';
const cred = JSON.parse(fs.readFileSync(process.argv[2] + '/cred.json', 'utf8'));

async function getToken() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const b = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const p = await (await b.newContext({ locale: 'en-IN', timezoneId: 'Asia/Kolkata' })).newPage();
    let tok = '';
    p.on('response', async (r) => {
      if (/accounts:signInWithPassword/.test(r.url()) && r.status() === 200)
        tok = (await r.json()).idToken;
    });
    await p.goto(BASE + '/');
    await p.mouse.move(300, 300);
    await p.mouse.move(700, 420, { steps: 15 });
    await p.goto(BASE + '/login');
    await p.getByLabel('Email').fill(cred.email);
    await p.getByLabel('Password').fill(cred.password);
    await p.getByRole('button', { name: /log ?in|sign in/i }).click();
    await p.waitForTimeout(6000);
    await b.close();
    if (tok) return tok;
  }
  throw new Error('could not obtain an ID token after 3 attempts');
}

const idToken = await getToken();
const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
const uid = claims.user_id;
const bid = claims.businessIds[0];
const H = { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' };
const base = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents`;
const s = (x) => ({ stringValue: x });
const F = (f, op, v) => ({ fieldFilter: { field: { fieldPath: f }, op, value: v } });
const AND = (...f) => ({ compositeFilter: { op: 'AND', filters: f } });
const ord = (f, d = 'ASCENDING') => ({ field: { fieldPath: f }, direction: d });

const dec = (msg) => {
  const raw = (msg.match(/create_composite=([^\s"]+)/) || [])[1];
  if (!raw) return '';
  const st = Buffer.from(
    decodeURIComponent(raw).replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('latin1');
  const cg = st.match(/collectionGroups\/([a-z_]+)/)[1];
  const f = [];
  const re = /\x1a[\x00-\xff]\x0a([\x00-\xff])([\x20-\x7e]+?)\x10([\x01-\x03])/g;
  let m;
  while ((m = re.exec(st)))
    f.push(
      m[2].slice(0, m[1].charCodeAt(0)) + ':' + ['', 'ASC', 'DESC', 'ARR'][m[3].charCodeAt(0)]
    );
  return ' NEEDS ' + cg + ' -> ' + f.join(', ');
};

const tests = [
  [
    'businesses userId/status!=/createdAt desc',
    'businesses',
    AND(F('userId', 'EQUAL', s(uid)), F('status', 'NOT_EQUAL', s('archived'))),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'products businessId/status!=/sortOrder,createdAt',
    'products',
    AND(F('businessId', 'EQUAL', s(bid)), F('status', 'NOT_EQUAL', s('archived'))),
    [ord('sortOrder'), ord('createdAt', 'DESCENDING')],
  ],
  [
    'campaigns businessId/createdAt desc',
    'campaigns',
    F('businessId', 'EQUAL', s(bid)),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'campaigns businessId/status==/createdAt desc',
    'campaigns',
    AND(F('businessId', 'EQUAL', s(bid)), F('status', 'EQUAL', s('verified'))),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'campaigns userId/createdAt desc',
    'campaigns',
    F('userId', 'EQUAL', s(uid)),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'campaign_assets campaignId/type,index',
    'campaign_assets',
    F('campaignId', 'EQUAL', s('x')),
    [ord('type'), ord('index')],
  ],
  [
    'campaign_assets businessId/createdAt desc',
    'campaign_assets',
    F('businessId', 'EQUAL', s(bid)),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'campaign_assets businessId/type==/createdAt desc',
    'campaign_assets',
    AND(F('businessId', 'EQUAL', s(bid)), F('type', 'EQUAL', s('post'))),
    [ord('createdAt', 'DESCENDING')],
  ],
  [
    'subscriptions userId/status in',
    'subscriptions',
    AND(
      F('userId', 'EQUAL', s(uid)),
      F('status', 'IN', { arrayValue: { values: [s('active'), s('trialing'), s('past_due')] } })
    ),
    [],
  ],
  [
    'usage userId/periodStart desc',
    'usage',
    F('userId', 'EQUAL', s(uid)),
    [ord('periodStart', 'DESCENDING')],
  ],
  [
    'analytics businessId/timestamp desc',
    'analytics_events',
    F('businessId', 'EQUAL', s(bid)),
    [ord('timestamp', 'DESCENDING')],
  ],
  [
    'reels businessId/createdAt desc',
    'reels',
    F('businessId', 'EQUAL', s(bid)),
    [ord('createdAt', 'DESCENDING')],
  ],
];

let bad = 0;
let building = 0;
for (const [label, coll, where, orderBy] of tests) {
  const sq = { from: [{ collectionId: coll }], where, limit: 5 };
  if (orderBy.length) sq.orderBy = orderBy;
  const r = await fetch(`${base}:runQuery`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ structuredQuery: sq }),
  });
  const j = await r.json();
  const e = j[0]?.error;
  let msg = 'OK';
  if (e) {
    bad++;
    if (/index/i.test(e.message || '')) {
      const isBuilding = /building/i.test(e.message);
      if (isBuilding) building++;
      msg = `${e.status} (index ${isBuilding ? 'BUILDING' : 'MISSING'})${dec(e.message || '')}`;
    } else {
      msg = `${e.status}: ${(e.message || '').slice(0, 80)}`;
    }
  }
  console.log(label.padEnd(50), msg);
}
console.log(`queries failing: ${bad} (of which index-building: ${building})`);

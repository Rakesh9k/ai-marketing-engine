/**
 * READ-ONLY audit: are there any live customers still depending on PayU or Razorpay?
 *
 * Prints COUNTS ONLY — no user IDs, emails, amounts or payloads. Performs no writes.
 *
 * Needs Google credentials with Firestore read access to the project, from EITHER:
 *   - Application Default Credentials:  gcloud auth application-default login
 *   - a service-account key file:       GOOGLE_APPLICATION_CREDENTIALS=path\\to\\key.json
 *     (keep the key out of git and out of chat; revoke it afterwards)
 *
 * Usage (from the repo root):
 *   node scripts/audit-legacy-subscribers.mjs --project brainwise-ai-marketing-engine
 *
 * No credentials handy? Do the same thing by hand in the Firebase Console — see
 * docs/LEGAL_PADDLE_WORDING_DRAFT.md ("D4 manual check").
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '..', 'functions', 'package.json'));
const admin = require('firebase-admin');

const projectIdx = process.argv.indexOf('--project');
const projectId = projectIdx > -1 ? process.argv[projectIdx + 1] : undefined;
if (!projectId) {
  console.error('Pass --project <firebase project id> so the target is explicit.');
  process.exit(1);
}

admin.initializeApp({ projectId });
const db = admin.firestore();
console.log(`Project: ${projectId}   (read-only, counts only)\n`);

const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
const now = Date.now();
const toMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v ? Date.parse(v) : NaN);

function providerOf(d) {
  if (d.provider) return d.provider; // 'paddle' | 'payu' | …
  if (d.razorpaySubscriptionId || d.razorpayPaymentId) return 'razorpay';
  return d.planId === 'free' ? 'free (app-level)' : 'unknown-legacy';
}

const subs = await db.collection('subscriptions').where('status', 'in', LIVE_STATUSES).get();
const table = {};
for (const doc of subs.docs) {
  const d = doc.data();
  const provider = providerOf(d);
  const paid = d.planId && d.planId !== 'free';
  const end = toMs(d.currentPeriodEnd);
  const stillInPeriod = Number.isFinite(end) ? end > now : null;
  const key = `${provider} | ${paid ? 'paid' : 'free'}${paid ? ` | ${stillInPeriod === null ? 'period?' : stillInPeriod ? 'in paid period' : 'period ended'}` : ''}`;
  table[key] = (table[key] || 0) + 1;
}

console.log('LIVE-STATUS subscriptions by provider:');
for (const [k, v] of Object.entries(table).sort()) console.log(`  ${String(v).padStart(5)}  ${k}`);
if (subs.empty) console.log('  (none)');

const legacyPaid = Object.entries(table)
  .filter(([k]) => /^(payu|razorpay|unknown-legacy) \| paid/.test(k))
  .reduce((n, [, v]) => n + v, 0);

for (const provider of ['payu']) {
  const tx = await db.collection('transactions').where('provider', '==', provider).where('status', '==', 'completed').count().get();
  console.log(`\nCompleted ${provider} transactions (all time): ${tx.data().count}`);
}
const rzpTx = await db.collection('transactions').where('status', '==', 'completed').where('type', '==', 'subscription').limit(500).get();
const rzp = rzpTx.docs.filter((d) => d.data().razorpayPaymentId || d.data().razorpaySubscriptionId).length;
console.log(`Completed Razorpay-linked subscription transactions (first 500 scanned): ${rzp}`);

console.log('\nRESULT:');
console.log(
  legacyPaid === 0
    ? '  No live PAID PayU/Razorpay/unknown-legacy subscriptions found.'
    : `  ${legacyPaid} live PAID legacy subscription(s) exist — do NOT remove processor references blindly.`
);
process.exit(0);

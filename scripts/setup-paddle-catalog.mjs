/**
 * Reconciles the Paddle catalog (products + prices) with Mitra's pricing source
 * of truth, functions/src/config/pricing.ts.
 *
 * Idempotent and non-destructive:
 *   - DRY RUN by default. Nothing is written unless --apply is passed.
 *   - Finds existing products/prices first; creates only what is missing.
 *   - A price that exists but has drifted (wrong amount, leftover trial, missing
 *     Mitra custom_data) is PATCHed in place only with --apply. Prices are never
 *     archived or deleted by this script.
 *   - Refuses to run against production unless PADDLE_BASE_URL is set explicitly
 *     AND --allow-production is passed.
 *
 * Usage (credentials come from the environment, never from this file):
 *   npm --prefix functions run build        # script reads compiled pricing.ts
 *   PADDLE_API_KEY=pdl_sdbx_... node scripts/setup-paddle-catalog.mjs            # dry run
 *   PADDLE_API_KEY=pdl_sdbx_... node scripts/setup-paddle-catalog.mjs --apply    # write
 *
 * Final output is the PADDLE_PRICE_ID_* env block for functions/.env.* / secrets.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ALLOW_PRODUCTION = process.argv.includes('--allow-production');

const PADDLE_API_KEY = process.env.PADDLE_API_KEY?.trim();
const PADDLE_BASE_URL = (process.env.PADDLE_BASE_URL || 'https://sandbox-api.paddle.com').replace(
  /\/$/,
  ''
);

if (!PADDLE_API_KEY) {
  console.error('Error: PADDLE_API_KEY environment variable is missing.');
  console.error(
    'Usage: PADDLE_API_KEY=pdl_sdbx_... node scripts/setup-paddle-catalog.mjs [--apply]'
  );
  process.exit(1);
}

const isSandbox = PADDLE_BASE_URL.includes('sandbox');
if (!isSandbox && !ALLOW_PRODUCTION) {
  console.error(`Refusing to run against ${PADDLE_BASE_URL} without --allow-production.`);
  process.exit(1);
}

// --- Pricing source of truth ------------------------------------------------
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
let PRICING;
try {
  ({ PRICING } = require(path.join(here, '..', 'functions', 'lib', 'config', 'pricing.js')));
} catch {
  console.error(
    'Could not load functions/lib/config/pricing.js. Run `npm --prefix functions run build` first.'
  );
  process.exit(1);
}

const toMinor = (inr) => String(Math.round(inr * 100));
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Paid plans only — `free` is never sold. */
const PLAN_KEYS = Object.keys(PRICING.subscriptionTiers).filter(
  (k) => PRICING.subscriptionTiers[k].priceINR > 0
);

const PLAN_PRODUCTS = PLAN_KEYS.map((plan) => {
  const tier = PRICING.subscriptionTiers[plan];
  return {
    kind: 'plan',
    plan,
    name: `Mitra ${titleCase(plan)}`,
    description: `Mitra ${titleCase(plan)} plan — ${tier.monthlyCredits} AI credits per month.`,
    prices: [
      { cycle: 'monthly', interval: 'month', amount: toMinor(tier.priceINR) },
      { cycle: 'yearly', interval: 'year', amount: toMinor(tier.yearlyPriceINR) },
    ],
  };
});

const PACK_PRODUCT = {
  kind: 'credit_pack',
  name: 'Mitra Credit Top-Up',
  description: 'One-time AI credit top-up packs for Mitra.',
  prices: PRICING.topUpPacks.map((pack) => ({
    credits: pack.credits,
    amount: toMinor(pack.priceINR),
  })),
};

// --- Paddle API helper --------------------------------------------------------
async function api(endpoint, method = 'GET', body) {
  const res = await fetch(`${PADDLE_BASE_URL}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Paddle API ${method} ${endpoint} -> ${res.status}: ${JSON.stringify(json.error)}`
    );
  }
  return json;
}

async function listAll(endpoint) {
  const out = [];
  let url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=200`;
  for (;;) {
    const page = await api(url);
    out.push(...page.data);
    const next = page.meta?.pagination?.next;
    if (!page.meta?.pagination?.has_more || !next) break;
    url = next.replace(PADDLE_BASE_URL, '');
  }
  return out;
}

// --- Reconciliation -----------------------------------------------------------
const actions = [];
const log = (msg) => console.log(msg);

function describeDrift(existing, want) {
  const drift = [];
  if (existing.unit_price?.amount !== want.amount) {
    drift.push(`amount ${existing.unit_price?.amount} -> ${want.amount}`);
  }
  if (existing.unit_price?.currency_code !== 'INR') drift.push('currency is not INR');
  if (existing.trial_period) drift.push('has a trial period (Mitra defines none)');
  for (const [k, v] of Object.entries(want.custom_data)) {
    if (existing.custom_data?.[k] !== v) drift.push(`custom_data.${k} -> ${v}`);
  }
  return drift;
}

async function reconcilePrice(product, existingPrices, want, label) {
  // Active prices only; archived ones are ignored.
  const candidates = existingPrices.filter(
    (p) => p.status === 'active' && p.product_id === product.id
  );

  let match;
  if (want.interval) {
    match = candidates.find(
      (p) => p.billing_cycle?.interval === want.interval && p.billing_cycle?.frequency === 1
    );
  } else {
    // One-time price: no billing cycle. Identify the pack by its credits custom_data,
    // falling back to the amount for prices created before custom_data existed.
    const oneTime = candidates.filter((p) => !p.billing_cycle);
    match =
      oneTime.find((p) => Number(p.custom_data?.credits) === want.custom_data.credits) ??
      oneTime.find((p) => p.unit_price?.amount === want.amount && !p.custom_data?.credits);
  }

  const desired = {
    description: want.description,
    unit_price: { amount: want.amount, currency_code: 'INR' },
    custom_data: want.custom_data,
  };

  if (!match) {
    log(`  + ${label}: CREATE ${want.amount} INR minor units`);
    actions.push({ type: 'create-price', label });
    if (!APPLY) return { id: '(would create)' };
    const created = await api('/prices', 'POST', {
      product_id: product.id,
      ...desired,
      ...(want.interval ? { billing_cycle: { interval: want.interval, frequency: 1 } } : {}),
    });
    log(`    created ${created.data.id}`);
    return created.data;
  }

  const drift = describeDrift(match, want);
  if (drift.length === 0) {
    log(`  = ${label}: ${match.id} OK`);
    return match;
  }

  log(`  ~ ${label}: ${match.id} DRIFT [${drift.join('; ')}]`);
  actions.push({ type: 'patch-price', label, id: match.id, drift });
  if (!APPLY) return match;
  const patched = await api(`/prices/${match.id}`, 'PATCH', {
    ...desired,
    // `null` clears an existing trial. Billing cycle cannot be changed by Paddle, so it is left alone.
    trial_period: null,
  });
  log(`    patched ${match.id}`);
  return patched.data;
}

async function reconcileProduct(existingProducts, want) {
  const found = existingProducts.find((p) => p.name === want.name && p.status === 'active');
  if (found) {
    log(`Product ${want.name}: ${found.id} (found)`);
    return found;
  }
  log(`Product ${want.name}: CREATE`);
  actions.push({ type: 'create-product', name: want.name });
  if (!APPLY) return { id: '(would create)', name: want.name };
  const created = await api('/products', 'POST', {
    name: want.name,
    description: want.description,
    tax_category: 'standard',
    custom_data: { mitra_kind: want.kind, ...(want.plan ? { mitra_plan: want.plan } : {}) },
  });
  log(`  created ${created.data.id}`);
  return created.data;
}

async function run() {
  log(`Paddle base URL: ${PADDLE_BASE_URL}`);
  log(APPLY ? 'MODE: APPLY (writes enabled)\n' : 'MODE: DRY RUN (no writes; pass --apply)\n');

  const existingProducts = await listAll('/products');
  const existingPrices = await listAll('/prices');
  log(`Existing: ${existingProducts.length} product(s), ${existingPrices.length} price(s)\n`);

  const envLines = [];

  for (const want of PLAN_PRODUCTS) {
    const product = await reconcileProduct(existingProducts, want);
    for (const p of want.prices) {
      const price = await reconcilePrice(
        product,
        existingPrices,
        {
          interval: p.interval,
          amount: p.amount,
          description: `${want.name} - ${p.cycle === 'monthly' ? 'Monthly' : 'Annual'}`,
          custom_data: { mitra_kind: 'plan', mitra_plan: want.plan, mitra_cycle: p.cycle },
        },
        `${want.plan}/${p.cycle}`
      );
      envLines.push(
        `PADDLE_PRICE_ID_${want.plan.toUpperCase()}_${p.cycle.toUpperCase()}=${price.id}`
      );
    }
  }

  const packProduct = await reconcileProduct(existingProducts, PACK_PRODUCT);
  for (const p of PACK_PRODUCT.prices) {
    const price = await reconcilePrice(
      packProduct,
      existingPrices,
      {
        interval: null,
        amount: p.amount,
        description: `${p.credits} Credits`,
        custom_data: { mitra_kind: 'credit_pack', credits: p.credits },
      },
      `pack/${p.credits}`
    );
    envLines.push(`PADDLE_PRICE_ID_PACK_${p.credits}=${price.id}`);
  }

  log('\n===== ENV BLOCK (functions) =====');
  for (const l of envLines) log(l);
  log(`\n${actions.length} change(s) ${APPLY ? 'applied' : 'pending (re-run with --apply)'}.`);
}

run().catch((err) => {
  console.error('Fatal error reconciling Paddle catalog:', err.message);
  process.exit(1);
});

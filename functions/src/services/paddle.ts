import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk';
import type { EventEntity } from '@paddle/paddle-node-sdk';
import { getEnvConfig } from '../config/env';
import { getMonthlyCredits, PRICING, type SubscriptionPlan } from '../config/pricing';

// Re-export so callers don't need a direct SDK dependency.
export { EventName };
export type { EventEntity };

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _paddle: Paddle | undefined;

/**
 * The Paddle environment must be stated explicitly and agree with the API key, so production
 * code can never be pointed at sandbox (or the reverse) by omission or a copy-paste slip.
 * Sandbox keys start `pdl_sdbx_`, live keys `pdl_live_`.
 */
export function requirePaddleEnvironment(
  environment: string | undefined,
  apiKey: string
): 'sandbox' | 'production' {
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error(
      'PADDLE_ENVIRONMENT must be explicitly "sandbox" or "production" — there is no default.'
    );
  }
  const keyEnv = apiKey.startsWith('pdl_sdbx_')
    ? 'sandbox'
    : apiKey.startsWith('pdl_live_')
      ? 'production'
      : undefined;
  if (keyEnv && keyEnv !== environment) {
    throw new Error(
      `PADDLE_ENVIRONMENT is "${environment}" but PADDLE_API_KEY is a ${keyEnv} key.`
    );
  }
  return environment;
}

/**
 * Returns a lazily-initialised Paddle SDK client.
 *
 * Throws loudly if PADDLE_API_KEY is not configured — callers must not
 * silently proceed without a key (any request would fail at the network
 * layer anyway, but a clear local error is faster to diagnose).
 */
export function getPaddleClient(): Paddle {
  if (_paddle) return _paddle;

  const config = getEnvConfig();
  if (!config.PADDLE_API_KEY) {
    throw new Error('Paddle credentials not configured (PADDLE_API_KEY)');
  }
  const environment = requirePaddleEnvironment(config.PADDLE_ENVIRONMENT, config.PADDLE_API_KEY);

  _paddle = new Paddle(config.PADDLE_API_KEY, {
    environment: environment === 'production' ? Environment.production : Environment.sandbox,
  });

  return _paddle;
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Verifies a Paddle webhook's HMAC-SHA256 signature and unmarshals the body
 * into a typed EventEntity.
 *
 * The `paddle-signature` header sent by Paddle looks like:
 *   ts=1698765432;h1=<hex-sha256>
 *
 * The SDK's `webhooks.unmarshal()` handles both the validation and the
 * deserialization — callers should treat the returned entity as authoritative.
 *
 * Throws if the signature is invalid or the secret is not configured, so
 * the caller can respond 400/401 and never process a tampered payload.
 */
export async function verifyAndUnmarshalWebhook(
  rawBody: string,
  signatureHeader: string
): Promise<EventEntity> {
  const config = getEnvConfig();
  if (!config.PADDLE_WEBHOOK_SECRET) {
    throw new Error('Paddle webhook secret not configured (PADDLE_WEBHOOK_SECRET)');
  }

  const paddle = getPaddleClient();
  // SDK throws on invalid signature — we let that propagate to the caller.
  return paddle.webhooks.unmarshal(rawBody, config.PADDLE_WEBHOOK_SECRET, signatureHeader);
}

// ---------------------------------------------------------------------------
// Price-ID lookup
// ---------------------------------------------------------------------------

export type PaddleBillingCycle = 'monthly' | 'yearly';
export type PaidPlan = Exclude<SubscriptionPlan, 'free'>;

/** What a Paddle price ID means in Mitra terms. */
export type PaddlePriceMeaning =
  | { kind: 'plan'; planId: PaidPlan; billingCycle: PaddleBillingCycle }
  | { kind: 'credit_pack'; credits: number };

const PLAN_PRICE_ENV_KEYS = {
  starter: { monthly: 'PADDLE_PRICE_ID_STARTER_MONTHLY', yearly: 'PADDLE_PRICE_ID_STARTER_YEARLY' },
  business: {
    monthly: 'PADDLE_PRICE_ID_BUSINESS_MONTHLY',
    yearly: 'PADDLE_PRICE_ID_BUSINESS_YEARLY',
  },
  pro: { monthly: 'PADDLE_PRICE_ID_PRO_MONTHLY', yearly: 'PADDLE_PRICE_ID_PRO_YEARLY' },
  agency: { monthly: 'PADDLE_PRICE_ID_AGENCY_MONTHLY', yearly: 'PADDLE_PRICE_ID_AGENCY_YEARLY' },
} as const satisfies Record<
  PaidPlan,
  Record<PaddleBillingCycle, keyof ReturnType<typeof getEnvConfig>>
>;

const PACK_PRICE_ENV_KEYS = {
  500: 'PADDLE_PRICE_ID_PACK_500',
  1200: 'PADDLE_PRICE_ID_PACK_1200',
  3000: 'PADDLE_PRICE_ID_PACK_3000',
} as const satisfies Record<number, keyof ReturnType<typeof getEnvConfig>>;

/**
 * Price ID for a plan + billing cycle. Throws if unconfigured — there is
 * deliberately no mock/fallback ID: a missing price must fail the checkout
 * closed rather than create a transaction against a nonexistent price.
 */
export function getPaddlePlanPriceId(planId: PaidPlan, cycle: PaddleBillingCycle): string {
  const key = PLAN_PRICE_ENV_KEYS[planId]?.[cycle];
  const priceId = key ? getEnvConfig()[key] : undefined;
  if (typeof priceId !== 'string' || !priceId) {
    throw new Error(`Paddle price ID not configured for ${planId}/${cycle} (${key ?? 'unknown'})`);
  }
  return priceId;
}

/** Price ID for a credit pack. Only packs defined in pricing.ts are purchasable. */
export function getPaddlePackPriceId(credits: number): string {
  const key = (PACK_PRICE_ENV_KEYS as Record<number, string | undefined>)[credits];
  const priceId = key ? (getEnvConfig() as Record<string, unknown>)[key] : undefined;
  if (typeof priceId !== 'string' || !priceId) {
    throw new Error(
      `Paddle price ID not configured for credit pack ${credits} (${key ?? 'unknown'})`
    );
  }
  return priceId;
}

/**
 * Reverse lookup: Paddle price ID -> Mitra meaning, from OUR env config only.
 * The webhook uses this (not client- or Paddle-supplied custom_data) to decide
 * what to grant, so credits can only ever come from a price we configured.
 */
export function resolvePaddlePrice(
  priceId: string | null | undefined
): PaddlePriceMeaning | undefined {
  if (!priceId) return undefined;
  const config = getEnvConfig() as Record<string, unknown>;

  for (const [planId, cycles] of Object.entries(PLAN_PRICE_ENV_KEYS) as [
    PaidPlan,
    Record<PaddleBillingCycle, string>,
  ][]) {
    for (const [billingCycle, key] of Object.entries(cycles) as [PaddleBillingCycle, string][]) {
      if (config[key] === priceId) return { kind: 'plan', planId, billingCycle };
    }
  }
  for (const [credits, key] of Object.entries(PACK_PRICE_ENV_KEYS)) {
    if (config[key] === priceId) return { kind: 'credit_pack', credits: Number(credits) };
  }
  return undefined;
}

/**
 * Customer-facing wording for a history row. Paddle's internal `origin` values ("api", "web",
 * "subscription_recurring") must never leak into the UI.
 */
export function describePlanPurchase(
  origin: string,
  planId: string,
  billingCycle: PaddleBillingCycle
): string {
  const plan = `${planId.charAt(0).toUpperCase()}${planId.slice(1)} plan (${billingCycle})`;
  switch (origin) {
    case 'subscription_recurring':
      return `${plan} — renewal`;
    case 'subscription_update':
      return `${plan} — plan change`;
    case 'subscription_charge':
      return `${plan} — additional charge`;
    default: // 'web' | 'api': the first purchase
      return `${plan} — subscription started`;
  }
}

export function describeCreditPack(credits: number): string {
  return `${credits.toLocaleString('en-IN')} credit top-up`;
}

/** Credit pack sizes that may be sold (single source of truth: pricing.ts). */
export function isValidCreditPack(credits: number): boolean {
  return PRICING.topUpPacks.some((p) => p.credits === credits);
}

/** Returns the number of monthly credits that belong to a given plan. */
export function creditsForPlan(planId: SubscriptionPlan): number {
  return getMonthlyCredits(planId);
}

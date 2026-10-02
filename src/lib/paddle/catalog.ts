/**
 * Maps Mitra plans / credit packs to Paddle price IDs for the browser.
 *
 * Business rules (names, features, credit amounts, monthly allowances) stay in
 * `@/lib/config/pricing` (mirror of functions/src/config/pricing.ts). This file only adds
 * the Paddle price IDs — IDs are not secrets. It deliberately holds NO amounts: the amount
 * a customer sees comes from Paddle PricePreview, never from here.
 *
 * The server (createPaddleCheckout) resolves its own price ID from Functions config and
 * returns it; the client refuses to open checkout if it differs from the ID it displayed,
 * so "price shown" and "price charged" cannot silently diverge.
 */
import type { SubscriptionPlan } from '@/lib/config/pricing';

export type BillingInterval = 'month' | 'year';
export type PaidPlan = Exclude<SubscriptionPlan, 'free'>;

export interface MitraTier {
  plan: SubscriptionPlan;
  priceId?: { month?: string; year?: string };
}

export interface CreditPack {
  credits: number;
  priceId?: string;
}

export interface PaddleCatalog {
  tiers: Record<SubscriptionPlan, MitraTier>;
  packs: CreditPack[];
}

/** Packs sold, in display order. Must match functions pricing.ts `topUpPacks`. */
export const CREDIT_PACK_SIZES = [500, 1200, 3000] as const;

const PRICE_ID_PATTERN = /^pri_[a-z0-9]+$/;

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && PRICE_ID_PATTERN.test(v) ? v : undefined;
}

export interface PaddlePriceEnv {
  STARTER_MONTHLY?: string;
  STARTER_YEARLY?: string;
  BUSINESS_MONTHLY?: string;
  BUSINESS_YEARLY?: string;
  PRO_MONTHLY?: string;
  PRO_YEARLY?: string;
  AGENCY_MONTHLY?: string;
  AGENCY_YEARLY?: string;
  PACK_500?: string;
  PACK_1200?: string;
  PACK_3000?: string;
}

export function buildPaddleCatalog(env: PaddlePriceEnv): PaddleCatalog {
  const packIds: Record<number, string | undefined> = {
    500: clean(env.PACK_500),
    1200: clean(env.PACK_1200),
    3000: clean(env.PACK_3000),
  };
  return {
    tiers: {
      // Free has no Paddle price by design — it never opens checkout.
      free: { plan: 'free' },
      starter: {
        plan: 'starter',
        priceId: { month: clean(env.STARTER_MONTHLY), year: clean(env.STARTER_YEARLY) },
      },
      business: {
        plan: 'business',
        priceId: { month: clean(env.BUSINESS_MONTHLY), year: clean(env.BUSINESS_YEARLY) },
      },
      pro: {
        plan: 'pro',
        priceId: { month: clean(env.PRO_MONTHLY), year: clean(env.PRO_YEARLY) },
      },
      agency: {
        plan: 'agency',
        priceId: { month: clean(env.AGENCY_MONTHLY), year: clean(env.AGENCY_YEARLY) },
      },
    },
    packs: CREDIT_PACK_SIZES.map((credits) => ({ credits, priceId: packIds[credits] })),
  };
}

/** Build-time catalog. `process.env.NEXT_PUBLIC_*` references stay literal for Next inlining. */
export function getPaddleCatalog(): PaddleCatalog {
  return buildPaddleCatalog({
    STARTER_MONTHLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY'],
    STARTER_YEARLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_YEARLY'],
    BUSINESS_MONTHLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_BUSINESS_MONTHLY'],
    BUSINESS_YEARLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_BUSINESS_YEARLY'],
    PRO_MONTHLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_MONTHLY'],
    PRO_YEARLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_PRO_YEARLY'],
    AGENCY_MONTHLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_AGENCY_MONTHLY'],
    AGENCY_YEARLY: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_AGENCY_YEARLY'],
    PACK_500: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_500'],
    PACK_1200: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_1200'],
    PACK_3000: process.env['NEXT_PUBLIC_PADDLE_PRICE_ID_PACK_3000'],
  });
}

/** Exact price ID for a plan + interval, or undefined (Free, or not configured). */
export function getTierPriceId(
  catalog: PaddleCatalog,
  plan: SubscriptionPlan,
  interval: BillingInterval
): string | undefined {
  return catalog.tiers[plan]?.priceId?.[interval];
}

export function getPackPriceId(catalog: PaddleCatalog, credits: number): string | undefined {
  return catalog.packs.find((p) => p.credits === credits)?.priceId;
}

/** Every configured price ID — what PricePreview is asked about. */
export function allPriceIds(catalog: PaddleCatalog): string[] {
  const ids: string[] = [];
  for (const tier of Object.values(catalog.tiers)) {
    if (tier.priceId?.month) ids.push(tier.priceId.month);
    if (tier.priceId?.year) ids.push(tier.priceId.year);
  }
  for (const pack of catalog.packs) if (pack.priceId) ids.push(pack.priceId);
  return ids;
}

export function intervalOf(cycle: 'monthly' | 'yearly'): BillingInterval {
  return cycle === 'yearly' ? 'year' : 'month';
}

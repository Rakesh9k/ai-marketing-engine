/**
 * Paddle price-ID mapping: must derive from pricing.ts + env config only, round-trip
 * (checkout price -> webhook meaning), and fail closed — never fall back to a mock ID.
 */
process.env['PADDLE_PRICE_ID_STARTER_MONTHLY'] = 'pri_s_m';
process.env['PADDLE_PRICE_ID_STARTER_YEARLY'] = 'pri_s_y';
process.env['PADDLE_PRICE_ID_BUSINESS_MONTHLY'] = 'pri_b_m';
process.env['PADDLE_PRICE_ID_BUSINESS_YEARLY'] = 'pri_b_y';
process.env['PADDLE_PRICE_ID_PRO_MONTHLY'] = 'pri_p_m';
process.env['PADDLE_PRICE_ID_PRO_YEARLY'] = 'pri_p_y';
process.env['PADDLE_PRICE_ID_AGENCY_MONTHLY'] = 'pri_a_m';
process.env['PADDLE_PRICE_ID_AGENCY_YEARLY'] = 'pri_a_y';
process.env['PADDLE_PRICE_ID_PACK_500'] = 'pri_k_500';
process.env['PADDLE_PRICE_ID_PACK_1200'] = 'pri_k_1200';
// PACK_3000 intentionally unset.

import { PRICING } from '../config/pricing';
import {
  getPaddlePlanPriceId,
  getPaddlePackPriceId,
  resolvePaddlePrice,
  isValidCreditPack,
  requirePaddleEnvironment,
  describePlanPurchase,
  describeCreditPack,
  type PaidPlan,
} from './paddle';

describe('paddle price mapping', () => {
  const paidPlans = (
    Object.keys(PRICING.subscriptionTiers) as Array<keyof typeof PRICING.subscriptionTiers>
  ).filter((p) => p !== 'free') as PaidPlan[];

  it('covers every paid plan in pricing.ts (including Pro), both cycles, and round-trips', () => {
    expect(paidPlans).toEqual(expect.arrayContaining(['starter', 'business', 'pro', 'agency']));
    for (const plan of paidPlans) {
      for (const cycle of ['monthly', 'yearly'] as const) {
        const id = getPaddlePlanPriceId(plan, cycle);
        expect(resolvePaddlePrice(id)).toEqual({ kind: 'plan', planId: plan, billingCycle: cycle });
      }
    }
  });

  it('round-trips configured credit packs and only sells packs defined in pricing.ts', () => {
    expect(resolvePaddlePrice(getPaddlePackPriceId(500))).toEqual({
      kind: 'credit_pack',
      credits: 500,
    });
    expect(resolvePaddlePrice(getPaddlePackPriceId(1200))).toEqual({
      kind: 'credit_pack',
      credits: 1200,
    });
    for (const pack of PRICING.topUpPacks) expect(isValidCreditPack(pack.credits)).toBe(true);
    expect(isValidCreditPack(777)).toBe(false);
  });

  it('fails closed on unconfigured prices (no mock fallback)', () => {
    expect(() => getPaddlePackPriceId(3000)).toThrow(/not configured/);
    expect(() => getPaddlePackPriceId(777)).toThrow(/not configured/);
    expect(() => getPaddlePlanPriceId('free' as PaidPlan, 'monthly')).toThrow(/not configured/);
  });

  it('does not resolve unknown, empty or mock price IDs', () => {
    expect(resolvePaddlePrice('pri_unknown')).toBeUndefined();
    expect(resolvePaddlePrice('pri_mock_starter')).toBeUndefined();
    expect(resolvePaddlePrice('')).toBeUndefined();
    expect(resolvePaddlePrice(undefined)).toBeUndefined();
    expect(resolvePaddlePrice(null)).toBeUndefined();
  });
});

describe('requirePaddleEnvironment — explicit, never defaulted', () => {
  it('throws when the environment is missing or not sandbox/production', () => {
    for (const bad of [undefined, '', 'live', 'prod', 'Sandbox']) {
      expect(() => requirePaddleEnvironment(bad, 'pdl_sdbx_apikey_x')).toThrow(/no default/);
    }
  });

  it('accepts a matching environment and key', () => {
    expect(requirePaddleEnvironment('sandbox', 'pdl_sdbx_apikey_x')).toBe('sandbox');
    expect(requirePaddleEnvironment('production', 'pdl_live_apikey_x')).toBe('production');
  });

  it('refuses a key that belongs to the other environment', () => {
    expect(() => requirePaddleEnvironment('production', 'pdl_sdbx_apikey_x')).toThrow(
      /sandbox key/
    );
    expect(() => requirePaddleEnvironment('sandbox', 'pdl_live_apikey_x')).toThrow(
      /production key/
    );
  });
});

describe('history wording never leaks Paddle internals', () => {
  it('describes first purchase, renewal, plan change and extra charge in customer terms', () => {
    expect(describePlanPurchase('web', 'starter', 'monthly')).toBe(
      'Starter plan (monthly) — subscription started'
    );
    expect(describePlanPurchase('api', 'business', 'yearly')).toBe(
      'Business plan (yearly) — subscription started'
    );
    expect(describePlanPurchase('subscription_recurring', 'pro', 'monthly')).toBe(
      'Pro plan (monthly) — renewal'
    );
    expect(describePlanPurchase('subscription_update', 'agency', 'yearly')).toBe(
      'Agency plan (yearly) — plan change'
    );
    expect(describePlanPurchase('subscription_charge', 'starter', 'monthly')).toContain(
      'additional charge'
    );
    for (const origin of ['web', 'api', 'subscription_recurring', 'subscription_update']) {
      const text = describePlanPurchase(origin, 'starter', 'monthly');
      expect(text).not.toMatch(/Paddle|api:|web:|subscription_/);
    }
  });

  it('describes credit packs', () => {
    expect(describeCreditPack(500)).toBe('500 credit top-up');
    expect(describeCreditPack(1200)).toBe('1,200 credit top-up');
    expect(describeCreditPack(3000)).toBe('3,000 credit top-up');
  });
});

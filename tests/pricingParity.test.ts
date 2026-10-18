/**
 * Catalog parity. The backend (functions/src/config/pricing.ts) is the single source of
 * truth for the prices used by Cashfree checkout. These tests fail when frontend display
 * mirrors drift from the server configuration.
 */
import {
  PRICING,
  ENTITLEMENT_COSTS as BACKEND_ENTITLEMENT_COSTS,
} from '../functions/src/config/pricing';
import {
  PLANS,
  CREDIT_COSTS,
  ENTITLEMENT_COSTS,
  CAMPAIGN_GENERATION_COST,
  CREDIT_PACKS,
} from '@/lib/config/pricing';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { ESTIMATED_CAMPAIGN_GENERATION_CREDITS } from '@/features/campaign/constants';

const backendPlans = Object.entries(PRICING.subscriptionTiers);

describe('plan catalog parity (frontend mirrors vs backend pricing.ts)', () => {
  it('has exactly the same plan ids', () => {
    const ids = backendPlans.map(([id]) => id).sort();
    expect(PLANS.map((p) => p.id).sort()).toEqual(ids);
    expect(Object.keys(PLAN_DETAILS).sort()).toEqual(ids);
  });

  it.each(backendPlans)('%s: amounts, credits and quotas match lib/config/pricing', (id, tier) => {
    const plan = PLANS.find((p) => p.id === id)!;
    expect(plan.monthlyPrice).toBe(tier.priceINR);
    expect(plan.yearlyPrice).toBe(tier.yearlyPriceINR);
    expect(plan.credits).toBe(tier.monthlyCredits);
    expect(plan.monthlyReels).toBe(tier.monthlyReels);
    expect(plan.monthlyCreatives).toBe(tier.monthlyCreatives);
    expect(plan.monthlyStories).toBe(tier.monthlyStories);
    expect(plan.maxBusinesses).toBe(tier.maxBusinesses);
  });

  it.each(backendPlans)('%s: amounts, credits and quotas match planDetails', (id, tier) => {
    const d = PLAN_DETAILS[id as keyof typeof PLAN_DETAILS];
    expect(d.price).toBe(tier.priceINR);
    expect(d.yearlyPrice).toBe(tier.yearlyPriceINR);
    expect(d.credits).toBe(tier.monthlyCredits);
    expect(d.reels).toBe(tier.monthlyReels);
    expect(d.creatives).toBe(tier.monthlyCreatives);
    expect(d.stories).toBe(tier.monthlyStories);
    expect(d.maxBusinesses).toBe(tier.maxBusinesses);
  });

  it('derived display fields (monthlyIfYearly, yearlySaving) agree with the amounts', () => {
    for (const p of PLANS) {
      expect(p.monthlyIfYearly).toBe(Math.round(p.yearlyPrice / 12));
      expect(p.yearlySaving).toBe(p.monthlyPrice * 12 - p.yearlyPrice);
    }
  });

  it('paid plans charge less yearly than 12 monthly payments; Free is zero', () => {
    for (const [id, tier] of backendPlans) {
      if (id === 'free') {
        expect([tier.priceINR, tier.yearlyPriceINR]).toEqual([0, 0]);
      } else {
        expect(tier.yearlyPriceINR).toBeGreaterThan(0);
        expect(tier.yearlyPriceINR).toBeLessThan(tier.priceINR * 12);
      }
    }
  });

  it('the plan ladder strictly increases in price, credits and creatives', () => {
    const order = ['free', 'starter', 'business', 'pro', 'agency'] as const;
    for (let i = 1; i < order.length; i++) {
      const prev = PRICING.subscriptionTiers[order[i - 1]!];
      const cur = PRICING.subscriptionTiers[order[i]!];
      expect(cur.priceINR).toBeGreaterThan(prev.priceINR);
      expect(cur.monthlyCredits).toBeGreaterThan(prev.monthlyCredits);
      expect(cur.monthlyCreatives).toBeGreaterThan(prev.monthlyCreatives);
    }
  });
});

describe('credit pack and credit-cost parity', () => {
  it('the Cashfree pack cards show exactly the backend packs: credits AND rupee price (the server prices the order)', () => {
    expect(CREDIT_PACKS.map((p) => ({ credits: p.credits, priceINR: p.priceINR }))).toEqual(
      PRICING.topUpPacks.map((p) => ({ credits: p.credits, priceINR: p.priceINR }))
    );
  });

  it('no pack costs more rupees than the credits it grants (1 credit = ₹1)', () => {
    for (const p of PRICING.topUpPacks) {
      expect(p.priceINR).toBeLessThanOrEqual(p.credits * PRICING.creditValueINR);
    }
  });

  it('frontend CREDIT_COSTS match backend PRICING', () => {
    expect(CREDIT_COSTS.BASE_CAMPAIGN).toBe(PRICING.campaignBaseCredits);
    expect(CREDIT_COSTS.REGENERATION).toBe(PRICING.regenerationCredits);
    expect(CREDIT_COSTS.IMAGE_GENERATION).toBe(PRICING.imageGenerationCredits);
    expect(CREDIT_COSTS.STYLE_ANALYSIS).toBe(PRICING.styleAnalysisCredits);
    expect(CREDIT_COSTS.REEL_GENERATION).toBe(PRICING.reelGenerationCredits);
  });

  it('frontend ENTITLEMENT_COSTS equal backend ENTITLEMENT_COSTS', () => {
    expect(ENTITLEMENT_COSTS).toEqual(BACKEND_ENTITLEMENT_COSTS);
  });

  it('a campaign generation costs what the backend reserves and fits inside every plan allowance', () => {
    // Backend is authoritative: base + 2 images.
    expect(CAMPAIGN_GENERATION_COST).toBe(
      PRICING.campaignBaseCredits + 2 * PRICING.imageGenerationCredits
    );
    expect(CAMPAIGN_GENERATION_COST).toBe(100);
    expect(PLAN_DETAILS.free.credits).toBe(PRICING.subscriptionTiers.free.monthlyCredits);
    expect(ESTIMATED_CAMPAIGN_GENERATION_CREDITS).toBe(CAMPAIGN_GENERATION_COST);
    for (const [id, tier] of backendPlans) {
      if (id !== 'free') {
        expect(tier.monthlyCredits).toBeGreaterThanOrEqual(CAMPAIGN_GENERATION_COST);
      }
    }
  });

  it('the Free plan card states what Free delivers: one-time 140 credits (no trial, no monthly refill), 3 stories, no AI video', () => {
    const free = PLAN_DETAILS.free;
    expect(free.stories).toBe(3);
    expect(free.reels).toBe(0);
    expect(free.credits).toBe(140);
    const copy = free.features.join(' | ');
    expect(copy).toMatch(/140 free credits to start, once, no card needed/);
    expect(copy).toMatch(/1 poster, 3 stories and 1 reel concept/);
    expect(copy).toMatch(/Free credits do not expire/);
    expect(copy).not.toMatch(/every month|trial|7[- ]day|seven/i);
    expect(copy).toMatch(/AI video reels on paid plans/);
    expect(copy).not.toMatch(/0 AI reels/);
  });
});

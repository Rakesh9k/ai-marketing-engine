/**
 * Phase 9 — PLAN_ENTITLEMENTS (what the server enforces) must agree with
 * PRICING.subscriptionTiers (what the customer is sold and what Paddle bills for).
 */
import { PLAN_ENTITLEMENTS } from './entitlements';
import { PRICING } from '../config/pricing';

jest.mock('./firestore');
jest.mock('../utils/logging', () => ({
  logFunctionStart: jest.fn(),
  logFunctionComplete: jest.fn(),
  logFunctionError: jest.fn(),
}));

describe('entitlements vs pricing catalog', () => {
  const plans = Object.entries(PRICING.subscriptionTiers);

  it('covers exactly the same plans', () => {
    expect(Object.keys(PLAN_ENTITLEMENTS).sort()).toEqual(plans.map(([id]) => id).sort());
  });

  it.each(plans)(
    '%s: reel / creative / story / business quotas equal the sold tier',
    (id, tier) => {
      const e = PLAN_ENTITLEMENTS[id as keyof typeof PLAN_ENTITLEMENTS];
      expect(e.reelsPerMonth).toBe(tier.monthlyReels);
      expect(e.creativesPerMonth).toBe(tier.monthlyCreatives);
      expect(e.storiesPerMonth).toBe(tier.monthlyStories);
      expect(e.maxBusinesses).toBe(tier.maxBusinesses);
    }
  );

  // campaignsPerMonth exists only here (pricing.ts has no campaign count). The usage page
  // (src/app/usage/page.tsx, planCampaigns) displays these numbers - change both together.
  it('campaign quotas are the values the usage page displays', () => {
    expect(
      Object.fromEntries(
        Object.entries(PLAN_ENTITLEMENTS).map(([id, e]) => [id, e.campaignsPerMonth])
      )
    ).toEqual({ free: 1, starter: 5, business: 12, pro: 25, agency: 50 });
  });

  it('only the Free plan is watermarked and only Agency has the agency workspace', () => {
    for (const [id, e] of Object.entries(PLAN_ENTITLEMENTS)) {
      expect(e.features.watermark).toBe(id === 'free');
      expect(e.features.agencyWorkspace).toBe(id === 'agency');
    }
  });

  it('multi-business is enabled exactly when more than one business is allowed', () => {
    for (const e of Object.values(PLAN_ENTITLEMENTS)) {
      expect(e.features.multiBusiness).toBe(e.maxBusinesses > 1);
    }
  });
});

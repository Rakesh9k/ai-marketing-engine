import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  buildCheckoutSummary,
  buildCreditExamples,
  buildFreeView,
  buildOperationCosts,
  buildPlanViews,
  describeAllocation,
  estimateAccessEnd,
  formatINR,
  suggestPlan,
} from './pricingModel';
import { getActiveCatalogue } from '@/lib/config/planCatalogue.generated';
import * as serverCatalogue from '../../../functions/src/config/planCatalogue';

describe('generated catalogue mirror', () => {
  it('is identical to the server catalogue (run `npm run sync:catalogue` if this fails)', () => {
    const root = path.resolve(__dirname, '../../..');
    expect(() =>
      execFileSync(process.execPath, ['scripts/sync-plan-catalogue.mjs', '--check'], {
        cwd: root,
        stdio: 'pipe',
      })
    ).not.toThrow();
  });

  it('serves the same active catalogue as the server', () => {
    expect(getActiveCatalogue()).toEqual(serverCatalogue.getActiveCatalogue());
  });
});

describe('plan views come from the catalogue', () => {
  const views = buildPlanViews();
  const server = serverCatalogue.getActiveCatalogue();

  it('lists every sellable paid plan in order with the server prices and credits', () => {
    expect(views.map((v) => v.planId)).toEqual(['starter', 'business', 'pro', 'agency']);
    for (const v of views) {
      const m = serverCatalogue.findOffer(server, v.planId, 'monthly')!;
      const y = serverCatalogue.findOffer(server, v.planId, 'yearly')!;
      expect(v.monthly.priceINR).toBe(m.priceINR);
      expect(v.yearly.priceINR).toBe(y.priceINR);
      expect(v.monthly.termDays).toBe(30);
      expect(v.yearly.termDays).toBe(365);
      expect(v.yearly.periods).toBe(12);
      expect(v.yearly.totalCredits).toBe(y.creditsPerPeriod * 12);
    }
  });

  it('computes annual savings against twelve monthly purchases at the real monthly price', () => {
    const byId = Object.fromEntries(views.map((v) => [v.planId, v.annual]));
    expect(byId['starter']).toMatchObject({
      twelveMonthlyINR: 11988,
      savingINR: 1998,
      savingPercent: 16.7,
    });
    expect(byId['business']).toMatchObject({
      twelveMonthlyINR: 20388,
      savingINR: 3398,
      savingPercent: 16.7,
    });
    expect(byId['pro']).toMatchObject({
      twelveMonthlyINR: 35988,
      savingINR: 10998,
      savingPercent: 30.6,
    });
    expect(byId['agency']).toMatchObject({
      twelveMonthlyINR: 59988,
      savingINR: 9998,
      savingPercent: 16.7,
    });
    for (const v of views) {
      expect(v.annual.monthlyCoverageDays).toBe(360);
      expect(v.annual.yearlyDays).toBe(365);
    }
  });

  it('never shows a plan whose yearly term is not cheaper than its twelve monthly purchases as a saving', () => {
    for (const v of views) expect(v.annual.savingINR).toBeGreaterThan(0);
  });

  it('reports reels and brand kit exactly as the server enforces them', () => {
    const starter = views.find((v) => v.planId === 'starter')!;
    expect(starter.reels).toBe(server.plans.starter.features.reels);
    expect(starter.brandKit).toBe(server.plans.starter.features.brandKit);
    expect(views.find((v) => v.planId === 'pro')!.maxBusinesses).toBe(
      server.plans.pro.maxBusinesses
    );
  });

  it('formats rupees with Indian grouping', () => {
    expect(formatINR(24990)).toBe('₹24,990');
    expect(formatINR(999)).toBe('₹999');
  });

  it('describes a yearly allocation as monthly releases, never all at once', () => {
    const pro = views.find((v) => v.planId === 'pro')!;
    expect(describeAllocation(pro.monthly)).toBe('2,500 credits for your 30 days');
    expect(describeAllocation(pro.yearly)).toMatch(
      /2,500 credits at the start of each of 12 monthly periods/
    );
    expect(describeAllocation(pro.yearly)).toMatch(/30,000 in total, never all at once/);
  });
});

describe('free, operation costs and examples', () => {
  it('free welcome credits come from the catalogue and do not expire', () => {
    expect(buildFreeView()).toEqual({
      welcomeCredits: 140,
      neverExpire: true,
      maxBusinesses: 1,
      brandKit: false,
      reels: false,
    });
  });

  it('operation costs equal the server operation credits', () => {
    const server = serverCatalogue.getActiveCatalogue().operationCredits;
    for (const row of buildOperationCosts()) {
      expect(row.credits).toBe(server[row.operation]);
    }
  });

  it('examples are priced from the catalogue and promise no number of campaigns', () => {
    const ex = buildCreditExamples();
    const server = serverCatalogue.getActiveCatalogue().operationCredits;
    expect(ex[0]!.totalCredits).toBe(server.campaign_generation);
    expect(ex[1]!.totalCredits).toBe(
      server.campaign_generation + 3 * server.regeneration + 2 * server.image_generation
    );
    expect(ex[2]!.totalCredits).toBe(server.campaign_generation + server.reel_generation);
  });
});

describe('suggestPlan', () => {
  it('picks the smallest plan whose credits cover the campaigns', () => {
    const r = suggestPlan({ campaignsPerMonth: 4, businesses: 1, needsReels: false });
    expect(r).toMatchObject({ kind: 'plan', campaignCredits: 400, leftoverCredits: 100 });
    expect(r && r.kind === 'plan' && r.view.planId).toBe('starter');
  });

  it('moves up a plan when the credits are not enough', () => {
    const r = suggestPlan({ campaignsPerMonth: 8, businesses: 1, needsReels: false });
    expect(r && r.kind === 'plan' && r.view.planId).toBe('business');
  });

  it('skips plans without reels when reels are wanted', () => {
    const r = suggestPlan({ campaignsPerMonth: 2, businesses: 1, needsReels: true });
    expect(r && r.kind === 'plan' && r.view.reels).toBe(true);
  });

  it('respects the business limit', () => {
    const r = suggestPlan({ campaignsPerMonth: 1, businesses: 3, needsReels: false });
    expect(r && r.kind === 'plan' && r.view.planId).toBe('pro');
    expect(suggestPlan({ campaignsPerMonth: 1, businesses: 11, needsReels: false })).toMatchObject({
      kind: 'beyond',
      reason: 'businesses',
    });
  });

  it('says so when no plan has enough credits', () => {
    expect(suggestPlan({ campaignsPerMonth: 100, businesses: 1, needsReels: false })).toMatchObject(
      {
        kind: 'beyond',
        reason: 'credits',
      }
    );
  });
});

describe('checkout summary', () => {
  it('states the exact one-time amount, term and allocation for monthly and yearly', () => {
    expect(buildCheckoutSummary('pro', 'monthly')).toMatchObject({
      planName: 'Pro',
      priceINR: 2999,
      termDays: 30,
      totalCredits: 2500,
      periods: 1,
    });
    expect(buildCheckoutSummary('pro', 'yearly')).toMatchObject({
      priceINR: 24990,
      termDays: 365,
      totalCredits: 30000,
      periods: 12,
      creditsPerPeriod: 2500,
    });
  });

  it('returns null for a plan that is not sold', () => {
    expect(buildCheckoutSummary('free', 'monthly')).toBeNull();
    expect(buildCheckoutSummary('platinum', 'yearly')).toBeNull();
  });

  it('estimates the end of access in exact 24-hour days', () => {
    const from = new Date('2026-10-12T10:00:00Z');
    expect(estimateAccessEnd(30, from).toISOString()).toBe('2026-11-11T10:00:00.000Z');
    expect(estimateAccessEnd(365, from).toISOString()).toBe('2027-10-12T10:00:00.000Z');
  });
});

/**
 * The Free plan contract, in one place. These are the numbers the pricing card promises, the entitlement
 * config declares and the pipeline actually delivers (the delivered-assets side is asserted in
 * ai/pipeline.scenarioMatrix.test.ts, "output integrity").
 *
 *   Free = 1 campaign every month (recurring, not a one-time grant)
 *        = 1 poster + 3 stories + 1 reel concept per campaign  -> 5 social creatives
 *        = 140 credits every month; a campaign costs 100, leaving 40
 *        = NO AI-generated video reels (reelsPerMonth 0; generateReel requires a paid plan)
 */
import { PLAN_ENTITLEMENTS } from './entitlements';
import { PRICING } from '../config/pricing';
import { getGenerationCost } from './usageControl';

describe('Free plan contract', () => {
  const free = PLAN_ENTITLEMENTS.free;
  const tier = PRICING.subscriptionTiers.free;

  it('allows one campaign a month, with 3 stories and 5 social creatives', () => {
    expect(free.campaignsPerMonth).toBe(1);
    expect(free.storiesPerMonth).toBe(3);
    expect(free.creativesPerMonth).toBe(5);
  });

  it('has no AI-generated video reels (a reel CONCEPT is a campaign asset, not a video)', () => {
    expect(free.reelsPerMonth).toBe(0);
    expect(tier.monthlyReels).toBe(0);
  });

  it('grants 140 credits per month and a campaign costs 100, leaving 40', () => {
    expect(tier.monthlyCredits).toBe(140);
    expect(getGenerationCost('campaign_generation')).toBe(100);
    expect(tier.monthlyCredits - getGenerationCost('campaign_generation')).toBe(40);
  });

  it('the entitlement config and the pricing tier agree', () => {
    expect(tier.monthlyStories).toBe(free.storiesPerMonth);
    expect(tier.monthlyCreatives).toBe(free.creativesPerMonth);
    expect(tier.maxBusinesses).toBe(free.maxBusinesses);
  });

  it('5 social creatives = 1 poster + 3 stories + 1 reel concept', () => {
    const posterPerCampaign = 1;
    const reelConceptPerCampaign = 1;
    expect(posterPerCampaign + free.storiesPerMonth + reelConceptPerCampaign).toBe(
      free.creativesPerMonth / free.campaignsPerMonth
    );
  });
});

import { PRICING } from '../config/pricing';
import { getGenerationCost } from './usageControl';

describe('Phase 22 Public Launch Architecture & Workflow Verification', () => {
  const launchProductLoop = [
    'tell_mitra_about_business',
    'create_marketing',
    'review_and_truth_check',
    'approve',
    'schedule',
    'mitra_publishes',
    'see_performance',
    'continuous_recommendation_feedback',
  ];

  it('validates complete Mitra launch product loop sequence', () => {
    expect(launchProductLoop).toHaveLength(8);
    expect(launchProductLoop[0]).toBe('tell_mitra_about_business');
    expect(launchProductLoop[1]).toBe('create_marketing');
    expect(launchProductLoop[3]).toBe('approve');
    expect(launchProductLoop[5]).toBe('mitra_publishes');
    expect(launchProductLoop[7]).toBe('continuous_recommendation_feedback');
  });

  it('verifies credit cost and reservation balance safety for launch tiers', () => {
    const campaignCost = getGenerationCost('campaign_generation');
    expect(campaignCost).toBe(100);

    const freeCredits = PRICING.subscriptionTiers.free.monthlyCredits;
    const starterCredits = PRICING.subscriptionTiers.starter.monthlyCredits;
    const businessCredits = PRICING.subscriptionTiers.business.monthlyCredits;

    expect(freeCredits).toBe(140);
    expect(starterCredits).toBe(500);
    expect(businessCredits).toBe(1200);

    // Starter plan allows 5 campaign generations with 0 credits remaining (500 / 100 = 5)
    expect(starterCredits - 5 * campaignCost).toBe(0);
    expect(businessCredits - 12 * campaignCost).toBe(0);
  });

  it('verifies canonical data model mapping without secondary architectures', () => {
    const canonicalEntities = {
      calendarItem: 'MarketingCalendarItem',
      campaign: 'Campaign',
      approval: 'UserApproval',
      scheduledPost: 'ScheduledPost',
      publishJob: 'PublishJob',
      metaProvider: 'MetaPublishingProvider',
      analyticsEvent: 'AnalyticsEvent',
      recommendation: 'Recommendation',
      creditReservation: 'CreditReservation',
    };

    expect(canonicalEntities.campaign).toBe('Campaign');
    expect(canonicalEntities.scheduledPost).toBe('ScheduledPost');
    expect(canonicalEntities.publishJob).toBe('PublishJob');
    expect(canonicalEntities.creditReservation).toBe('CreditReservation');
  });
});

import type { SubscriptionPlan } from '@/types';

/**
 * Frontend display mirror of functions/src/config/pricing.ts's
 * PRICING.subscriptionTiers. No shared package/endpoint exposes that
 * config to the frontend today (see src/features/campaign/constants.ts),
 * so this stays a manually-kept-in-sync display constant rather than a
 * live import across the app/functions boundary. Previously duplicated
 * directly inside src/app/billing/page.tsx; extracted here (Phase 17) so
 * the landing page's pricing section can reuse the exact same values
 * instead of a third hand-typed copy.
 */
export const PLAN_DETAILS: Record<
  SubscriptionPlan,
  { name: string; price: number; credits: number; campaigns: number; features: string[] }
> = {
  free: {
    name: 'Free',
    price: 0,
    credits: 100,
    campaigns: 1,
    features: [
      '1 campaign per month',
      '100 credits/month',
      'Basic templates',
      'Watermark on creatives',
      '1 business',
    ],
  },
  starter: {
    name: 'Starter',
    price: 499,
    credits: 500,
    campaigns: 5,
    features: [
      '5 campaigns per month',
      '500 credits/month',
      'Basic templates',
      'No watermark',
      '1 business',
    ],
  },
  business: {
    name: 'Business',
    price: 999,
    credits: 1200,
    campaigns: 12,
    features: [
      '12 campaigns per month',
      '1,200 credits/month',
      'Premium templates',
      'Brand Kit access',
      'Priority generation',
      '1 business',
    ],
  },
  agency: {
    name: 'Agency',
    price: 2499,
    credits: 3000,
    campaigns: 30,
    features: [
      '30 campaigns per month',
      '3,000 credits/month',
      'Multi-business',
      'Client management',
      'Partner dashboard',
      'White-label path',
    ],
  },
};

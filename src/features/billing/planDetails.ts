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
  {
    name: string;
    price: number;
    yearlyPrice: number;
    reels: number;
    creatives: number;
    stories: number;
    maxBusinesses: number;
    credits: number;
    features: string[];
  }
> = {
  free: {
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    reels: 0,
    creatives: 5,
    stories: 3,
    maxBusinesses: 1,
    credits: 140,
    features: [
      '140 free credits to start, once, no card needed: enough for your first full campaign (1 poster, 3 stories and 1 reel concept)',
      'Free credits do not expire',
      '5 social creatives',
      'AI video reels on paid plans',
      '1 business',
      'Business Brain',
      'Captions & copy',
    ],
  },
  starter: {
    name: 'Starter',
    price: 999,
    yearlyPrice: 9990,
    reels: 3,
    creatives: 15,
    stories: 9,
    maxBusinesses: 1,
    credits: 500,
    features: [
      '3 AI reels / month',
      '15 social creatives / month',
      '9 stories / month',
      '1 business',
      'Business Brain',
      'Captions, hooks & CTAs',
    ],
  },
  business: {
    name: 'Business',
    price: 1699,
    yearlyPrice: 16990,
    reels: 10,
    creatives: 30,
    stories: 30,
    maxBusinesses: 1,
    credits: 1200,
    features: [
      '10 AI reels / month',
      '30 social creatives / month',
      '30 stories / month',
      '1 business',
      'Business Brain',
      'Content variations',
      'Captions, hooks & CTAs',
    ],
  },
  pro: {
    name: 'Pro',
    price: 2999,
    yearlyPrice: 24990,
    reels: 20,
    creatives: 60,
    stories: 60,
    maxBusinesses: 3,
    credits: 2500,
    features: [
      '20 AI reels / month',
      '60 social creatives / month',
      '60 stories / month',
      '3 businesses',
      'Full Business Brain',
      'Premium creative generation',
      'Advanced variations',
      'Captions, hooks & CTAs',
    ],
  },
  agency: {
    name: 'Agency',
    price: 4999,
    yearlyPrice: 49990,
    reels: 40,
    creatives: 120,
    stories: 120,
    maxBusinesses: 10,
    credits: 6000,
    features: [
      '40 AI reels / month',
      '120 social creatives / month',
      '120 stories / month',
      '10 businesses',
      'Agency workspace',
      'Client/brand management',
      'Priority processing',
      'Advanced generation',
    ],
  },
};

/**
 * Frontend-safe pricing constants — mirrors functions/src/config/pricing.ts.
 * This file must stay in sync with the backend config. If you change a price
 * in functions/src/config/pricing.ts, update this file too.
 *
 * Do NOT import from functions/ here — that code runs server-side only.
 */

export type SubscriptionPlan = 'free' | 'starter' | 'business' | 'pro' | 'agency';

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  business: 2,
  pro: 3,
  agency: 4,
};

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyIfYearly: number; // yearlyPrice / 12, for display
  yearlySaving: number; // (monthlyPrice * 12) - yearlyPrice
  monthlyReels: number;
  monthlyCreatives: number;
  monthlyStories: number;
  maxBusinesses: number;
  credits: number;
  popular: boolean;
  ctaText: string;
  features: string[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Mitra',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyIfYearly: 0,
    yearlySaving: 0,
    monthlyReels: 0,
    monthlyCreatives: 5,
    monthlyStories: 3,
    maxBusinesses: 1,
    credits: 140,
    popular: false,
    ctaText: 'Start Free',
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
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Get started with consistent content',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    monthlyIfYearly: Math.round(9990 / 12),
    yearlySaving: 999 * 12 - 9990, // 1,998
    monthlyReels: 3,
    monthlyCreatives: 15,
    monthlyStories: 9,
    maxBusinesses: 1,
    credits: 500,
    popular: false,
    ctaText: 'Choose Starter',
    features: [
      '3 AI reels / month',
      '15 social creatives / month',
      '9 stories / month',
      '1 business',
      'Business Brain',
      'Captions, hooks & CTAs',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For weekly marketing',
    monthlyPrice: 1699,
    yearlyPrice: 16990,
    monthlyIfYearly: Math.round(16990 / 12),
    yearlySaving: 1699 * 12 - 16990, // 3,398
    monthlyReels: 10,
    monthlyCreatives: 30,
    monthlyStories: 30,
    maxBusinesses: 1,
    credits: 1200,
    popular: false,
    ctaText: 'Choose Business',
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
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious content marketing',
    monthlyPrice: 2999,
    yearlyPrice: 24990,
    monthlyIfYearly: Math.round(24990 / 12), // 2,083
    yearlySaving: 2999 * 12 - 24990, // 10,998
    monthlyReels: 20,
    monthlyCreatives: 60,
    monthlyStories: 60,
    maxBusinesses: 3,
    credits: 2500,
    popular: true,
    ctaText: 'Choose Pro',
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
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For agencies & multiple brands',
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    monthlyIfYearly: Math.round(49990 / 12), // 4,166
    yearlySaving: 4999 * 12 - 49990, // 9,998
    monthlyReels: 40,
    monthlyCreatives: 120,
    monthlyStories: 120,
    maxBusinesses: 10,
    credits: 6000,
    popular: false,
    ctaText: 'Choose Agency',
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
];

export const CREDIT_COSTS = {
  BASE_CAMPAIGN: 60,
  REGENERATION: 10,
  IMAGE_GENERATION: 20,
  STYLE_ANALYSIS: 15,
  REEL_GENERATION: 80,
} as const;

/**
 * Credits for one campaign generation: the base campaign plus up to 2 AI images (MVP limit).
 * Mirrors functions/src/services/usageControl.ts getGenerationCost('campaign_generation') = 100
 * (60 base + 2 x 20). The backend config is authoritative; tests/pricingParity.test.ts pins this.
 */
export const CAMPAIGN_GENERATION_COST =
  CREDIT_COSTS.BASE_CAMPAIGN + 2 * CREDIT_COSTS.IMAGE_GENERATION;

export type EntitlementType = 'reel' | 'creative' | 'story';

export const ENTITLEMENT_COSTS: Record<EntitlementType, { credits: number }> = {
  reel: {
    credits: CREDIT_COSTS.REEL_GENERATION, // 80
  },
  creative: {
    credits: CREDIT_COSTS.IMAGE_GENERATION, // 20
  },
  story: {
    credits: 10,
  },
};

/**
 * One-time credit packs. Mirrors PRICING.topUpPacks in functions/src/config/pricing.ts (the server prices the
 * Cashfree order from that config; tests/pricingParity.test.ts pins the two together).
 */
export const CREDIT_PACKS = [
  { credits: 500, label: 'Small Pack', priceINR: 499 },
  { credits: 1200, label: 'Medium Pack', priceINR: 999 },
  { credits: 3000, label: 'Large Pack', priceINR: 1999 },
] as const;

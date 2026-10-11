/**
 * Phase 7: the generation pipeline previously made up to 32 sequential AI
 * image-provider calls per campaign (5 posters + 3 stories x 4 frames +
 * 3 reels x 5 frames) — verified against the actual code, not assumed. The
 * pipeline now makes exactly one AI image call per campaign (a single hero
 * image); poster/story variants are produced by deterministically
 * compositing verified campaign facts onto that same image (see
 * compositor.ts) rather than generating new AI images per format/frame.
 * This constant is the single server-enforced ceiling on real provider
 * spend per campaign generation — getGenerationCost()'s existing credit
 * price (still priced for up to 2 images, unchanged in this phase to avoid
 * a pricing-model change beyond this phase's scope) now covers actual usage
 * with headroom rather than under-charging a 32-call reality.
 */
export const MAX_IMAGE_GENERATION_CALLS_PER_CAMPAIGN = 1;

export const PRICING = {
  creditValueINR: 1,
  campaignBaseCredits: 60,
  regenerationCredits: 10,
  imageGenerationCredits: 20,
  calendarPlanningCredits: 10,
  premiumModelMultiplier: 2,
  maxCreditsPerCampaign: 300,
  // "Create a Reel": one Vision-AI scene-classification call per clip (up to
  // 10) + one structured edit-plan text call + one server-side ffmpeg render.
  // Priced below a full campaign_generation (140) since there is no DALL-E
  // image generation involved — the user supplies the real footage.
  reelGenerationCredits: 80,
  // Phase 8 Credits & Usage Enforcement Audit: analyzeReferenceStyle.ts made
  // a real (billable) Vision-AI call with no credit cost defined anywhere —
  // a genuine free/unlimited-AI-usage gap, not an intentional free feature.
  // Priced below imageGenerationCredits (20) since this is a single
  // analysis call, not a generation call — a new price point for a
  // previously-uncosted operation, not a change to any existing one.
  styleAnalysisCredits: 15,
  subscriptionTiers: {
    free: {
      monthlyCredits: 140,
      priceINR: 0,
      yearlyPriceINR: 0,
      monthlyReels: 0,
      monthlyCreatives: 5,
      monthlyStories: 3,
      maxBusinesses: 1,
    },
    starter: {
      monthlyCredits: 500,
      priceINR: 999,
      yearlyPriceINR: 9990,
      monthlyReels: 3,
      monthlyCreatives: 15,
      monthlyStories: 9,
      maxBusinesses: 1,
    },
    business: {
      monthlyCredits: 1200,
      priceINR: 1699,
      yearlyPriceINR: 16990,
      monthlyReels: 10,
      monthlyCreatives: 30,
      monthlyStories: 30,
      maxBusinesses: 1,
    },
    pro: {
      monthlyCredits: 2500,
      priceINR: 2999,
      yearlyPriceINR: 24990,
      monthlyReels: 20,
      monthlyCreatives: 60,
      monthlyStories: 60,
      maxBusinesses: 3,
    },
    agency: {
      monthlyCredits: 6000,
      priceINR: 4999,
      yearlyPriceINR: 49990,
      monthlyReels: 40,
      monthlyCreatives: 120,
      monthlyStories: 120,
      maxBusinesses: 10,
    },
  },
  topUpPacks: [
    { credits: 500, priceINR: 499 },
    { credits: 1200, priceINR: 999 },
    { credits: 3000, priceINR: 1999 },
  ],
} as const;

export type EntitlementType = 'reel' | 'creative' | 'story';

export const ENTITLEMENT_COSTS: Record<EntitlementType, { credits: number }> = {
  reel: {
    credits: PRICING.reelGenerationCredits, // 80
  },
  creative: {
    credits: PRICING.imageGenerationCredits, // 20
  },
  story: {
    credits: 10,
  },
};

export type SubscriptionPlan = keyof typeof PRICING.subscriptionTiers;
export type SubscriptionTier = (typeof PRICING.subscriptionTiers)[SubscriptionPlan];

export function getMonthlyCredits(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan]?.monthlyCredits ?? 100;
}

export function getPlanPrice(
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): number {
  const tier = PRICING.subscriptionTiers[plan];
  if (!tier) return 0;
  return billingCycle === 'yearly' ? tier.yearlyPriceINR : tier.priceINR;
}

export function calculateCreditsRequired(
  baseCredits: number = PRICING.campaignBaseCredits,
  options?: { extraImages?: number; usePremiumModel?: boolean }
): number {
  let credits = baseCredits;
  if (options?.extraImages) {
    credits += options.extraImages * PRICING.imageGenerationCredits;
  }
  if (options?.usePremiumModel) {
    credits *= PRICING.premiumModelMultiplier;
  }
  return Math.min(credits, PRICING.maxCreditsPerCampaign);
}

export function getCreditsForRegeneration(): number {
  return PRICING.regenerationCredits;
}

export function getCreditsForImageGeneration(): number {
  return PRICING.imageGenerationCredits;
}

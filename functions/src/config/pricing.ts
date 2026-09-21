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
  campaignBaseCredits: 100,
  regenerationCredits: 10,
  imageGenerationCredits: 20,
  premiumModelMultiplier: 2,
  maxCreditsPerCampaign: 300,
  // "Create a Reel": one Vision-AI scene-classification call per clip (up to
  // 10) + one structured edit-plan text call + one server-side ffmpeg render.
  // Priced below a full campaign_generation (140) since there is no DALL-E
  // image generation involved — the user supplies the real footage.
  reelGenerationCredits: 80,
  subscriptionTiers: {
    free: { monthlyCredits: 100, priceINR: 0 },
    starter: { monthlyCredits: 500, priceINR: 499 },
    business: { monthlyCredits: 1200, priceINR: 999 },
    agency: { monthlyCredits: 3000, priceINR: 2499 },
  },
  topUpPacks: [
    { credits: 500, priceINR: 499 },
    { credits: 1200, priceINR: 999 },
    { credits: 3000, priceINR: 1999 },
  ],
} as const;

export type SubscriptionPlan = keyof typeof PRICING.subscriptionTiers;
export type SubscriptionTier = (typeof PRICING.subscriptionTiers)[SubscriptionPlan];

export function getMonthlyCredits(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan].monthlyCredits;
}

export function getPlanPrice(plan: SubscriptionPlan): number {
  return PRICING.subscriptionTiers[plan].priceINR;
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

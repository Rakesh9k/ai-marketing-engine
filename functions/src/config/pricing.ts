export const PRICING = {
  creditValueINR: 1,
  campaignBaseCredits: 100,
  regenerationCredits: 10,
  imageGenerationCredits: 20,
  premiumModelMultiplier: 2,
  maxCreditsPerCampaign: 300,
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

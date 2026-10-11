import { getBusinessesByUser, getCurrentUsage, getSubscriptionByUser } from './firestore';
import type { SubscriptionPlan } from '../config/pricing';
import { logFunctionStart, logFunctionComplete, logFunctionError } from '../utils/logging';

/**
 * P0-4 (docs/P0_HARDENING_TRACKER.md) — canonical, server-side plan-tier
 * entitlement service. Before this file existed, `checkGenerationEligibility`
 * (usageControl.ts) checked ONLY `creditsAvailable >= creditsRequired` — a
 * Free-plan user with enough credits could invoke any Business/Agency-scoped
 * operation (confirmed absent by grep across middleware/ and services/, and
 * independently flagged in docs/LEGAL_COMPLIANCE_AUDIT_REPORT.md finding F7 /
 * candidate C10, which explicitly asked "is credits-only gating the intended
 * model, or should tiers be enforced?" — resolved by this work: enforce).
 *
 * This is the ONLY place plan-tier limits are defined or checked. Every
 * callable that needs a tier check imports one of the require* functions
 * below rather than re-deriving plan logic inline — see requireFeature,
 * requirePlan, requireCampaignAllowance, requireBusinessAllowance.
 */

export type EntitlementFeature =
  | 'watermark'
  | 'brandKit'
  | 'multiBusiness'
  | 'premiumTemplates'
  | 'agencyWorkspace'
  | 'priorityProcessing';

export interface PlanEntitlements {
  campaignsPerMonth: number;
  reelsPerMonth: number;
  creativesPerMonth: number;
  storiesPerMonth: number;
  maxBusinesses: number;
  features: Record<EntitlementFeature, boolean>;
}

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, PlanEntitlements> = {
  free: {
    campaignsPerMonth: 1,
    reelsPerMonth: 0,
    creativesPerMonth: 5,
    storiesPerMonth: 3,
    maxBusinesses: 1,
    features: {
      watermark: true,
      brandKit: false,
      multiBusiness: false,
      premiumTemplates: false,
      agencyWorkspace: false,
      priorityProcessing: false,
    },
  },
  starter: {
    campaignsPerMonth: 5,
    reelsPerMonth: 3,
    creativesPerMonth: 15,
    storiesPerMonth: 9,
    maxBusinesses: 1,
    features: {
      watermark: false,
      brandKit: false,
      multiBusiness: false,
      premiumTemplates: false,
      agencyWorkspace: false,
      priorityProcessing: false,
    },
  },
  business: {
    campaignsPerMonth: 12,
    reelsPerMonth: 10,
    creativesPerMonth: 30,
    storiesPerMonth: 30,
    maxBusinesses: 1,
    features: {
      watermark: false,
      brandKit: true,
      multiBusiness: false,
      premiumTemplates: true,
      agencyWorkspace: false,
      priorityProcessing: false,
    },
  },
  pro: {
    campaignsPerMonth: 25,
    reelsPerMonth: 20,
    creativesPerMonth: 60,
    storiesPerMonth: 60,
    maxBusinesses: 3,
    features: {
      watermark: false,
      brandKit: true,
      multiBusiness: true,
      premiumTemplates: true,
      agencyWorkspace: false,
      priorityProcessing: true,
    },
  },
  agency: {
    campaignsPerMonth: 50,
    reelsPerMonth: 40,
    creativesPerMonth: 120,
    storiesPerMonth: 120,
    maxBusinesses: 10,
    features: {
      watermark: false,
      brandKit: true,
      multiBusiness: true,
      premiumTemplates: true,
      agencyWorkspace: true,
      priorityProcessing: true,
    },
  },
};

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  business: 2,
  pro: 3,
  agency: 4,
};

export interface EntitlementError extends Error {
  code: string;
}

export const ENTITLEMENT_ERROR_CODES = {
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  PLAN_UPGRADE_REQUIRED: 'PLAN_UPGRADE_REQUIRED',
  CAMPAIGN_QUOTA_EXCEEDED: 'CAMPAIGN_QUOTA_EXCEEDED',
  REEL_QUOTA_EXCEEDED: 'REEL_QUOTA_EXCEEDED',
  CREATIVE_QUOTA_EXCEEDED: 'CREATIVE_QUOTA_EXCEEDED',
  STORY_QUOTA_EXCEEDED: 'STORY_QUOTA_EXCEEDED',
  BUSINESS_LIMIT_REACHED: 'BUSINESS_LIMIT_REACHED',
} as const;

function createEntitlementError(code: string, message: string): EntitlementError {
  const error = new Error(message) as EntitlementError;
  error.code = code;
  return error;
}

export interface UserEntitlements {
  billingPlan: SubscriptionPlan;
  plan: SubscriptionPlan;
  campaignsPerMonth: number;
  campaignsUsedThisPeriod: number;
  reelsPerMonth: number;
  reelsUsedThisPeriod: number;
  creativesPerMonth: number;
  creativesUsedThisPeriod: number;
  storiesPerMonth: number;
  storiesUsedThisPeriod: number;
  maxBusinesses: number;
  features: Record<EntitlementFeature, boolean>;
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const { logger, startTime } = logFunctionStart('getUserEntitlements', { userId });
  try {
    const [usage, subscription] = await Promise.all([
      getCurrentUsage(userId),
      getSubscriptionByUser(userId),
    ]);

    const billingPlan: SubscriptionPlan = usage?.planId || 'free';
    const plan: SubscriptionPlan = subscription?.planId || 'free';
    const entitlements = PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.free;

    logFunctionComplete(logger, startTime, { success: true, plan, billingPlan });

    return {
      billingPlan,
      plan,
      campaignsPerMonth: entitlements.campaignsPerMonth,
      campaignsUsedThisPeriod: usage?.campaignsCreated || 0,
      reelsPerMonth: entitlements.reelsPerMonth,
      reelsUsedThisPeriod: (usage as any)?.reelsCreated || (usage as any)?.reelsUsed || 0,
      creativesPerMonth: entitlements.creativesPerMonth,
      creativesUsedThisPeriod: (usage as any)?.creativesCreated || usage?.imagesGenerated || 0,
      storiesPerMonth: entitlements.storiesPerMonth,
      storiesUsedThisPeriod: (usage as any)?.storiesCreated || 0,
      maxBusinesses: entitlements.maxBusinesses,
      features: entitlements.features,
    };
  } catch (error) {
    logFunctionError(logger, startTime, error as Error);
    throw error;
  }
}

/** Throws unless the user's current (subscription-derived) plan has `feature` enabled. */
export async function requireFeature(userId: string, feature: EntitlementFeature): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.features[feature]) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.FEATURE_NOT_AVAILABLE,
      `The "${feature}" feature is not available on your current plan (${entitlements.plan}).`
    );
  }
}

/** Throws unless the user's current plan is at least `minPlan` (free < starter < business < pro < agency). */
export async function requirePlan(userId: string, minPlan: SubscriptionPlan): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (PLAN_RANK[entitlements.plan] < PLAN_RANK[minPlan]) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.PLAN_UPGRADE_REQUIRED,
      `This action requires the ${minPlan} plan or higher (current plan: ${entitlements.plan}).`
    );
  }
}

/** Throws if the user has already reached their plan's campaign-per-month quota. */
export async function requireCampaignAllowance(userId: string): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.campaignsUsedThisPeriod >= entitlements.campaignsPerMonth) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.CAMPAIGN_QUOTA_EXCEEDED,
      `You have used all ${entitlements.campaignsPerMonth} campaigns included in your ${entitlements.plan} plan this period.`
    );
  }
}

/** Throws if the user has already reached their plan's reel-per-month quota. */
export async function requireReelAllowance(userId: string): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.reelsPerMonth === 0) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.PLAN_UPGRADE_REQUIRED,
      `AI Reels are available on Starter and above. Upgrade your plan to unlock Reels.`
    );
  }
  if (entitlements.reelsUsedThisPeriod >= entitlements.reelsPerMonth) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.REEL_QUOTA_EXCEEDED,
      `You've used all ${entitlements.reelsPerMonth} reels included in your ${entitlements.plan} plan this month.`
    );
  }
}

/** Throws if the user has already reached their plan's creative-per-month quota. */
export async function requireCreativeAllowance(userId: string): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.creativesUsedThisPeriod >= entitlements.creativesPerMonth) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.CREATIVE_QUOTA_EXCEEDED,
      `You've used all ${entitlements.creativesPerMonth} social creatives included in your ${entitlements.plan} plan this month.`
    );
  }
}

/** Throws if the user has already reached their plan's story-per-month quota. */
export async function requireStoryAllowance(userId: string): Promise<void> {
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.storiesPerMonth === 0) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.PLAN_UPGRADE_REQUIRED,
      `Story creatives are available on Starter and above. Upgrade your plan to unlock stories.`
    );
  }
  if (entitlements.storiesUsedThisPeriod >= entitlements.storiesPerMonth) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.STORY_QUOTA_EXCEEDED,
      `You've used all ${entitlements.storiesPerMonth} story creatives included in your ${entitlements.plan} plan this month.`
    );
  }
}

/**
 * Throws the business-limit error once `existingCount` has reached the plan's cap. Pure, so the
 * transactional creation path can run it on a count it read inside its own transaction (a
 * check-then-write outside one lets two concurrent submits both pass).
 */
export function assertBusinessCapacity(
  existingCount: number,
  plan: string,
  maxBusinesses: number
): void {
  if (existingCount >= maxBusinesses) {
    throw createEntitlementError(
      ENTITLEMENT_ERROR_CODES.BUSINESS_LIMIT_REACHED,
      `Your ${plan} plan allows up to ${maxBusinesses} business profile(s).`
    );
  }
}

/** Throws if creating another business would exceed the user's plan's business-count limit. */
export async function requireBusinessAllowance(userId: string): Promise<void> {
  const [entitlements, existingBusinesses] = await Promise.all([
    getUserEntitlements(userId),
    getBusinessesByUser(userId),
  ]);
  assertBusinessCapacity(existingBusinesses.length, entitlements.plan, entitlements.maxBusinesses);
}

import type { ID, ISODateTime } from "../types/primitives";

/**
 * Phase 10.32 — Creative Diversity Score Bands
 */
export type DiversityScoreBand =
  | "HEALTHY"             // 80–100
  | "GOOD"                // 60–79
  | "WATCH"               // 40–59
  | "LOW"                 // 20–39
  | "CRITICALLY_REPETITIVE"; // 0–19

/**
 * Mechanism Usage Role
 */
export interface MechanismUsage {
  mechanismId: ID;
  role: "PRIMARY" | "SECONDARY" | "SUPPORTING";
  weight: number;
}

/**
 * Campaign Creative Fingerprint
 */
export interface CreativeFingerprint {
  campaignId: ID;
  businessId: ID;
  tenantId?: ID;
  directionId?: ID;
  psychologyIds: ID[];
  mechanismIds: ID[];
  recipeIds: ID[];
  storyPatternIds: ID[];
  hookPatternIds: ID[];
  visualPatternIds: ID[];
  copyPatternIds: ID[];
  offerFramingIds: ID[];
  ctaPatternIds: ID[];
  emotionalTerritoryIds: ID[];
  audienceContext?: string;
  objective?: string;
  platform?: string;
  format?: string;
  createdAt: ISODateTime;
}

/**
 * Normalized Diversity Fingerprint
 */
export interface DiversityFingerprint {
  primaryMechanisms: string[];
  secondaryMechanisms: string[];
  psychologyFamilies: string[];
  emotionalTerritories: string[];
  recipes: string[];
  narrativePatterns: string[];
  visualPatterns: string[];
  offerFrames: string[];
}

/**
 * Mechanism Saturation Metric
 */
export interface MechanismSaturation {
  mechanismId: ID;
  canonicalMechanismId?: ID;
  usageCount: number;
  weightedUsage: number;
  recentUsageRate: number;
  consecutiveUses: number;
  lastUsedAt: ISODateTime;
  performanceScore?: number;
  saturationScore: number; // 0 to 100
  status: "HEALTHY" | "REPEATING" | "SATURATED" | "OVERUSED";
}

/**
 * Sub-dimension Scores
 */
export interface DiversityDimensions {
  mechanismDiversity: number;
  psychologyDiversity: number;
  directionDiversity: number;
  recipeDiversity: number;
  storyDiversity: number;
  hookDiversity: number;
  visualDiversity: number;
  emotionalDiversity: number;
  offerDiversity: number;
  ctaDiversity: number;
}

/**
 * Diversity Repetition Alert
 */
export interface DiversityAlert {
  id: ID;
  type:
    | "MECHANISM_OVERUSE"
    | "PSYCHOLOGY_OVERUSE"
    | "FAMILY_OVERUSE"
    | "RECIPE_REPETITION"
    | "DIRECTION_REPETITION"
    | "STORY_REPETITION"
    | "EMOTIONAL_REPETITION"
    | "VISUAL_REPETITION";
  severity: "INFO" | "WARNING" | "CRITICAL";
  itemId?: ID;
  message: string;
  recommendation: string;
  createdAt: ISODateTime;
}

/**
 * Diversity Pressure Container
 */
export interface DiversityPressure {
  score: number; // 0 to 100
  level: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
  recommendedExploration: string[];
}

/**
 * Creative Fatigue Signal (Distinguishes Repetition from Declining Performance)
 */
export interface CreativeFatigueSignal {
  mechanismId?: ID;
  familyId?: ID;
  repetitionScore: number;
  performanceDeclineScore: number;
  audienceResponseDecline?: number;
  confidence: number;
  status: "NO_SIGNAL" | "POSSIBLE" | "LIKELY" | "STRONG";
}

/**
 * Mechanism Cooldown Metric
 */
export interface MechanismCooldown {
  mechanismId: ID;
  lastUsedAt: ISODateTime;
  cooldownScore: number;
  recommendedReturnAfter?: ISODateTime;
}

/**
 * Diversity Opportunity Descriptor
 */
export interface DiversityOpportunity {
  mechanismId: ID;
  mechanismFamilyId?: ID;
  reason: string;
  compatibility: number;
  novelty: number;
  evidence: number;
  risk: number;
  priority: number;
}

/**
 * Creative Blind Spot Report
 */
export interface CreativeBlindSpot {
  category: string;
  mechanismIds: ID[];
  compatibility: number;
  usageRate: number;
  expectedPotential: number;
  evidence: Array<{ claim: string; strength: string }>;
  recommendation: string;
}

/**
 * Tenant / Business Creative Diversity Profile
 */
export interface CreativeDiversityProfile {
  businessId: ID;
  tenantId?: ID;
  currentScore: number; // 0 to 100
  band: DiversityScoreBand;
  recentWindowSize: number;
  mechanismDistribution: Record<string, number>;
  psychologyDistribution: Record<string, number>;
  recipeDistribution: Record<string, number>;
  storyDistribution: Record<string, number>;
  visualDistribution: Record<string, number>;
  emotionalDistribution: Record<string, number>;
  repetitionAlerts: DiversityAlert[];
  explorationRecommendations: string[];
  updatedAt: ISODateTime;
}

/**
 * Context Passed to Creative Brain & Explore Another Direction Engine
 */
export interface DiversityContext {
  currentScore: number;
  pressure: number;
  saturatedMechanisms: ID[];
  saturatedFamilies: ID[];
  underusedMechanisms: ID[];
  underusedFamilies: ID[];
  recentDirections: ID[];
  recentPsychologies: ID[];
  recentRecipes: ID[];
  fatigueSignals: CreativeFatigueSignal[];
  explorationBudget: number;
}

export interface DiversityOverrideReason {
  type: "SEASONAL" | "BUSINESS_OBJECTIVE" | "OFFER" | "USER_REQUEST" | "MARKET_EVENT" | "PERFORMANCE";
  explanation: string;
}

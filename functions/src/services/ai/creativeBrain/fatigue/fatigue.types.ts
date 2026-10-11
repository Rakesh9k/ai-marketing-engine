import type { ID, ISODateTime } from "../types/primitives";
import type { CreativeFingerprint } from "../diversity/types";

/**
 * Creative Entity Types Monitored for Fatigue
 */
export type CreativeEntityType =
  | "MECHANISM"
  | "HOOK"
  | "STYLE"
  | "VISUAL"
  | "COPY_PATTERN"
  | "PSYCHOLOGY"
  | "STORY"
  | "RECIPE"
  | "EMOTIONAL_TERRITORY"
  | "DIRECTION";

/**
 * Fatigue Signal Status Level
 */
export type FatigueSignalStatus =
  | "NO_SIGNAL"
  | "REPETITION"
  | "POSSIBLE"
  | "LIKELY"
  | "STRONG";

/**
 * Overall Fatigue Profile Status
 */
export type FatigueProfileStatus =
  | "HEALTHY"
  | "WATCH"
  | "ELEVATED"
  | "HIGH"
  | "CRITICAL";

/**
 * Individual Creative Fatigue Signal
 */
export interface CreativeFatigueSignal {
  id: ID;
  entityType: CreativeEntityType;
  entityId: ID;
  entityName: string;
  frequencyScore: number;
  recencyScore: number;
  repetitionScore: number;
  similarityScore: number;
  performanceDeclineScore: number;
  audienceResponseDeclineScore?: number;
  diversityPressureScore: number;
  confidence: number;
  fatigueScore: number; // 0 to 100
  status: FatigueSignalStatus;
  explanation: string;
  recommendation?: string;
  generatedAt: ISODateTime;
}

/**
 * Creative Frequency Record for an Entity
 */
export interface CreativeFrequencyRecord {
  businessId: ID;
  entityType: CreativeEntityType;
  entityId: ID;
  entityName: string;
  usageCount: number;
  weightedUsage: number;
  usageRate: number;
  consecutiveUses: number;
  longestRecentStreak: number;
  firstUsedAt: ISODateTime;
  lastUsedAt: ISODateTime;
  recentWindow: number;
  updatedAt: ISODateTime;
}

/**
 * Empirical Mechanism Performance Trend
 */
export interface MechanismPerformanceTrend {
  mechanismId: ID;
  campaignCount: number;
  historicalPerformance: number;
  recentPerformance: number;
  delta: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING" | "VOLATILE";
  confidence: number;
}

/**
 * Multi-dimensional Creative Distance Score between Campaigns
 */
export interface CreativeDistanceScore {
  overall: number; // 0 to 100
  mechanismDistance: number;
  psychologyDistance: number;
  hookDistance: number;
  storyDistance: number;
  visualDistance: number;
  styleDistance: number;
  copyStructureDistance: number;
  emotionalDistance: number;
}

/**
 * Strategic Fatigue Context
 */
export interface FatigueContext {
  businessId: ID;
  tenantId?: ID;
  recentCampaigns: CreativeFingerprint[];
  currentObjective?: string;
  currentAudience?: string;
  currentPlatform?: string;
  currentFormat?: string;
  currentSeason?: string;
  isSeasonalCampaign?: boolean;
}

/**
 * Fatigue Recommendation
 */
export interface FatigueRecommendation {
  type:
    | "ROTATE_MECHANISM"
    | "CHANGE_HOOK"
    | "CHANGE_VISUAL"
    | "CHANGE_STYLE"
    | "CHANGE_COPY_STRUCTURE"
    | "CHANGE_PSYCHOLOGY"
    | "CHANGE_DIRECTION";
  targetEntityId?: ID;
  targetEntityName?: string;
  suggestedAlternatives: string[];
  reason: string;
  confidence: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Fatigue Intervention Log
 */
export interface FatigueIntervention {
  id: ID;
  businessId: ID;
  tenantId?: ID;
  triggerSignalId: ID;
  previousMechanismIds: ID[];
  recommendedMechanismIds: ID[];
  selectedMechanismId?: ID;
  selectedBy: "MITRA" | "USER";
  campaignId?: ID;
  outcome?: "IMPROVED" | "STABLE" | "DECLINED" | "INCONCLUSIVE";
  createdAt: ISODateTime;
}

/**
 * Business Creative Fatigue Profile
 */
export interface CreativeFatigueProfile {
  businessId: ID;
  tenantId?: ID;
  overallFatigueScore: number;
  status: FatigueProfileStatus;
  mechanismSignals: CreativeFatigueSignal[];
  hookSignals: CreativeFatigueSignal[];
  styleSignals: CreativeFatigueSignal[];
  visualSignals: CreativeFatigueSignal[];
  copyPatternSignals: CreativeFatigueSignal[];
  psychologySignals: CreativeFatigueSignal[];
  storySignals: CreativeFatigueSignal[];
  recentWindowSize: number;
  updatedAt: ISODateTime;
}

/**
 * Centralized Configuration for Fatigue System
 */
export interface CreativeFatigueConfig {
  recentCampaignWindow: number;
  minimumCampaignsForSignal: number;
  frequencyWeight: number;
  recencyWeight: number;
  repetitionWeight: number;
  similarityWeight: number;
  performanceDeclineWeight: number;
  diversityWeight: number;
  minimumConfidenceForWarning: number;
  minimumConfidenceForStrongFatigue: number;
  seasonalAdjustmentEnabled: boolean;
  platformSpecificDetectionEnabled: boolean;
  formatSpecificDetectionEnabled: boolean;
}

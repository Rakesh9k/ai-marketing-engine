import type { ID, ISODateTime } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { CreativeExperimentSuggestion } from "./learningLoop";

/**
 * Phase 10.28 — Report Periods
 */
export type ReportPeriod =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "CAMPAIGN"
  | "ON_DEMAND";

/**
 * Phase 10.28 — Report Types
 */
export type ReportType =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "CAMPAIGN"
  | "ON_DEMAND";

/**
 * Phase 10.28 — Report Status Lifecycle
 */
export type ReportStatus =
  | "GENERATING"
  | "READY"
  | "PARTIAL"
  | "FAILED"
  | "LEARNING_MODE";

/**
 * Phase 10.28 — Internal Claim Classification
 */
export type ReportClaimType =
  | "OBSERVATION"
  | "COMPARISON"
  | "PATTERN"
  | "LEARNING"
  | "HYPOTHESIS"
  | "RECOMMENDATION"
  | "EXPERIMENT";

/**
 * Phase 10.28 — Insight Category
 */
export type InsightCategory =
  | "MECHANISM"
  | "AUDIENCE"
  | "FORMAT"
  | "OFFER"
  | "PLATFORM"
  | "FAILURE"
  | "COMBINATION";

/**
 * Phase 10.28 — Approved Confidence Language Vocab
 */
export type ConfidenceLanguageLevel =
  | "VERY_STRONG" // "consistently", "strong pattern", "clear winner", "repeatedly outperformed"
  | "STRONG"      // "appears to be working particularly well", "has performed strongly"
  | "MODERATE"    // "shows promising results", "appears promising"
  | "WEAK"        // "early signs suggest", "worth testing further"
  | "INSUFFICIENT"; // "not enough evidence yet"

/**
 * Evidence Summary across the report period
 */
export interface EvidenceSummary {
  totalCampaignsAnalyzed: number;
  totalLearningsAnalyzed: number;
  validatedLearningsCount: number;
  emergingLearningsCount: number;
  decayingLearningsCount: number;
  sampleSizeRange: { min: number; max: number };
  timeRange: { start: ISODateTime; end: ISODateTime };
}

/**
 * Confidence Overview for the report
 */
export interface ConfidenceOverview {
  overallConfidence: number;
  confidenceBreakdown: Record<string, number>;
  dataSufficiency: "INSUFFICIENT" | "MODERATE" | "HIGH";
}

/**
 * Executive Summary ("Your Marketing This Month")
 */
export interface IntelligenceSummary {
  headline: string;
  workingWell: string[];
  weakeningOrRethink: string[];
  topRecommendation: string;
  strategicNarrative: string;
  isLearningMode?: boolean;
}

/**
 * Base Creative Insight contract
 */
export interface CreativeInsight {
  id: ID;
  title: string;
  statement: string;
  explanation?: string;
  category: InsightCategory;
  claimType: ReportClaimType;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  confidenceLanguage: ConfidenceLanguageLevel;
  evidenceCount: number;
  relativeLift?: number;
  learningId: ID;
  sourceCampaignIds: ID[];
  recommendation?: string;
  creativeExamples?: Array<{ creativeId: ID; title: string; mechanismIds: ID[] }>;
  interpretationType?: "STRATEGIC_HYPOTHESIS" | "EMPIRICAL_OBSERVATION";
}

/**
 * Winning Mechanism Insight ("What's Working")
 */
export interface MechanismInsight {
  mechanismId: ID;
  name: string;
  statement: string;
  explanation: string;
  relativeLift: number;
  confidence: number;
  evidenceCount: number;
  contextWhereStrong: string;
  recommendation: string;
  sourceCampaignIds: ID[];
}

/**
 * Audience Insight
 */
export interface AudienceInsight {
  audienceSegment: string;
  statement: string;
  preferredMechanisms: ID[];
  explanation: string;
  relativeLift: number;
  confidence: number;
  recommendation: string;
}

/**
 * Format Insight (Format x Mechanism)
 */
export interface FormatInsight {
  format: string;
  winningMechanismId?: ID;
  statement: string;
  explanation: string;
  relativeLift: number;
  confidence: number;
  recommendation: string;
}

/**
 * Offer Insight (Offer x Angle)
 */
export interface OfferInsight {
  offerType: string;
  statement: string;
  bestFramingMechanismId: ID;
  explanation: string;
  confidence: number;
  recommendation: string;
}

/**
 * Platform Insight
 */
export interface PlatformInsight {
  platform: string;
  statement: string;
  topMechanisms: ID[];
  confidence: number;
  recommendation: string;
}

/**
 * Failure / Rethink Insight ("What to Rethink")
 */
export interface FailureInsight {
  failureId: ID;
  mechanismId: ID;
  title: string;
  statement: string;
  explanation: string;
  observedNegativeLift: number;
  confidence: number;
  recommendedPivot: string;
  sourceCampaignIds: ID[];
}

/**
 * Emerging Pattern ("Emerging Signals")
 */
export interface EmergingPattern {
  patternId: ID;
  title: string;
  statement: string;
  earlySignalLift: number;
  sampleSize: number;
  confidence: number;
  recommendedTest: string;
}

/**
 * Creative Fatigue Alert
 */
export interface CreativeFatigueAlert {
  alertId: ID;
  patternName: string;
  mechanismId: ID;
  statement: string;
  historicalLift: number;
  recentLift: number;
  fatigueScore: number;
  recommendedVariation: string;
}

/**
 * New Discovery Insight
 */
export interface NewDiscovery {
  discoveryId: ID;
  title: string;
  statement: string;
  combinationMechanisms: ID[];
  synergyLift: number;
  confidence: number;
  explanation: string;
}

/**
 * Prioritized Recommendation ("What Should We Do Next?")
 */
export interface CreativeRecommendation {
  id: ID;
  priority: number; // 1 to 5
  actionTitle: string;
  description: string;
  rationale: string;
  expectedImpact: "HIGH" | "MEDIUM" | "MODERATE";
  confidence: number;
  easeOfExecution: "EASY" | "MEDIUM" | "HARD";
  actionableContext: {
    strategicDirection: string;
    supportingLearningId: ID;
    recommendedMechanisms: ID[];
    avoidMechanisms: ID[];
  };
}

/**
 * Business Creative Profile & Creative DNA
 */
export interface CreativeDNA {
  tenantId: ID;
  definingMechanisms: ID[];
  topCombinations: Array<{ mechanisms: ID[]; lift: number }>;
  strongestFormats: string[];
  weakPatterns: ID[];
  overallConfidence: number;
  lastUpdatedAt: ISODateTime;
}

/**
 * Master Creative Intelligence Report Contract
 */
export interface CreativeIntelligenceReport {
  id: ID;
  tenantId: ID;
  period: ReportPeriod;
  periodRange: { start: ISODateTime; end: ISODateTime };
  reportType: ReportType;
  status: ReportStatus;
  executiveSummary: IntelligenceSummary;
  topInsights: CreativeInsight[];
  winningMechanisms: MechanismInsight[];
  audienceInsights: AudienceInsight[];
  formatInsights: FormatInsight[];
  offerInsights: OfferInsight[];
  platformInsights: PlatformInsight[];
  failureInsights: FailureInsight[];
  emergingPatterns: EmergingPattern[];
  creativeFatigueAlerts?: CreativeFatigueAlert[];
  newDiscoveries?: NewDiscovery[];
  recommendations: CreativeRecommendation[];
  experiments?: CreativeExperimentSuggestion[];
  creativeDNA?: CreativeDNA;
  confidenceOverview: ConfidenceOverview;
  evidenceSummary: EvidenceSummary;
  sourceLearningIds: ID[];
  generatedAt: ISODateTime;
  version: number;
}

/**
 * Strategic Direction Context generated when clicking [Use this insight]
 */
export interface StrategicDirectionContext {
  strategicDirection: string;
  supportingLearningId: ID;
  recommendedMechanisms: ID[];
  avoidMechanisms: ID[];
  targetAudience?: string;
  targetPlatform?: string;
}

/**
 * Deterministic Report Claim Validation Result
 */
export interface ReportClaimValidationResult {
  isValid: boolean;
  totalClaimsChecked: number;
  validClaimsCount: number;
  invalidClaimsCount: number;
  rejectedClaims: Array<{
    claimIndex: number;
    statement: string;
    reason: string;
  }>;
  checkedAt: ISODateTime;
}

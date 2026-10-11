/**
 * PHASE 21 — Canonical Creative Memory Types & Contracts
 * Structured memory schemas for strategic decisions, creative expression, audience,
 * commercial offers, user behavior/edits, quality, performance, outcomes,
 * repetition signals, territory maps, and contextual memory retrieval.
 */

export interface UserCreativeEdit {
  editId: string;
  component:
    | 'HOOK'
    | 'COPY'
    | 'VISUAL'
    | 'OFFER'
    | 'CTA'
    | 'TONE'
    | 'LAYOUT'
    | 'STORY'
    | 'OTHER';
  before?: string;
  after?: string;
  reason?: string;
  timestamp: string;
}

export interface ConceptMixReference {
  conceptId: string;
  conceptName: string;
  selectedComponents: string[];
}

export interface RegenerationRequest {
  requestNumber: number;
  weakDimension: string;
  targetComponent: string;
  timestamp: string;
}

export interface UserCreativeFeedback {
  action:
    | 'APPROVED'
    | 'REJECTED'
    | 'EDITED'
    | 'REGENERATED'
    | 'SELECTED'
    | 'DISMISSED';
  target?: string;
  reason?: string;
  timestamp: string;
}

export interface CreativeMemoryStrategic {
  conceptId?: string;
  conceptName?: string;
  coreConcept: string;
  creativeOpportunity: string;
  creativeMechanism: string;
  emotionalTerritory: string;
  narrativeTerritory?: string;
  audienceTension?: string;
  marketingObjective: string;
  strategyHash: string;
}

export interface CreativeMemoryExpression {
  hookPattern?: string;
  hookType?: string;
  visualStyle?: string;
  visualMechanism?: string;
  compositionStyle?: string;
  storyStructure?: string;
  tone?: string;
  copyStyle?: string;
  format: string;
  platform: string;
  motionStyle?: string;
  audioStyle?: string;
}

export interface CreativeMemoryAudience {
  audienceDescription: string;
  audienceSegment?: string;
  lifecycleStage?: string;
  geography?: string;
  occasion?: string;
  problem?: string;
  desire?: string;
  tension?: string;
}

export interface CreativeMemoryCommercial {
  productOrService: string;
  offerId?: string;
  offerType?: string;
  offerRole?: string;
  offerValue?: string;
  ctaType?: string;
  campaignObjective: string;
}

export interface CreativeMemoryUserBehavior {
  selectedConcept?: string;
  approved: boolean;
  rejected: boolean;
  userEdits: UserCreativeEdit[];
  userInstructions: string[];
  selectedVersion?: string;
  mixedConcepts?: ConceptMixReference[];
  regenerationRequests?: RegenerationRequest[];
  feedbackSignals?: UserCreativeFeedback[];
}

export interface CreativeMemoryQuality {
  overallCriticScore: number;
  dimensionScores: Record<string, number>;
  strategyFidelityScore: number;
  truthCheckPassed: boolean;
  brandCheckPassed: boolean;
  platformCheckPassed: boolean;
  revisionCount: number;
  revisionTypes?: string[];
}

export interface CreativeMemoryPerformance {
  source: 'PLATFORM' | 'USER' | 'MANUAL' | 'ESTIMATED';
  impressions?: number;
  reach?: number;
  engagements?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  ctr?: number;
  leads?: number;
  bookings?: number;
  sales?: number;
  conversions?: number;
  conversionRate?: number;
  watchTimeMs?: number;
  completionRate?: number;
  collectedAt: string;
  attributionWindow?: string;
}

export interface CreativeMemoryOutcome {
  campaignSuccess: boolean;
  userSatisfaction: 'HIGH' | 'NEUTRAL' | 'LOW';
  performanceClassification?: 'TOP_PERFORMER' | 'AVERAGE' | 'UNDERPERFORMER' | 'UNTESTED';
  learningSignals: string[];
}

export interface CreativeMemoryProvenance {
  sourceCampaignIds: string[];
  sourceExecutionIds?: string[];
  sourceCriticResultIds?: string[];
  sourceFeedbackIds?: string[];
  sourcePerformanceIds?: string[];
  generatedBy: string;
  createdAt: string;
}

export interface CreativeMemoryLearningSignals {
  effectiveHooks: string[];
  weakHooks: string[];
  effectiveMechanisms: string[];
  userPreferredTones: string[];
  userDislikedTones: string[];
}

export interface CreativeRevisionMemory {
  originalExecutionId: string;
  revisedExecutionId: string;
  targetDimension: string;
  rootCause: string;
  changedComponents: string[];
  protectedComponents: string[];
  scoreBefore: number;
  scoreAfter: number;
  improvement: number;
  regressions: string[];
  accepted: boolean;
  userAccepted?: boolean;
}

export interface CanonicalCreativeMemory {
  id: string;
  tenantId: string;
  businessId: string;
  campaignId: string;
  executionId?: string;
  blueprintId: string;
  blueprintVersion: number;
  createdAt: string;
  updatedAt: string;

  strategic: CreativeMemoryStrategic;
  creative: CreativeMemoryExpression;
  audience: CreativeMemoryAudience;
  commercial: CreativeMemoryCommercial;
  userBehavior: CreativeMemoryUserBehavior;
  quality: CreativeMemoryQuality;
  performance?: CreativeMemoryPerformance;
  outcome: CreativeMemoryOutcome;
  provenance: CreativeMemoryProvenance;
  learningSignals: CreativeMemoryLearningSignals;
  revisionHistory?: CreativeRevisionMemory[];
}

export interface CreativePreferenceSignal {
  signalType:
    | 'PREFERENCE'
    | 'AVERSION'
    | 'PATTERN'
    | 'REPETITION'
    | 'SUCCESS'
    | 'FAILURE';
  subject: string;
  evidenceCount: number;
  confidence: number; // 0.0 to 1.0
  lastObservedAt: string;
  sourceCampaignIds: string[];
}

export interface CreativeRepetitionSignal {
  patternType:
    | 'HOOK'
    | 'MECHANISM'
    | 'VISUAL'
    | 'OFFER'
    | 'TONE'
    | 'STORY'
    | 'FORMAT'
    | 'CTA';
  pattern: string;
  occurrenceCount: number;
  consecutiveOccurrences: number;
  lastUsedAt: string;
  performanceTrend?: 'UP' | 'FLAT' | 'DOWN';
  fatigueRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CreativeTerritoryHistory {
  territory: string;
  usageCount: number;
  lastUsedAt?: string;
  performanceAverage?: number;
  criticAverage?: number;
  userApprovalRate?: number;
  recentTrend?: 'IMPROVING' | 'STABLE' | 'DECLINING';
  saturationScore: number; // 0 to 100
}

export interface MemoryRecommendation {
  type:
    | 'DIVERSIFY'
    | 'REPEAT_SUCCESS'
    | 'AVOID_REPETITION'
    | 'EXPLORE_UNTESTED'
    | 'FOLLOW_PREFERENCE'
    | 'CHALLENGE_PREFERENCE'
    | 'TEST_VARIATION';
  reason: string;
  evidenceCampaignIds: string[];
  confidence: number; // 0.0 to 1.0
  suggestedDirection?: string;
}

export interface CreativeMemoryQuery {
  businessId: string;
  tenantId: string;
  audience?: string;
  objective?: string;
  product?: string;
  offerType?: string;
  platform?: string;
  format?: string;
  timeWindowDays?: number;
  excludeCampaignIds?: string[];
  limit?: number;
}

export interface CreativeMemoryRetrieval {
  memories: CanonicalCreativeMemory[];
  patterns: CreativePreferenceSignal[];
  preferences: CreativePreferenceSignal[];
  repetitions: CreativeRepetitionSignal[];
  territoryMap: CreativeTerritoryHistory[];
  recommendations: MemoryRecommendation[];
  confidence: number;
}

export interface CreativeMemoryContext {
  recentCampaigns: CanonicalCreativeMemory[];
  repeatedPatterns: CreativeRepetitionSignal[];
  successfulPatterns: CreativePreferenceSignal[];
  weakPatterns: CreativePreferenceSignal[];
  userPreferences: CreativePreferenceSignal[];
  underusedTerritories: CreativeTerritoryHistory[];
  fatigueSignals: CreativeRepetitionSignal[];
  revisionInsights: CreativeRevisionMemory[];
  performanceInsights: string[];
  recommendations: MemoryRecommendation[];
  isColdStart: boolean;
}

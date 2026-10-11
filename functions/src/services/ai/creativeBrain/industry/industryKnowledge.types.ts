export type KnowledgeAuthorityLevel = 'CONFIRMED' | 'INFERRED' | 'HYPOTHESIZED';

export interface IndustrySubtype {
  readonly id: string;
  readonly displayName: string;
  readonly description?: string;
  readonly keywords: readonly string[];
  readonly relevantDimensions?: readonly string[];
  readonly relevantObjectives?: readonly string[];
  readonly defaultTerritories?: readonly string[];
}

export interface MarketingObjectiveKnowledge {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priorityScore: number; // 0..100
  readonly primaryCreativeTerritories: readonly string[];
}

export interface CustomerDimensionKnowledge {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly decisionImpact: number; // 0..100
  readonly creativeRelevance: number; // 0..100
  readonly typicalUncertainty: number; // 0..100
  readonly applicableObjectives?: readonly string[];
}

export interface CreativeDimensionKnowledge {
  readonly id: string;
  readonly label: string;
  readonly decisionImpact: number;
  readonly creativeRelevance: number;
  readonly description: string;
  readonly compatibleObjectives?: readonly string[];
}

export interface OfferPatternKnowledge {
  readonly id: string;
  readonly label: string;
  readonly compatibleIndustries?: readonly string[];
  readonly compatibleObjectives?: readonly string[];
  readonly urgencyPotential: number; // 0..100
  readonly valuePotential: number; // 0..100
  readonly trustSensitivity: number; // 0..100
}

export interface CreativeTerritoryKnowledge {
  readonly id: string;
  readonly label: string;
  readonly family: string;
  readonly description: string;
  readonly emotionalDriver: string;
  readonly strategicRole: string;
  readonly suitableFormats?: readonly string[];
}

export interface AudiencePatternKnowledge {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly typicalNeed: string;
}

export interface OccasionPatternKnowledge {
  readonly id: string;
  readonly label: string;
  readonly urgencyLevel: 'high' | 'medium' | 'low';
}

export interface TrustSignalKnowledge {
  readonly id: string;
  readonly label: string;
  readonly sensitivity: number; // 0..100
  readonly description: string;
}

export interface IndustryQuestionCandidate {
  readonly id: string;
  readonly dimensionKey: string;
  readonly category: 'audience' | 'motivation' | 'objective' | 'offer' | 'business';
  readonly promptTemplate: string;
  readonly options: readonly string[];
  readonly contextReason: string;
  readonly decisionImpact: number;
  readonly creativeRelevance: number;
  readonly userEffort: number;
  readonly affectsStates: readonly string[];
}

export interface FormatAffinity {
  readonly format: string;
  readonly affinityScore: number;
}

export interface IndustryConstraint {
  readonly id: string;
  readonly type: 'legal' | 'safety' | 'brand' | 'factual';
  readonly description: string;
}

export interface IndustryCreativeKnowledge {
  readonly industryId: string;
  readonly displayName: string;
  readonly description?: string;
  readonly subtypes: readonly IndustrySubtype[];
  readonly marketingObjectives: readonly MarketingObjectiveKnowledge[];
  readonly customerDimensions: readonly CustomerDimensionKnowledge[];
  readonly creativeDimensions: readonly CreativeDimensionKnowledge[];
  readonly offerPatterns: readonly OfferPatternKnowledge[];
  readonly creativeTerritories: readonly CreativeTerritoryKnowledge[];
  readonly audiencePatterns: readonly AudiencePatternKnowledge[];
  readonly occasionPatterns: readonly OccasionPatternKnowledge[];
  readonly trustSignals: readonly TrustSignalKnowledge[];
  readonly questionCandidates: readonly IndustryQuestionCandidate[];
  readonly commonConstraints?: readonly IndustryConstraint[];
  readonly formatAffinities?: readonly FormatAffinity[];
  readonly metadata: {
    readonly version: string;
    readonly status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
    readonly updatedAt: string;
  };
}

export interface SubtypeResolution {
  readonly id: string;
  readonly confidence: number; // 0..1
  readonly source: string;
  readonly authority: KnowledgeAuthorityLevel;
}

export interface IndustryCreativeContext {
  readonly industry: {
    readonly id: string;
    readonly displayName: string;
    readonly confidence: number;
    readonly authority: KnowledgeAuthorityLevel;
  };
  readonly activeSubtypes: readonly SubtypeResolution[];
  readonly activeCustomerDimensions: readonly CustomerDimensionKnowledge[];
  readonly activeCreativeDimensions: readonly CreativeDimensionKnowledge[];
  readonly relevantObjectives: readonly MarketingObjectiveKnowledge[];
  readonly relevantTerritories: readonly CreativeTerritoryKnowledge[];
  readonly audiencePatterns: readonly AudiencePatternKnowledge[];
  readonly occasionPatterns: readonly OccasionPatternKnowledge[];
  readonly offerPatterns: readonly OfferPatternKnowledge[];
  readonly trustSignals: readonly TrustSignalKnowledge[];
  readonly questionCandidates: readonly IndustryQuestionCandidate[];
  readonly sourceTrace: {
    readonly industryId: string;
    readonly industryConfidence: number;
    readonly matchedSubtypes: readonly string[];
    readonly knowledgeVersion: string;
    readonly fallbackUsed: boolean;
    readonly timestamp: string;
  };
}

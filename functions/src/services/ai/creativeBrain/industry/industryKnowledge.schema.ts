import { z } from 'zod';

export const KnowledgeAuthorityLevelSchema = z.enum(['CONFIRMED', 'INFERRED', 'HYPOTHESIZED']);

export const IndustrySubtypeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  keywords: z.array(z.string()),
  relevantDimensions: z.array(z.string()).optional(),
  relevantObjectives: z.array(z.string()).optional(),
  defaultTerritories: z.array(z.string()).optional(),
});

export const MarketingObjectiveKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  priorityScore: z.number().min(0).max(100),
  primaryCreativeTerritories: z.array(z.string()),
});

export const CustomerDimensionKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  typicalUncertainty: z.number().min(0).max(100),
  applicableObjectives: z.array(z.string()).optional(),
});

export const CreativeDimensionKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  description: z.string().min(1),
  compatibleObjectives: z.array(z.string()).optional(),
});

export const OfferPatternKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  compatibleIndustries: z.array(z.string()).optional(),
  compatibleObjectives: z.array(z.string()).optional(),
  urgencyPotential: z.number().min(0).max(100),
  valuePotential: z.number().min(0).max(100),
  trustSensitivity: z.number().min(0).max(100),
});

export const CreativeTerritoryKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  family: z.string().min(1),
  description: z.string().min(1),
  emotionalDriver: z.string().min(1),
  strategicRole: z.string().min(1),
  suitableFormats: z.array(z.string()).optional(),
});

export const AudiencePatternKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  typicalNeed: z.string().min(1),
});

export const OccasionPatternKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  urgencyLevel: z.enum(['high', 'medium', 'low']),
});

export const TrustSignalKnowledgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sensitivity: z.number().min(0).max(100),
  description: z.string().min(1),
});

export const IndustryQuestionCandidateSchema = z.object({
  id: z.string().min(1),
  dimensionKey: z.string().min(1),
  category: z.enum(['audience', 'motivation', 'objective', 'offer', 'business']),
  promptTemplate: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  contextReason: z.string().min(1),
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  userEffort: z.number().min(0).max(100),
  affectsStates: z.array(z.string()),
});

export const FormatAffinitySchema = z.object({
  format: z.string().min(1),
  affinityScore: z.number().min(0).max(100),
});

export const IndustryConstraintSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['legal', 'safety', 'brand', 'factual']),
  description: z.string().min(1),
});

export const IndustryCreativeKnowledgeSchema = z.object({
  industryId: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  subtypes: z.array(IndustrySubtypeSchema),
  marketingObjectives: z.array(MarketingObjectiveKnowledgeSchema),
  customerDimensions: z.array(CustomerDimensionKnowledgeSchema),
  creativeDimensions: z.array(CreativeDimensionKnowledgeSchema),
  offerPatterns: z.array(OfferPatternKnowledgeSchema),
  creativeTerritories: z.array(CreativeTerritoryKnowledgeSchema),
  audiencePatterns: z.array(AudiencePatternKnowledgeSchema),
  occasionPatterns: z.array(OccasionPatternKnowledgeSchema),
  trustSignals: z.array(TrustSignalKnowledgeSchema),
  questionCandidates: z.array(IndustryQuestionCandidateSchema),
  commonConstraints: z.array(IndustryConstraintSchema).optional(),
  formatAffinities: z.array(FormatAffinitySchema).optional(),
  metadata: z.object({
    version: z.string().min(1),
    status: z.enum(['ACTIVE', 'DRAFT', 'DEPRECATED']),
    updatedAt: z.string(),
  }),
});

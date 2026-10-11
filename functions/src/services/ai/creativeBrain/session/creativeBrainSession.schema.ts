import { z } from 'zod';
import { CreativeOpportunitySchema } from '../../creativeBrain.types';

export const DerivedInsightStatusSchema = z.enum(['ACTIVE', 'SUPERSEDED', 'REJECTED']);

export const InsightSourceSchema = z.enum([
  'USER_ANSWER',
  'BUSINESS_BRAIN',
  'INDUSTRY_KNOWLEDGE',
  'AI_INFERENCE',
]);

export const AuthorityLevelSchema = z.enum([
  'AUTHORITATIVE',
  'SUPPORTING',
  'INFERRED',
  'HYPOTHESIS',
  'DOMAIN_GUIDANCE',
]);

export const CreativeBrainDerivedInsightSchema = z.object({
  id: z.string(),
  dimension: z.string(),
  insight: z.string(),
  sourceAnswerIds: z.array(z.string()),
  source: InsightSourceSchema,
  authority: AuthorityLevelSchema,
  confidence: z.number().min(0).max(100),
  affectsDecisions: z.array(z.string()),
  status: DerivedInsightStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MissingCreativeDimensionSchema = z.object({
  dimension: z.string(),
  state: z.enum(['UNKNOWN', 'PARTIALLY_KNOWN', 'INFERRED', 'CONFLICTING']),
  uncertainty: z.number().min(0).max(100),
  decisionImpact: z.number().min(0).max(100),
  creativeRelevance: z.number().min(0).max(100),
  informationGain: z.number().min(0).max(100).optional(),
  affectedDecisions: z.array(z.string()),
  recommendedAction: z.enum(['ASK', 'INFER', 'SKIP', 'WAIT']),
  lastEvaluatedAt: z.string(),
});

export const CreativeBrainStateTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  reason: z.string(),
  triggeredBy: z.enum([
    'USER_ANSWER',
    'INFERENCE',
    'INFORMATION_GAIN',
    'SYSTEM',
    'USER_SELECTION',
  ]),
  timestamp: z.string(),
});

export const CreativeBrainConfidenceSchema = z.object({
  overall: z.number().min(0).max(100),
  audience: z.number().min(0).max(100).optional(),
  objective: z.number().min(0).max(100).optional(),
  offer: z.number().min(0).max(100).optional(),
  motivation: z.number().min(0).max(100).optional(),
  creativeTerritory: z.number().min(0).max(100).optional(),
  lastUpdatedAt: z.string(),
});

export const SelectedConceptReferenceSchema = z.object({
  conceptId: z.string(),
  selectedAt: z.string(),
  selectionSource: z.enum(['USER', 'SYSTEM']),
});

export const MixedConceptSchema = z.object({
  sourceConceptIds: z.array(z.string()),
  selectedDimensions: z.object({
    positioning: z.string().optional(),
    audience: z.string().optional(),
    motivation: z.string().optional(),
    offerFraming: z.string().optional(),
    copyDirection: z.string().optional(),
    visualDirection: z.string().optional(),
    ctaDirection: z.string().optional(),
  }),
  rationale: z.string().optional(),
  createdAt: z.string(),
});

export const BusinessContextReferenceSchema = z.object({
  businessId: z.string(),
  businessBrainVersion: z.number().optional(),
  businessBrainUpdatedAt: z.string().optional(),
});

export const CreativeBrainSessionStatusSchema = z.enum([
  'ACTIVE',
  'WAITING_FOR_USER',
  'CONCEPT_SELECTION',
  'REFINEMENT',
  'BLUEPRINT_LOCKED',
  'EXECUTION_READY',
  'COMPLETED',
  'ABANDONED',
  'FAILED',
]);

const CorrectionDimensionSchema = z.enum(['audience', 'objective', 'offer', 'direction', 'wording', 'other']);

export const StrategicConfirmationEventSchema = z.object({
  id: z.string(),
  campaignId: z.string().optional(),
  sessionId: z.string(),
  opportunityId: z.string(),
  opportunityRevision: z.number().int().min(1),
  action: z.enum(['CONFIRMED', 'REQUESTED_CHANGE', 'EXPLORE_ALTERNATIVE', 'DIRECTION_SELECTED']),
  createdAt: z.string(),
  metadata: z
    .object({
      source: z.string().optional(),
      dimension: CorrectionDimensionSchema.optional(),
      routedTo: z.literal('BUSINESS_BRAIN_CORRECTION').optional(),
      selectedOpportunityId: z.string().optional(),
    })
    .optional(),
});

export const StrategicConfirmationStateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHANGE_REQUESTED', 'ALTERNATIVE_REQUESTED']),
  lockedOpportunityId: z.string().min(1),
  opportunityRevision: z.number().int().min(1),
  events: z.array(StrategicConfirmationEventSchema),
  corrections: z.array(
    z.object({
      id: z.string(),
      opportunityId: z.string(),
      dimension: CorrectionDimensionSchema,
      text: z.string(),
      materiality: z.enum(['MATERIAL', 'COSMETIC']),
      affectedDimensions: z.array(z.string()),
      createdAt: z.string(),
    })
  ),
  ledger: z.array(
    z.object({
      opportunity: CreativeOpportunitySchema,
      role: z.enum(['ACTIVE', 'ALTERNATIVE', 'SUPERSEDED']),
      recordedAt: z.string(),
      supersededAt: z.string().optional(),
      supersededReason: z.string().optional(),
    })
  ),
  confirmedAt: z.string().optional(),
  confirmedEventId: z.string().optional(),
  recomputeRequired: z.object({ affectedDimensions: z.array(z.string()) }).optional(),
  conceptGenerationStartedAt: z.string().optional(),
});

export const CreativeBrainSessionSchema = z.object({
  sessionId: z.string(),
  ownerUserId: z.string().optional(),
  businessId: z.string(),
  campaignId: z.string().optional(),
  industry: z.string().optional(),
  subIndustry: z.string().optional(),
  businessRef: BusinessContextReferenceSchema,
  initialIntent: z.object({
    objective: z.string(),
    offerHeadline: z.string(),
    price: z.number().optional(),
    cta: z.string(),
    localization: z.any(),
    requestedFormat: z.string().optional(),
    userInstruction: z.string().optional(),
  }),
  answers: z.array(z.any()),
  derivedInsights: z.array(CreativeBrainDerivedInsightSchema),
  missingDimensions: z.array(MissingCreativeDimensionSchema),
  confidence: CreativeBrainConfidenceSchema,
  currentState: z.string(),
  creativeOpportunity: z.any().optional(),
  strategicConfirmation: StrategicConfirmationStateSchema.optional(),
  concepts: z.array(z.any()),
  selectedConcept: SelectedConceptReferenceSchema.optional(),
  mixedConcept: MixedConceptSchema.optional(),
  finalBlueprint: z.any().optional(),
  status: CreativeBrainSessionStatusSchema,
  askedQuestionIds: z.array(z.string()),
  skippedQuestionIds: z.array(z.string()),
  rejectedQuestionIds: z.array(z.string()),
  stateHistory: z.array(CreativeBrainStateTransitionSchema),
  version: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Updated AudienceSituation ontology schema – Phase 10.5
import { z } from 'zod';
import {
  defineEntitySchema,
  stringList,
  DECISION_STAGES,
  ConfidenceLevelSchema,
  CulturalContextSchema,
  ConstraintSchema,
  CompatibilityClaimSchema,
} from './ontology-types';

// ---------------------------------------------------------------------------
// Enumerations specific to AudienceSituation
// ---------------------------------------------------------------------------
export const DECISION_WINDOWS = [
  'immediate',
  'short_term',
  'mid_term',
  'long_term',
] as const;
export type DecisionWindow = (typeof DECISION_WINDOWS)[number];
export const DecisionWindowSchema = z.enum(DECISION_WINDOWS);

// Top‑level taxonomy categories (20 buckets as per spec – placeholder values)
export const AUDIENCE_SITUATION_CATEGORIES = [
  'ROUTINE',
  'TIME_PRESSURE',
  'SOCIAL',
  'EMOTIONAL',
  'FINANCIAL',
  'HEALTH',
  'LIFE_TRANSITION',
  'TECH',
  'ENVIRONMENTAL',
  'CULTURAL',
  'MARKET',
  'COMPETITION',
  'PRODUCT',
  'SERVICE',
  'BRAND',
  'REGULATORY',
  'BUSINESS_SPECIFIC_OPPORTUNITY',
  'SEASONAL',
  'GEOGRAPHIC',
  'OTHER',
] as const;
export type AudienceSituationCategory = (typeof AUDIENCE_SITUATION_CATEGORIES)[number];
export const AudienceSituationCategorySchema = z.enum(AUDIENCE_SITUATION_CATEGORIES);

// ---------------------------------------------------------------------------
// AudienceSituation entity schema – core intelligence layer
// ---------------------------------------------------------------------------
export const AudienceSituationSchema = defineEntitySchema('audience_situation', {
  // Base taxonomy / classification
  category: AudienceSituationCategorySchema,

  // Core descriptive fields (all required, minimum lengths to enforce substance)
  when: z.string().min(5).describe('Temporal context – e.g., "Weekend evening"'),
  who: z.string().min(5).describe('Audience segment – e.g., "busy family with two kids"'),
  where: z.string().min(5).describe('Physical/virtual location – e.g., "city apartment kitchen"'),
  whatIsHappening: z.string().min(10).describe('Narrative of the situation – observable events'),
  whatHasChanged: z.string().min(5).optional().describe('Recent shift that creates relevance'),
  whatTheyFeel: z.string().min(5).describe('Emotional state in the moment'),
  whatTheyWant: z.string().min(5).describe('Desired outcome or need'),
  whatIsBlockingThem: z.string().min(5).optional().describe('Barriers or frictions'),
  whatTriggersAction: z.string().min(5).optional().describe('Catalyst that could start a decision'),
  decisionWindow: DecisionWindowSchema,
  whatTheyAreAfraidOf: z.string().min(5).optional().describe('Fears influencing the decision'),
  whatTheyAreComparing: z.array(z.string().min(1)).optional().describe('Alternatives under evaluation'),
  whatWouldMakeDecisionEasier: z.string().min(5).optional().describe('Conditions that reduce friction'),

  // Existing fields retained for backward compatibility (optional)
  audience: z.string().min(3).optional(),
  situation: z.string().min(5).optional(),
  trigger: z.string().min(3).optional(),
  context: z.string().min(3).optional(),
  emotionalState: z.string().min(3).optional(),
  practicalNeed: z.string().min(3).optional(),
  barriers: stringList().optional(),
  alternatives: stringList().optional(),
  decisionStage: z.enum(DECISION_STAGES).optional(),

  // Shared metadata / governance – inherited via baseEntityShape
  confidence: ConfidenceLevelSchema.optional(),
  evidenceRefs: z.array(z.string().min(1)).optional(),
  culturalContexts: z.array(CulturalContextSchema).optional(),
  constraints: z.array(ConstraintSchema).optional(),
  compatibility: z.array(CompatibilityClaimSchema).optional(),
});

export type AudienceSituation = z.infer<typeof AudienceSituationSchema>;

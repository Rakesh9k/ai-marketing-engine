// Hook Pattern ontology – Phase 10.6
import { z } from 'zod';
import {
  defineEntitySchema,
  stringList,
  idList,
  ConfidenceLevelSchema,
  ConstraintSchema,
  CompatibilityClaimSchema,
  CulturalContextSchema,
  EntityRefSchema,
} from './ontology-types';
import { EvidenceReferenceSchema } from './psychology'; // reuse existing evidence schema

// ---------------------------------------------------------------------------
// Enumerations specific to Hook Patterns
// ---------------------------------------------------------------------------
export const HOOK_CATEGORIES = [
  'SITUATION',
  'CURIOSITY',
  'CONTRARIAN',
  'OUTCOME',
  'PROBLEM',
  'TENSION',
  'QUESTION',
  'SPECIFICITY',
  'LOCAL',
  'IDENTITY',
  'PROOF',
  'DEMONSTRATION',
  'TRANSFORMATION',
  'STORY',
  'OBJECTION',
  'DISCOVERY',
  'COMPARISON',
  'URGENCY',
  'OFFER',
  'AUTHORITY',
  'CUSTOMER_POV',
  'MYTH',
  'PATTERN_INTERRUPT',
  'RELATABILITY',
  'OPEN_LOOP',
] as const;
export type HookCategory = (typeof HOOK_CATEGORIES)[number];
export const HookCategorySchema = z.enum(HOOK_CATEGORIES);

// Hook strength dimensions (qualitative levels)
export const STRENGTH_LEVELS = ['low', 'moderate', 'high', 'context_dependent'] as const;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];
export const StrengthLevelSchema = z.enum(STRENGTH_LEVELS);
export const HookStrengthSchema = z.object({
  attentionPotential: StrengthLevelSchema,
  clarity: StrengthLevelSchema,
  relevance: StrengthLevelSchema,
  curiosityPotential: StrengthLevelSchema,
  trustCompatibility: StrengthLevelSchema,
  conversionCompatibility: StrengthLevelSchema,
  brandCompatibility: StrengthLevelSchema,
});

// Variable system ----------------------------------------------------------
export const HOOK_VARIABLE_TYPES = [
  'AUDIENCE',
  'LOCATION',
  'SITUATION',
  'PROBLEM',
  'TENSION',
  'DESIRED_OUTCOME',
  'PRODUCT',
  'SERVICE',
  'OFFER',
  'BENEFIT',
  'RESULT',
  'INSIGHT',
  'UNEXPECTED_TRUTH',
  'OBJECTION',
  'CONTRAST',
  'TIME_WINDOW',
  'PROOF',
  'COMPETITOR_CATEGORY',
  'CUSTOMER_LANGUAGE',
  'BRAND_TERM',
] as const;
export type HookVariableType = (typeof HOOK_VARIABLE_TYPES)[number];
export const HookVariableTypeSchema = z.enum(HOOK_VARIABLE_TYPES);

export const VariableSourceSchema = z.enum([
  'BusinessBrain',
  'AudienceSituation',
  'InsightPattern',
  'MarketingObjective',
  'Psychology',
  'CreativeMechanism',
  'CampaignContext',
  'Generated',
]);

export const HookVariableSchema = z.object({
  name: z.string().min(1),
  type: HookVariableTypeSchema,
  description: z.string().min(5),
  required: z.boolean(),
  source: VariableSourceSchema,
  validation: z.object({
    // simple placeholder – extend as needed
    regex: z.string().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
  examples: z.array(z.string()).optional(),
});
export type HookVariable = z.infer<typeof HookVariableSchema>;

// ---------------------------------------------------------------------------
// HookPattern ontology entity schema
// ---------------------------------------------------------------------------
export const HookPatternSchema = defineEntitySchema('hook_pattern', {
  // Core identification & classification
  category: HookCategorySchema,
  name: z.string().min(3),
  definition: z.string().min(20),
  formula: z.string().min(5), // grammar string with [] placeholders
  purpose: z.string().min(10).optional(),

  // References to other ontology objects (ids)
  psychologyRefs: idList().optional(),
  mechanismRefs: idList().optional(),
  bestSituationRefs: idList().optional(),
  bestObjectiveRefs: idList().optional(),
  compatibleInsightRefs: idList().optional(),

  // Strength model
  strength: HookStrengthSchema.optional(),

  // Risks and ethics
  risks: stringList().optional(),
  ethicalBoundaries: stringList().optional(),

  // Variables used in the formula
  variables: z.array(HookVariableSchema).optional(),

  // Constraints, compatibility, cultural contexts – shared across ontology
  constraints: z.array(ConstraintSchema).optional(),
  compatibility: z.array(CompatibilityClaimSchema).optional(),
  culturalContexts: z.array(CulturalContextSchema).optional(),

  // Evidence, confidence, assumptions
  evidence: z.array(EvidenceReferenceSchema).optional(),
  confidence: ConfidenceLevelSchema.optional(),
  assumptions: z.array(z.string()).optional(),

  // Relationships – generic placeholder (can be extended later)
  relationships: z.array(EntityRefSchema).optional(),
});

export type HookPattern = z.infer<typeof HookPatternSchema>;

// Creative Recipe Ontology
// Defines the data models for the Creative Recipe layer (Phase 10.15).
// Mirrors the style of other intelligence layers.

import { z } from "zod";
import {
  ConfidenceLevelSchema,
  EntityRefSchema,
} from "./ontology-types"; // adjust import path as needed

// -----------------------------------------------------------------------------
// Enums & Type Aliases
// -----------------------------------------------------------------------------
export const RecipeStatusEnum = z.enum([
  "DRAFT",
  "HYPOTHESIS",
  "TESTING",
  "EVIDENCE_BACKED",
  "VALIDATED",
  "DEPRECATED",
  "INVALIDATED",
] as const);
export type RecipeStatus = z.infer<typeof RecipeStatusEnum>;

export const ComponentRoleEnum = z.enum([
  "CORE",
  "PRIMARY",
  "SECONDARY",
  "SUPPORTING",
  "OPTIONAL",
] as const);
export type ComponentRole = z.infer<typeof ComponentRoleEnum>;

export const ComponentTypeEnum = z.enum([
  "PSYCHOLOGY",
  "MOTIVATION",
  "INSIGHT",
  "MECHANISM",
  "HOOK",
  "STORY",
  "VISUAL",
  "COPY",
  "OFFER",
  "CTA",
  "STYLE",
  "PLATFORM",
] as const);
export type ComponentType = z.infer<typeof ComponentTypeEnum>;

export const PrerequisiteTypeEnum = z.enum([
  "BUSINESS_CAPABILITY",
  "AUDIENCE_INFORMATION",
  "OFFER_INFORMATION",
  "PROOF",
  "ASSET",
  "PLATFORM",
  "BRAND",
  "OPERATIONAL",
] as const);
export type PrerequisiteType = z.infer<typeof PrerequisiteTypeEnum>;

export const VerificationEnum = z.enum(["REQUIRED", "PREFERRED", "OPTIONAL"] as const);
export type Verification = z.infer<typeof VerificationEnum>;

export const FailureBehaviorEnum = z.enum([
  "REJECT",
  "USE_ALTERNATIVE",
  "DEGRADE",
  "ASK_USER",
] as const);
export type FailureBehavior = z.infer<typeof FailureBehaviorEnum>;

export const AdaptationDimensionEnum = z.enum([
  "INDUSTRY",
  "AUDIENCE",
  "SITUATION",
  "OBJECTIVE",
  "OFFER",
  "PLATFORM",
  "STYLE",
  "CULTURE",
  "LANGUAGE",
  "SEASON",
] as const);
export type AdaptationDimension = z.infer<typeof AdaptationDimensionEnum>;

export const ModifierTypeEnum = z.enum([
  "SEASONAL",
  "CULTURAL",
  "PLATFORM",
  "STYLE",
  "OFFER",
  "AUDIENCE",
  "FORMAT",
] as const);
export type ModifierType = z.infer<typeof ModifierTypeEnum>;

export const ReusabilityLevelEnum = z.enum([
  "INDUSTRY_SPECIFIC",
  "MULTI_INDUSTRY",
  "GENERAL",
] as const);
export type ReusabilityLevel = z.infer<typeof ReusabilityLevelEnum>;

export const RelationshipEnum = z.enum([
  "BUILDS_ON",
  "ALTERNATIVE_TO",
  "MODIFIED_BY",
  "REQUIRES",
  "COMPATIBLE_WITH",
  "CONFLICTS_WITH",
  "DERIVED_FROM",
  "VALIDATED_BY",
  "INVALIDATED_BY",
  "SPECIALIZATION_OF",
  "GENERALIZATION_OF",
] as const);
export type Relationship = z.infer<typeof RelationshipEnum>;

// -----------------------------------------------------------------------------
// Core Schemas
// -----------------------------------------------------------------------------
export const RecipeComponentSchema = z.object({
  type: ComponentTypeEnum,
  id: z.string(),
  role: ComponentRoleEnum,
  rationale: z.string(),
});
export type RecipeComponent = z.infer<typeof RecipeComponentSchema>;

export const RecipePrerequisiteSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  type: PrerequisiteTypeEnum,
  required: z.boolean(),
  verification: VerificationEnum,
  failureBehavior: FailureBehaviorEnum,
});
export type RecipePrerequisite = z.infer<typeof RecipePrerequisiteSchema>;

export const RecipeCompatibilitySchema = z.object({
  industries: z.array(z.string()).optional(),
  audienceSituations: z.array(z.string()).optional(),
  awarenessStages: z.array(z.string()).optional(),
  purchaseIntentLevels: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  productTypes: z.array(z.string()).optional(),
  offerTypes: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  culturalContexts: z.array(z.string()).optional(),
  seasonality: z.array(z.string()).optional(),
  dayparts: z.array(z.string()).optional(),
});
export type RecipeCompatibility = z.infer<typeof RecipeCompatibilitySchema>;

export const CombinationConditionSchema = z.object({
  type: z.string(), // reuse from combination.types but keep simple here
  field: z.string(),
  operator: z.string(),
  value: z.any(),
  reason: z.string(),
});
export type CombinationCondition = z.infer<typeof CombinationConditionSchema>;

export const RecipeAdaptationRuleSchema = z.object({
  dimension: AdaptationDimensionEnum,
  condition: z.array(CombinationConditionSchema),
  preserve: z.array(z.string()),
  replace: z.array(z.string()),
  add: z.array(z.string()),
  remove: z.array(z.string()),
  rationale: z.string(),
});
export type RecipeAdaptationRule = z.infer<typeof RecipeAdaptationRuleSchema>;

export const RecipeModifierSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ModifierTypeEnum,
  compatibleRecipes: z.array(z.string()),
  incompatibleRecipes: z.array(z.string()),
  additions: z.array(z.string()),
  replacements: z.array(z.string()),
  removals: z.array(z.string()),
  constraints: z.array(CombinationConditionSchema),
  rationale: z.string(),
});
export type RecipeModifier = z.infer<typeof RecipeModifierSchema>;

export const RecipeVersionSchema = z.object({
  version: z.string(),
  changedAt: z.string(), // ISO timestamp
  changes: z.array(z.string()),
  reason: z.string(),
  evidence: z.array(EntityRefSchema),
  confidenceBefore: ConfidenceLevelSchema,
  confidenceAfter: ConfidenceLevelSchema,
  author: z.enum(["SYSTEM", "HUMAN", "LEARNING"]),
});
export type RecipeVersion = z.infer<typeof RecipeVersionSchema>;

export const RecipeLearningSchema = z.object({
  recipeId: z.string(),
  businessContext: z.string(),
  audienceContext: z.string(),
  platformContext: z.string(),
  executionContext: z.string(),
  outcome: z.enum(["WORKED", "FAILED", "NEUTRAL", "UNEXPECTED"]),
  performanceSignals: z.array(z.any()),
  economicSignals: z.array(z.any()),
  qualitativeFeedback: z.array(z.string()),
  explanationHypothesis: z.string(),
  alternativeExplanations: z.array(z.string()),
  evidenceStrength: ConfidenceLevelSchema,
  confidenceChange: z.string(),
});
export type RecipeLearning = z.infer<typeof RecipeLearningSchema>;

export const RecipeFailureModeSchema = z.object({
  condition: z.string(),
  failureReason: z.string(),
  observedBehavior: z.string(),
  mitigation: z.string(),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
});
export type RecipeFailureMode = z.infer<typeof RecipeFailureModeSchema>;

export const RecipeRelationshipSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  relationship: RelationshipEnum,
});
export type RecipeRelationship = z.infer<typeof RecipeRelationshipSchema>;

export const RecipeMatchSchema = z.object({
  recipeId: z.string(),
  situationFit: z.number(),
  insightFit: z.number(),
  objectiveFit: z.number(),
  audienceFit: z.number(),
  industryFit: z.number(),
  offerFit: z.number(),
  mechanismFit: z.number(),
  platformFit: z.number(),
  businessCapabilityFit: z.number(),
  evidenceFit: z.number(),
  brandFit: z.number(),
  culturalFit: z.number(),
  total: z.number(),
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
  missingInformation: z.array(z.string()),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
});
export type RecipeMatch = z.infer<typeof RecipeMatchSchema>;

export const RecipeRecommendationSchema = z.object({
  primaryRecipe: RecipeMatchSchema.optional(),
  alternativeRecipes: z.array(RecipeMatchSchema),
  excludedRecipes: z.array(
    z.object({ recipeId: z.string(), reasonCode: z.string() })
  ),
  noRecipeReason: z.string().optional(),
  rationale: z.string(),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
});
export type RecipeRecommendation = z.infer<typeof RecipeRecommendationSchema>;

export const RecipeExplanationSchema = z.object({
  whySelected: z.string(),
  audienceReason: z.string(),
  situationReason: z.string(),
  insightReason: z.string(),
  objectiveReason: z.string(),
  componentReasoning: z.array(
    z.object({ component: z.string(), reason: z.string() })
  ),
  adaptationReason: z.string(),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence: z.array(z.string()),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
});
export type RecipeExplanation = z.infer<typeof RecipeExplanationSchema>;

export const RecipeBlueprintSchema = z.object({
  recipeId: z.string(),
  adaptedName: z.string(),
  audienceSituation: z.any(), // placeholder for concrete type
  audience: z.any(), // placeholder
  motivation: z.string(),
  insight: z.any(),
  marketingObjective: z.any(),
  creativeOpportunity: z.string(),
  psychology: z.array(z.any()),
  mechanisms: z.array(z.any()),
  hook: z.any(),
  story: z.any(),
  visual: z.any(),
  copy: z.any(),
  offer: z.any().optional(),
  style: z.any(),
  cta: z.any(),
  platform: z.string(),
  primaryComponents: z.array(RecipeComponentSchema),
  optionalComponents: z.array(RecipeComponentSchema),
  adaptations: z.array(z.string()),
  constraints: z.array(z.string()),
  evidenceRequirements: z.array(EntityRefSchema),
  assumptions: z.array(z.string()),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
  rationale: z.string(),
});
export type RecipeBlueprint = z.infer<typeof RecipeBlueprintSchema>;

export const RecipeQualityScoreSchema = z.object({
  strategicCoherence: z.number(),
  reusability: z.number(),
  contextAdaptability: z.number(),
  componentCompatibility: z.number(),
  evidenceStrength: z.number(),
  ethicalSafety: z.number(),
  explainability: z.number(),
  executionFeasibility: z.number(),
  learningPotential: z.number(),
  distinctiveness: z.number(),
  total: z.number(),
});
export type RecipeQualityScore = z.infer<typeof RecipeQualityScoreSchema>;

export const RecipeConfidenceSchema = z.object({
  overall: ConfidenceLevelSchema,
  strategicConfidence: ConfidenceLevelSchema,
  evidenceConfidence: ConfidenceLevelSchema,
  contextualConfidence: ConfidenceLevelSchema,
  executionConfidence: ConfidenceLevelSchema,
  uncertainty: z.array(z.string()),
});
export type RecipeConfidence = z.infer<typeof RecipeConfidenceSchema>;

// -----------------------------------------------------------------------------
// CreativeRecipe main schema
// -----------------------------------------------------------------------------
export const CreativeRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  definition: z.string(),
  strategicPurpose: z.string(),
  problemSolved: z.string(),
  audienceSituationIds: z.array(z.string()),
  audienceProfiles: z.array(z.string()),
  motivationIds: z.array(z.string()),
  psychologyIds: z.array(z.string()),
  insightPatternIds: z.array(z.string()),
  marketingObjectives: z.array(z.any()), // placeholder for MarketingObjective type
  creativeOpportunityPatterns: z.array(z.string()),
  mechanismIds: z.array(z.string()),
  hookPatternIds: z.array(z.string()),
  storyStructureIds: z.array(z.string()),
  visualStructureIds: z.array(z.string()),
  copyStructureIds: z.array(z.string()),
  offerStructureIds: z.array(z.string()),
  styleSystemIds: z.array(z.string()),
  ctaIntentIds: z.array(z.string()),
  platformIds: z.array(z.string()),
  combinationRuleIds: z.array(z.string()),
  primaryComponents: z.array(RecipeComponentSchema),
  secondaryComponents: z.array(RecipeComponentSchema),
  optionalComponents: z.array(RecipeComponentSchema),
  requiredComponents: z.array(RecipeComponentSchema),
  prohibitedComponents: z.array(RecipeComponentSchema),
  prerequisites: z.array(RecipePrerequisiteSchema),
  compatibility: RecipeCompatibilitySchema,
  adaptationRules: z.array(RecipeAdaptationRuleSchema),
  executionConstraints: z.array(z.any()), // generic placeholder
  evidence: z.array(EntityRefSchema),
  assumptions: z.array(z.string()),
  confidence: ConfidenceLevelSchema, ConfidenceLevelSchema,
  status: RecipeStatusEnum,
  learning: z.array(RecipeLearningSchema),
  relationships: z.array(RecipeRelationshipSchema),
  versionHistory: z.array(RecipeVersionSchema),
});
export type CreativeRecipe = z.infer<typeof CreativeRecipeSchema>;

// Export schemas for external usage (e.g., registries, validators)
export const schemas = {
  CreativeRecipeSchema,
  RecipeComponentSchema,
  RecipePrerequisiteSchema,
  RecipeCompatibilitySchema,
  RecipeAdaptationRuleSchema,
  RecipeModifierSchema,
  RecipeVersionSchema,
  RecipeLearningSchema,
  RecipeFailureModeSchema,
  RecipeRelationshipSchema,
  RecipeMatchSchema,
  RecipeRecommendationSchema,
  RecipeExplanationSchema,
  RecipeBlueprintSchema,
  RecipeQualityScoreSchema,
  RecipeConfidenceSchema,
};

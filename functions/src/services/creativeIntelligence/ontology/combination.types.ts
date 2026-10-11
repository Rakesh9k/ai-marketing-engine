// Combination Rules Engine Ontology
// This file defines the core data models for the Combination Rules Engine (Phase 10.14).
// It follows the same pattern used by other intelligence layers (e.g., Style, Platform).

import { z } from "zod";
import {
  ConfidenceLevelSchema,
  KnowledgeStatusSchema,
  EntityRefSchema,
} from "./ontology-types";

// -----------------------------------------------------------------------------
// Enums & Type Aliases
// -----------------------------------------------------------------------------
export const CombinationRelationshipEnum = z.enum([
  "COMPATIBLE",
  "RECOMMENDED",
  "NEUTRAL",
  "AVOID",
  "FORBIDDEN",
] as const);
export type CombinationRelationship = z.infer<typeof CombinationRelationshipEnum>;

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
  "ANTIPATTERN",
] as const);
export type ComponentType = z.infer<typeof ComponentTypeEnum>;

export const ComponentRoleEnum = z.enum([
  "PRIMARY",
  "SECONDARY",
  "SUPPORTING",
  "CONSTRAINT",
] as const);
export type ComponentRole = z.infer<typeof ComponentRoleEnum>;

export const RulePriorityEnum = z.enum([
  "SYSTEM",
  "ETHICAL",
  "TRUTH",
  "BUSINESS",
  "STRATEGIC",
  "CONTEXTUAL",
  "EXPERIMENTAL",
] as const);
export type RulePriority = z.infer<typeof RulePriorityEnum>;

export const ConditionOperatorEnum = z.enum([
  "EQ",
  "NEQ",
  "IN",
  "NOT_IN",
  "GT",
  "GTE",
  "LT",
  "LTE",
  "KNOWN",
  "UNKNOWN",
] as const);
export type ConditionOperator = z.infer<typeof ConditionOperatorEnum>;

export const ConditionTypeEnum = z.enum([
  "REQUIRES",
  "PREFERS",
  "DISALLOWS",
  "ONLY_IF",
  "UNLESS",
] as const);
export type ConditionType = z.infer<typeof ConditionTypeEnum>;

// -----------------------------------------------------------------------------
// Core Models
// -----------------------------------------------------------------------------
export const CombinationComponentSchema = z.object({
  type: ComponentTypeEnum,
  id: z.string(),
  role: ComponentRoleEnum,
});
export type CombinationComponent = z.infer<typeof CombinationComponentSchema>;

export const CombinationConditionSchema = z.object({
  type: ConditionTypeEnum,
  field: z.string(),
  operator: ConditionOperatorEnum,
  value: z.any(),
  reason: z.string(),
});
export type CombinationCondition = z.infer<typeof CombinationConditionSchema>;

export const EvidenceRequirementSchema = z.object({
  claim: z.string(),
  evidenceType: z.enum([
    "VERIFIED_BUSINESS_FACT",
    "CUSTOMER_REVIEW",
    "CUSTOMER_RESEARCH",
    "EXPERIMENT",
    "PERFORMANCE_DATA",
    "EXTERNAL_RESEARCH",
    "PLATFORM_DOCUMENTATION",
    "NONE_REQUIRED",
  ] as const),
  required: z.boolean(),
  verificationStatus: z.enum(["VERIFIED", "UNVERIFIED", "UNKNOWN"] as const),
});
export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;

export const CombinationExceptionSchema = z.object({
  description: z.string(),
  condition: CombinationConditionSchema,
});
export type CombinationException = z.infer<typeof CombinationExceptionSchema>;

export const CombinationScopeSchema = z.object({
  industries: z.array(z.string()).optional(),
  audiences: z.array(z.string()).optional(),
  situations: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  awarenessStages: z.array(z.string()).optional(),
  purchaseIntent: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  formats: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  productTypes: z.array(z.string()).optional(),
  offerTypes: z.array(z.string()).optional(),
  culturalContexts: z.array(z.string()).optional(),
});
export type CombinationScope = z.infer<typeof CombinationScopeSchema>;

export const CombinationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  relationship: CombinationRelationshipEnum,
  components: z.array(CombinationComponentSchema),
  requiredConditions: z.array(CombinationConditionSchema),
  preferredConditions: z.array(CombinationConditionSchema),
  excludedConditions: z.array(CombinationConditionSchema),
  strategicPurpose: z.string().optional(),
  expectedEffect: z.string().optional(),
  rationale: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  risks: z.array(z.string()),
  antiPatterns: z.array(z.string()),
  ethicalBoundaries: z.array(z.string()),
  requiredEvidence: z.array(EvidenceRequirementSchema),
  assumptions: z.array(z.string()),
  exceptions: z.array(CombinationExceptionSchema),
  compatibleWith: z.array(z.string()),
  conflictsWith: z.array(z.string()),
  evidence: z.array(EntityRefSchema),
  confidence: ConfidenceLevelSchema,
  status: KnowledgeStatusSchema,
  relationships: z.array(CombinationRelationshipEnum),
  priority: RulePriorityEnum,
  scope: CombinationScopeSchema.optional(),
});
export type CombinationRule = z.infer<typeof CombinationRuleSchema>;

// -----------------------------------------------------------------------------
// Evaluation Result Model
// -----------------------------------------------------------------------------
export const CombinationEvaluationSchema = z.object({
  status: z.enum([
    "ALLOWED",
    "RECOMMENDED",
    "NEUTRAL",
    "AVOID",
    "FORBIDDEN",
    "REJECTED",
  ] as const),
  matchedRules: z.array(CombinationRuleSchema),
  violatedRules: z.array(CombinationRuleSchema),
  requiredConditions: z.array(CombinationConditionSchema),
  missingInformation: z.array(z.string()),
  evidenceRequirements: z.array(EvidenceRequirementSchema),
  risks: z.array(z.string()),
  rationale: z.string(),
  confidence: ConfidenceLevelSchema,
});
export type CombinationEvaluation = z.infer<typeof CombinationEvaluationSchema>;

// Export schemas for external use (e.g., registries, validators)
export const schemas = {
  CombinationRuleSchema,
  CombinationComponentSchema,
  CombinationConditionSchema,
  EvidenceRequirementSchema,
  CombinationExceptionSchema,
  CombinationScopeSchema,
  CombinationEvaluationSchema,
};

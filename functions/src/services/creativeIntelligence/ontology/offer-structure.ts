// Offer Intelligence Ontology
// This file defines the core ontology for the Offer Intelligence layer.
// It follows the same pattern as other ontology files (e.g., copy-structure.ts).

import { z } from "zod";
import { defineEntitySchema, EntityRefSchema, ConfidenceLevelSchema, KnowledgeStatusSchema } from "./ontology-types";

// ---------------------------------------------------------------------------
// Enums & Basic Types
// ---------------------------------------------------------------------------
export const OfferLever = z.enum([
  "valueCreation",
  "valueCommunication",
  "priceReduction",
  "riskReduction",
  "convenience",
  "experience",
]);
export type OfferLever = z.infer<typeof OfferLever>;

export const OfferCategory = z.enum([
  "priceAnchor",
  "valueStack",
  "bundle",
  "perPerson",
  "limitedTime",
  "freeAddOn",
  "upgrade",
  "firstTimeOffer",
  "membership",
  "trial",
  "convenienceOffer",
  "experienceOffer",
]);
export type OfferCategory = z.infer<typeof OfferCategory>;

// ---------------------------------------------------------------------------
// Offer Context Model (as per specification)
// ---------------------------------------------------------------------------
export const BusinessEquityEnum = z.enum(["premium", "midMarket", "commodity", "unknown"]);
export const CompetitionIntensityEnum = z.enum([
  "low",
  "moderate",
  "high",
  "priceWar",
  "unknown",
]);
export const CustomerBarrierEnum = z.enum([
  "trustRisk",
  "perceivedValue",
  "cashFlow",
  "convenience",
  "awareness",
  "availability",
  "decisionComplexity",
  "unknown",
]);
export const AcquisitionStageEnum = z.enum([
  "coldAcquisition",
  "consideration",
  "conversion",
  "retention",
  "reactivation",
]);
export const PurchaseFrequencyEnum = z.enum([
  "oneTime",
  "occasional",
  "frequent",
  "recurring",
  "unknown",
]);
export const PriceSensitivityEnum = z.enum([
  "low",
  "moderate",
  "high",
  "unknown",
]);
export const MarginToleranceEnum = z.enum([
  "low",
  "medium",
  "high",
  "unknown",
]);
export const DemandLevelEnum = z.enum([
  "low",
  "normal",
  "high",
  "unknown",
]);

export const OfferContextSchema = z.object({
  businessEquity: BusinessEquityEnum.optional(),
  competitionIntensity: CompetitionIntensityEnum,
  customerBarrier: CustomerBarrierEnum,
  acquisitionStage: AcquisitionStageEnum,
  purchaseFrequency: PurchaseFrequencyEnum,
  priceSensitivity: PriceSensitivityEnum,
  marginTolerance: MarginToleranceEnum,
  capacityConstraint: z.string().optional(),
  inventoryConstraint: z.string().optional(),
  demandLevel: DemandLevelEnum.optional(),
  seasonality: z.string().optional(),
  offerHistory: z.array(z.string()).optional(),
});
export type OfferContext = z.infer<typeof OfferContextSchema>;

// ---------------------------------------------------------------------------
// Margin Impact Model
// ---------------------------------------------------------------------------
export const MarginImpactSchema = z.object({
  reducesPrice: z.boolean(),
  estimatedMarginEffect: z.string().optional(),
  costIncrease: z.string().optional(),
  capacityImpact: z.string().optional(),
  operationalBurden: z.string().optional(),
  confidence: ConfidenceLevelSchema,
});
export type MarginImpact = z.infer<typeof MarginImpactSchema>;

// ---------------------------------------------------------------------------
// Offer Component Model
// ---------------------------------------------------------------------------
export const OfferComponentType = z.enum([
  "coreProduct",
  "service",
  "addon",
  "experience",
  "convenience",
  "proof",
  "access",
  "support",
]);
export type OfferComponentType = z.infer<typeof OfferComponentType>;

export const OfferComponentSchema = z.object({
  name: z.string(),
  type: OfferComponentType,
  description: z.string(),
  included: z.boolean(),
  verified: z.boolean(),
  perceivedValue: z.string().optional(),
  actualCost: z.string().optional(),
});
export type OfferComponent = z.infer<typeof OfferComponentSchema>;

// ---------------------------------------------------------------------------
// Offer Claim Model
// ---------------------------------------------------------------------------
export const OfferClaimSchema = z.object({
  claim: z.string(),
  claimType: z.string(),
  requiredEvidence: EntityRefSchema, // reference to an EvidenceRequirement entity
  verified: z.boolean(),
  source: z.string().optional(),
  confidence: ConfidenceLevelSchema,
});
export type OfferClaim = z.infer<typeof OfferClaimSchema>;

// ---------------------------------------------------------------------------
// Offer Structure (main entity)
// ---------------------------------------------------------------------------
export const OfferStructureSchema = defineEntitySchema("offer_structure", {
  // Base entity fields are automatically merged via defineEntitySchema.
  // Additional fields specific to OfferStructure follow.
  name: z.string(),
  category: OfferCategory,
  definition: z.string(),
  strategicPurpose: z.string(),
  primaryLever: OfferLever,
  secondaryLevers: z.array(OfferLever),
  valueMechanism: z.string(),
  customerProblemSolved: z.string(),
  perceivedValueEffect: z.string(),
  economicEffect: z.string(),
  marginImpact: MarginImpactSchema,
  bestFor: z.array(EntityRefSchema), // e.g., OfferContext references
  bestObjectives: z.array(EntityRefSchema), // MarketingObjective
  bestIndustries: z.array(EntityRefSchema), // Industry
  bestSituations: z.array(EntityRefSchema), // AudienceSituation
  compatibleMechanisms: z.array(EntityRefSchema), // CreativeMechanism
  compatibleCopyGrammars: z.array(EntityRefSchema), // CopyGrammar
  compatibleStoryStructures: z.array(EntityRefSchema), // StoryStructure
  compatibleVisualStructures: z.array(EntityRefSchema), // VisualStructure
  prerequisites: z.array(z.string()),
  requiredEvidence: z.array(EntityRefSchema), // EvidenceRequirement
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  risks: z.array(z.string()),
  worksWith: z.array(z.string()),
  avoidWith: z.array(z.string()),
  antiPatterns: z.array(EntityRefSchema), // reference to AntiPattern entity
  ethicalBoundaries: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence: z.array(EntityRefSchema), // generic Evidence entities
  confidence: ConfidenceLevelSchema,
  status: KnowledgeStatusSchema,
  relationships: z.array(EntityRefSchema), // OfferRelationship
});
export type OfferStructure = z.infer<typeof OfferStructureSchema>;

// ---------------------------------------------------------------------------
// Offer Blueprint – handoff to downstream layers (Story, Visual, Copy)
// ---------------------------------------------------------------------------
export const OfferBlueprintSchema = z.object({
  offerStructureId: z.string(),
  primaryLever: OfferLever,
  secondaryLevers: z.array(OfferLever),
  objective: EntityRefSchema,
  targetSituation: EntityRefSchema,
  customerBarrier: z.string(),
  desiredOutcome: z.string(),
  valueProposition: z.string(),
  components: z.array(OfferComponentSchema),
  price: z.object({
    amount: z.string(),
    currency: z.string(),
  }).optional(),
  eligibility: z.string().optional(),
  validity: z.string().optional(),
  capacity: z.string().optional(),
  proofRequirements: z.array(EntityRefSchema),
  verifiedFacts: z.array(z.string()),
  risks: z.array(z.string()),
  operationalConstraints: z.array(z.string()),
  brandConstraints: z.array(z.string()),
  ethicalConstraints: z.array(z.string()),
  confidence: ConfidenceLevelSchema,
});
export type OfferBlueprint = z.infer<typeof OfferBlueprintSchema>;

// ---------------------------------------------------------------------------
// Offer Learning Model
// ---------------------------------------------------------------------------
export const OfferLearningOutcome = z.enum([
  "worked",
  "failed",
  "neutral",
  "unexpected",
]);
export type OfferLearningOutcome = z.infer<typeof OfferLearningOutcome>;

export const OfferLearningSchema = z.object({
  offerStructureId: z.string(),
  context: z.string(),
  outcome: OfferLearningOutcome,
  observedBehavior: z.string(),
  performanceSignal: z.string().optional(),
  economicSignal: z.string().optional(),
  explanationHypothesis: z.string().optional(),
  confidenceChange: z.string().optional(),
});
export type OfferLearning = z.infer<typeof OfferLearningSchema>;

// ---------------------------------------------------------------------------
// Offer Decision Enumeration
// ---------------------------------------------------------------------------
export const OfferDecision = z.enum([
  "createValue",
  "communicateValue",
  "reducePrice",
  "reduceRisk",
  "increaseConvenience",
  "increaseExperience",
  "noOfferChange",
]);
export type OfferDecision = z.infer<typeof OfferDecision>;

// ---------------------------------------------------------------------------
// Offer Candidate Score (used for ranking)
// ---------------------------------------------------------------------------
export const OfferCandidateScoreSchema = z.object({
  offerStructureId: z.string(),
  valueFit: z.number(),
  barrierFit: z.number(),
  objectiveFit: z.number(),
  brandFit: z.number(),
  marginFit: z.number(),
  capacityFit: z.number(),
  audienceFit: z.number(),
  operationalFit: z.number(),
  evidenceFit: z.number(),
  ethicalSafety: z.number(),
  confidence: z.number(),
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
});
export type OfferCandidateScore = z.infer<typeof OfferCandidateScoreSchema>;

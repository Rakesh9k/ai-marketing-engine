import { z } from 'zod';

/**
 * Creative Intelligence Ontology — core vocabulary (Phase 10.1).
 * Governed by docs/creative-intelligence/CREATIVE_INTELLIGENCE_PRINCIPLES.md. Semantic contracts only: no
 * persistence, no retrieval, no scoring, no seed data.
 */

// ---------------------------------------------------------------------------
// Entity types. `human_motivation` is an addition to the Phase 10.1 brief's list: the brief's own hierarchy,
// examples and test graph all need it (Principles §5, L2), and Phase 10.3 will populate it.
// ---------------------------------------------------------------------------
export const ONTOLOGY_ENTITY_TYPES = [
  'psychology',
  'human_motivation',
  'marketing_principle',
  'audience_situation',
  'insight_pattern',
  'creative_mechanism',
  'hook_pattern',
  'story_structure',
  'copy_structure',
  'visual_structure',
  'offer_mechanism',
  'offer_structure',
  'cta_structure',
  'style_system',
  'format',
  'platform',
  'asset_requirement',
  'anti_pattern',
  'combination_rule',
  'creative_recipe',
] as const;
export type OntologyEntityType = (typeof ONTOLOGY_ENTITY_TYPES)[number];
export const OntologyEntityTypeSchema = z.enum(ONTOLOGY_ENTITY_TYPES);

/** Conceptual layers (Phase 10.1 §5). Informational; used by documentation and validation messages. */
export const ONTOLOGY_LAYERS: Readonly<
  Record<OntologyEntityType, 'intelligence' | 'communication_structure' | 'execution_context' | 'governance'>
> = {
  psychology: 'intelligence',
  human_motivation: 'intelligence',
  marketing_principle: 'intelligence',
  audience_situation: 'intelligence',
  insight_pattern: 'intelligence',
  creative_mechanism: 'intelligence',
  offer_mechanism: 'intelligence',
  offer_structure: 'communication_structure',
  hook_pattern: 'communication_structure',
  story_structure: 'communication_structure',
  copy_structure: 'communication_structure',
  visual_structure: 'communication_structure',
  cta_structure: 'communication_structure',
  style_system: 'execution_context',
  format: 'execution_context',
  platform: 'execution_context',
  asset_requirement: 'execution_context',
  anti_pattern: 'governance',
  combination_rule: 'governance',
  creative_recipe: 'governance',
};

export const ONTOLOGY_STATUSES = ['draft', 'active', 'deprecated', 'experimental'] as const;
export type OntologyStatus = (typeof ONTOLOGY_STATUSES)[number];

/** Principles §9. Names frozen in 10.0; thresholds belong to Phase 10.10. */
export const CONFIDENCE_LEVELS = [
  'unknown',
  'hypothesis',
  'weak_evidence',
  'moderate_evidence',
  'strong_evidence',
  'validated',
] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);
/** Anything above `hypothesis` must be backed by evidence references. */
export const EVIDENCE_REQUIRING_CONFIDENCE: readonly ConfidenceLevel[] = [
  'weak_evidence',
  'moderate_evidence',
  'strong_evidence',
  'validated',
];

/** Principles §10 — epistemic status of a claim. */
export const EPISTEMIC_STATUSES = ['known', 'observed', 'inferred', 'hypothesized', 'validated', 'invalidated'] as const;
export type EpistemicStatus = (typeof EPISTEMIC_STATUSES)[number];
export const EpistemicStatusSchema = z.enum(EPISTEMIC_STATUSES);
export type KnowledgeStatus = EpistemicStatus;
export const KnowledgeStatusSchema = EpistemicStatusSchema;

export type LearningContext = string;
export type EvidenceStrength = ConfidenceLevel;
export type ConfidenceChange = string;

export const FIT_LEVELS = ['strong', 'conditional', 'weak', 'avoid'] as const;
export type FitLevel = (typeof FIT_LEVELS)[number];

export const DECISION_STAGES = [
  'unaware',
  'problem_aware',
  'solution_aware',
  'product_aware',
  'ready_to_act',
  'post_purchase',
] as const;
export type DecisionStage = (typeof DECISION_STAGES)[number];

// ---------------------------------------------------------------------------
// Compatibility (Phase 10.1 §36) — representable, not scored.
// ---------------------------------------------------------------------------
export const COMPATIBILITY_DIMENSIONS = [
  'industry',
  'audience',
  'situation',
  'objective',
  'awareness',
  'offer',
  'platform',
  'format',
  'culture',
  'language',
  'brand_positioning',
  'price_point',
  'purchase_frequency',
  'decision_complexity',
  'customer_intent',
] as const;
export type CompatibilityDimension = (typeof COMPATIBILITY_DIMENSIONS)[number];

export const CompatibilityClaimSchema = z
  .object({
    dimension: z.enum(COMPATIBILITY_DIMENSIONS),
    /** Open vocabulary at this phase (e.g. "high_decision_complexity"); Phase 10.8 will constrain it. */
    value: z.string().min(1),
    fit: z.enum(FIT_LEVELS),
    conditions: z.array(z.string().min(1)).optional(),
    rationale: z.string().min(1).optional(),
    epistemicStatus: z.enum(EPISTEMIC_STATUSES).optional(),
  })
  .strict();
export type CompatibilityClaim = z.infer<typeof CompatibilityClaimSchema>;

/** Negative knowledge, truthful preconditions and ethics are first-class (Principles §13, §14). */
export const ConstraintSchema = z
  .object({
    kind: z.enum(['avoid_when', 'requires', 'ethical', 'truthful_precondition']),
    description: z.string().min(1),
  })
  .strict();
export type OntologyConstraint = z.infer<typeof ConstraintSchema>;

/** Composable cultural context (Phase 10.1 §37): several small facts, never one "India" blob. */
export const CULTURAL_DIMENSIONS = [
  'country',
  'region',
  'city',
  'locality',
  'language',
  'dialect',
  'slang',
  'festival',
  'season',
  'social_norm',
  'family_structure',
  'local_reference',
  'platform_culture',
  'food_culture',
] as const;
export const CulturalContextSchema = z
  .object({ dimension: z.enum(CULTURAL_DIMENSIONS), value: z.string().min(1) })
  .strict();
export type CulturalContext = z.infer<typeof CulturalContextSchema>;

export const DeprecationSchema = z
  .object({
    reason: z.string().min(1),
    deprecatedAt: z.string().min(1),
    /** Same-type successor id. Historical references to the deprecated object stay interpretable. */
    replacedBy: z.string().min(1).optional(),
  })
  .strict();

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const IdSchema = z.string().regex(ID_PATTERN, 'ids are kebab-case: lowercase letters, digits and hyphens');

/** Reference to an ontology entity. Version-agnostic: an id always means "the current head of that entity". */
export const EntityRefSchema = z.object({ type: OntologyEntityTypeSchema, id: IdSchema }).strict();
export type EntityRef = z.infer<typeof EntityRefSchema>;

/** Extension point for later phases: evidence, experiments, performance, learning live outside this ontology. */
export const EXTERNAL_REF_TYPES = ['evidence', 'experiment', 'performance_record', 'learning'] as const;
export const ExternalRefSchema = z
  .object({ type: z.literal('external'), refType: z.enum(EXTERNAL_REF_TYPES), id: z.string().min(1) })
  .strict();
export type ExternalRef = z.infer<typeof ExternalRefSchema>;

export const entityKey = (ref: EntityRef): string => `${ref.type}:${ref.id}`;

// ---------------------------------------------------------------------------
// Shared base for every ontology entity.
// ---------------------------------------------------------------------------
export const baseEntityShape = {
  id: IdSchema,
  name: z.string().min(2),
  slug: IdSchema,
  version: z.number().int().min(1),
  status: z.enum(ONTOLOGY_STATUSES),
  definition: z.string().min(20),
  semanticPurpose: z.string().min(10),
  /** What the object covers, and where it stops. */
  scope: z.string().min(5),
  /** Abstract illustrations of what the object IS (never finished copy or designs). */
  examples: z.array(z.string().min(1)).min(1),
  /** Illustrations of what it is NOT / what must not be stored here. */
  antiExamples: z.array(z.string().min(1)).min(1),
  compatibility: z.array(CompatibilityClaimSchema),
  constraints: z.array(ConstraintSchema),
  // Extension points (Phase 10.10 / 10.9). Optional; never filled with fabricated values.
  assumptions: z.array(z.string().min(1)).optional(),
  confidence: ConfidenceLevelSchema.optional(),
  evidenceRefs: z.array(z.string().min(1)).optional(),
  culturalContexts: z.array(CulturalContextSchema).optional(),
  deprecation: DeprecationSchema.optional(),
  metadata: z.record(z.string(), z.string()).optional(),
} as const;

export function defineEntitySchema<T extends OntologyEntityType, S extends z.ZodRawShape>(type: T, fields: S) {
  return z.object({ ...baseEntityShape, type: z.literal(type), ...fields }).strict();
}

export const stringList = (min = 0) => z.array(z.string().min(1)).min(min);
export const idList = (min = 0) => z.array(IdSchema).min(min);

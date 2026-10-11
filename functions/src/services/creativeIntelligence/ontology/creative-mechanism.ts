import { z } from 'zod';
import { ConfidenceLevelSchema, DECISION_STAGES, defineEntitySchema, idList, stringList } from './ontology-types';
import { EXPLANATION_BASES, EvidenceReferenceSchema, RISK_LEVELS } from './psychology';

/**
 * CREATIVE MECHANISM — a reusable communication mechanism that connects a marketing objective to a human motivation
 * or psychological response in a context. It explains HOW communication works. It is not a hook, caption, visual,
 * template, script or post idea.
 *
 * Links to psychology, motivations, principles, structures, hooks, visuals, copy, CTAs, styles, assets and
 * anti-patterns are RELATIONSHIPS (first-class edges), not fields — one source of truth, no duplication.
 *
 * Phase 10.3 (Marketing Mechanism Bank) extends this single entity with OPTIONAL governance fields. The Mechanism Bank
 * (`../mechanisms`) requires them for every non-draft mechanism. There is deliberately no second mechanism type.
 * Reference lists below (`*Refs`, `requiredAssets` …) hold controlled-vocabulary ids; the bank validates them and
 * installs graph edges once the referenced ontology objects exist.
 */
export const MECHANISM_CATEGORIES = [
  'narrative_framework',
  'proof_authority',
  'cognitive_psychological',
  'pricing_offer_risk',
  'urgency_scarcity',
] as const;
export type MechanismCategory = (typeof MECHANISM_CATEGORIES)[number];

/**
 * `framework` marks well-known communication frameworks (AIDA, problem–agitation–solution): they organise a message
 * rather than creating a psychological effect on their own, and are not pretended to be psychological mechanisms.
 */
export const MECHANISM_KINDS = ['mechanism', 'framework'] as const;
export type MechanismKind = (typeof MECHANISM_KINDS)[number];

export const MECHANISM_OUTCOMES = ['worked', 'underperformed', 'failed', 'neutral', 'unexpected'] as const;

export const CreativeMechanismSchema = defineEntitySchema('creative_mechanism', {
  /** How the mechanism is believed to work, phrased as a hypothesis. */
  psychologicalBasis: z.string().min(15),
  audienceConditions: stringList(),
  awarenessConditions: z.array(z.enum(DECISION_STAGES)),
  applicableObjectives: stringList(1),
  risks: stringList(),
  ethicalConstraints: stringList(),
  /** Facts that must be true (and verified) before this mechanism may be used, e.g. genuinely limited supply. */
  truthfulPreconditions: stringList(),

  // ---- Phase 10.3 Marketing Mechanism Bank governance (optional at the ontology level) -----------------------
  /** Stable, never-renumbered code (MEC-001). The ontology `id` stays the readable reference. */
  code: z.string().regex(/^MEC-\d{3}$/).optional(),
  mechanismCategory: z.enum(MECHANISM_CATEGORIES).optional(),
  kind: z.enum(MECHANISM_KINDS).optional(),
  /** The strategic job. Describes a job, never an outcome. */
  purpose: z.string().min(10).optional(),
  bestFor: stringList().optional(),
  strengths: stringList().optional(),
  /** Mandatory for governed mechanisms: when and how the mechanism can fail. */
  weaknesses: stringList().optional(),
  /** Where it is especially strong. Empty / absent means industry-agnostic, never industry-exclusive. */
  industries: idList().optional(),
  productTypes: idList().optional(),
  audienceSituationRefs: idList().optional(),
  formats: idList().optional(),
  psychologyRefs: idList().optional(),
  marketingPrincipleRefs: idList().optional(),
  hookPatternRefs: idList().optional(),
  storyStructureRefs: idList().optional(),
  visualStructureRefs: idList().optional(),
  copyStructureRefs: idList().optional(),
  /** Assets needed to execute this mechanism honestly. When they are missing the mechanism must not be faked. */
  requiredAssets: idList().optional(),
  optionalAssets: idList().optional(),
  preferredAssets: idList().optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  ethicalSensitivity: z.enum(['standard', 'elevated']).optional(),
  explanationBasis: z.enum(EXPLANATION_BASES).optional(),
  evidence: z.array(EvidenceReferenceSchema).optional(),
  /** Confidence for a specific context, which can differ from the general `confidence`. */
  contextualConfidence: z
    .array(z.object({ context: z.string().min(3), confidence: ConfidenceLevelSchema, rationale: z.string().min(5) }).strict())
    .optional(),
  /** Failure intelligence: updates contextual compatibility and confidence; never rewrites the definition. */
  outcomeLearnings: z
    .array(
      z
        .object({
          outcome: z.enum(MECHANISM_OUTCOMES),
          context: z.string().min(3),
          summary: z.string().min(10),
          effectOnConfidence: z.enum(['raised', 'lowered', 'none']),
        })
        .strict()
    )
    .optional(),
});
export type CreativeMechanism = z.infer<typeof CreativeMechanismSchema>;

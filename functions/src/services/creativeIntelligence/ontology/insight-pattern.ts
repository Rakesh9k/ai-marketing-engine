import { z } from 'zod';
import { ConfidenceLevelSchema, defineEntitySchema, idList, stringList } from './ontology-types';
import { EvidenceReferenceSchema } from './psychology';

/**
 * INSIGHT PATTERN — a structured, context-dependent HYPOTHESIS about an underlying human tension, motivation, barrier
 * or desired outcome that helps explain observable audience behavior and reveals a meaningful marketing opportunity.
 *
 * It is not an observation ("people like biryani"), a broad motivation ("people want convenience"), a segment, a persona,
 * a pain point, a marketing principle or a mechanism. Its epistemic status (observed / inferred / hypothesized …) is
 * carried by `confidence`, `evidence` and `assumptions`.
 *
 * Base fields map to the canonical model as: `insight` = the insight statement, `tension`, `underlyingMotivation`,
 * `barrier`, `implication` = the marketing opportunity. Phase 10.4 (Insight Pattern Library) adds OPTIONAL governance
 * fields below, required by the bank for every non-draft insight. There is no second insight type.
 */
export const INSIGHT_CATEGORIES = [
  'decision', 'convenience', 'trust_risk', 'identity', 'social', 'emotional', 'value_price', 'effort', 'time',
  'choice_complexity', 'aspiration', 'control_autonomy', 'belonging', 'status', 'discovery_curiosity', 'habit_inertia',
  'experience', 'information', 'confidence', 'local_cultural',
] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const INSIGHT_OUTCOME_KINDS = ['functional', 'emotional', 'social', 'identity', 'decision'] as const;

/** Failure intelligence for insights: a hypothesis can be supported, partly supported, unsupported, or only true in a context. */
export const INSIGHT_OUTCOMES = ['worked', 'failed', 'partially_supported', 'unsupported', 'unexpected', 'context_specific'] as const;

export const InsightPatternSchema = defineEntitySchema('insight_pattern', {
  insight: z.string().min(15),
  audienceConditions: stringList(1),
  situationConditions: stringList(1),
  underlyingMotivation: z.string().min(3),
  tension: z.string().min(5),
  barrier: z.string().min(3),
  /** The marketing opportunity: what follows strategically if the insight holds. Never an execution. */
  implication: z.string().min(10),

  // ---- Phase 10.4 Insight Pattern Library governance (optional at the ontology level) --------------------------
  /** Stable, never-renumbered code (INS-001). The ontology `id` stays the readable reference. */
  code: z.string().regex(/^INS-\d{3}$/).optional(),
  category: z.enum(INSIGHT_CATEGORIES).optional(),
  additionalCategories: z.array(z.enum(INSIGHT_CATEGORIES)).optional(),
  /** The observable fact or behavior, as close to evidence as possible and uninterpreted. */
  surfaceObservation: z.string().min(10).optional(),
  /** The recurring pattern: who, does what, when, under what conditions — still without explaining why. */
  behavioralPattern: z.string().min(10).optional(),
  /** The two competing states that create the tension. */
  tensionPair: z.tuple([z.string().min(3), z.string().min(3)]).optional(),
  /** Controlled motivation ids; they become ontology edges when `human_motivation` entities exist (Phase 10.3+). */
  motivationRefs: idList().optional(),
  barrierTypes: idList().optional(),
  desiredOutcomes: z
    .object({
      functional: z.string().min(5).optional(),
      emotional: z.string().min(5).optional(),
      social: z.string().min(5).optional(),
      identity: z.string().min(5).optional(),
      decision: z.string().min(5).optional(),
    })
    .strict()
    .optional(),
  /** Where this insight is claimed to hold. An insight without context is too generic to be one. */
  contextConditions: stringList().optional(),
  audienceSituationRefs: idList().optional(),
  industries: idList().optional(),
  productTypes: idList().optional(),
  objectives: idList().optional(),
  psychologyRefs: idList().optional(),
  marketingPrincipleRefs: idList().optional(),
  mechanismRefs: idList().optional(),
  /** Competing interpretations of the same behavior. The insight must not overfit to one. */
  alternativeExplanations: stringList().optional(),
  limitations: stringList().optional(),
  /** What observation or test would count against the insight. Unfalsifiable insights are not insights. */
  falsifiableBy: z.string().min(15).optional(),
  ethicalConsiderations: stringList().optional(),
  ethicalSensitivity: z.enum(['standard', 'elevated']).optional(),
  /** The same underlying pattern instantiated in different industries (keeps the pattern reusable without being generic). */
  contextualizations: z.array(z.object({ industry: z.string().min(2), statement: z.string().min(20) }).strict()).optional(),
  evidence: z.array(EvidenceReferenceSchema).optional(),
  contextualConfidence: z
    .array(z.object({ context: z.string().min(3), confidence: ConfidenceLevelSchema, rationale: z.string().min(5) }).strict())
    .optional(),
  outcomeLearnings: z
    .array(
      z
        .object({
          outcome: z.enum(INSIGHT_OUTCOMES),
          context: z.string().min(3),
          summary: z.string().min(10),
          effectOnConfidence: z.enum(['raised', 'lowered', 'none']),
        })
        .strict()
    )
    .optional(),
});
export type InsightPattern = z.infer<typeof InsightPatternSchema>;

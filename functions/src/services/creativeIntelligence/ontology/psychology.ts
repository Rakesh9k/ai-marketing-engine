import { z } from 'zod';
import { COMPATIBILITY_DIMENSIONS, ConfidenceLevelSchema, defineEntitySchema, stringList } from './ontology-types';

/**
 * PSYCHOLOGY — a principle or behavioral phenomenon describing how people perceive, process, remember, evaluate or
 * respond to communication. It DESCRIBES behavior; it is never a trick, a hack or a promised outcome.
 * Phrase effects conditionally ("can increase … when …"), never universally.
 *
 * Phase 10.2 (Psychology Bank) extends this single entity with OPTIONAL governance fields (category, conditions,
 * intensity, ethical boundary, evidence …). They are optional here so the ontology stays general; the Psychology Bank
 * (`../psychology`) requires them for every non-draft principle. There is deliberately no second psychology type.
 */

/** Extensible: add a value here (and a taxonomy entry in the bank) to introduce a category such as `memory`. */
export const PSYCHOLOGY_CATEGORIES = ['attention', 'desire', 'trust', 'decision', 'emotion'] as const;
export type PsychologyCategory = (typeof PSYCHOLOGY_CATEGORIES)[number];

export const PSYCHOLOGY_INTENSITIES = ['low', 'moderate', 'high', 'context-dependent'] as const;
export type PsychologyIntensity = (typeof PSYCHOLOGY_INTENSITIES)[number];

export const RISK_LEVELS = ['low', 'moderate', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** How the "why it may work" explanation is held — never an unsupported universal ("the brain is wired to …"). */
export const EXPLANATION_BASES = [
  'established_finding',
  'supported_explanation',
  'plausible_mechanism',
  'hypothesis',
  'heuristic',
] as const;
export type ExplanationBasis = (typeof EXPLANATION_BASES)[number];

export const EVIDENCE_TYPES = [
  'academic_research',
  'behavioral_experiment',
  'meta_analysis',
  'systematic_review',
  'industry_research',
  'historical_marketing_evidence',
  'mitra_experiment',
  'ab_test',
  'customer_research',
  'qualitative_observation',
  'expert_framework',
  'benchmark',
  'customer_feedback',
  'search_behavior_data',
  'campaign_performance',
  'business_owner_input',
  'ai_generated_hypothesis',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EvidenceReferenceSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(EVIDENCE_TYPES),
    summary: z.string().min(10),
    /** Citation or internal pointer. Never invented: leave out if unknown. */
    source: z.string().min(1).optional(),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    recency: z.string().min(1).optional(),
    sampleSize: z.number().int().positive().optional(),
    /** The population / setting the evidence is about; evidence is not assumed to transfer. */
    context: z.string().min(1).optional(),
    direction: z.enum(['supports', 'contradicts', 'mixed']),
    /** What the item is: a recorded fact, an interpretation of facts, or a hypothesis. They are never equivalent. */
    role: z.enum(['observed_fact', 'interpretation', 'hypothesis']).optional(),
  })
  .strict();
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const PsychologyConditionSchema = z
  .object({
    description: z.string().min(5),
    /** Optional machine-readable form so conditions can later be matched against a situation (no scoring here). */
    dimension: z.enum(COMPATIBILITY_DIMENSIONS).optional(),
    value: z.string().min(1).optional(),
  })
  .strict();
export type PsychologyCondition = z.infer<typeof PsychologyConditionSchema>;

export const PsychologyRiskSchema = z
  .object({ description: z.string().min(5), severity: z.enum(RISK_LEVELS) })
  .strict();
export type PsychologyRisk = z.infer<typeof PsychologyRiskSchema>;

export const PSYCHOLOGY_OUTCOMES = ['worked', 'failed', 'neutral', 'unexpected'] as const;

export const PsychologySchema = defineEntitySchema('psychology', {
  psychologicalDomain: z.enum(['attention', 'perception', 'memory', 'judgment_and_decision', 'emotion', 'social', 'identity', 'motivation']),
  /** Conditions under which the phenomenon is relevant. */
  relevantConditions: stringList(1),
  /** Possible (not guaranteed) effects. */
  possibleEffects: stringList(1),
  risks: stringList(),
  ethicalConsiderations: stringList(1),

  // ---- Phase 10.2 Psychology Bank governance (optional at the ontology level) --------------------------------
  category: z.enum(PSYCHOLOGY_CATEGORIES).optional(),
  additionalCategories: z.array(z.enum(PSYCHOLOGY_CATEGORIES)).optional(),
  /** Academic vs practical language (bank §92–93). */
  technicalDefinition: z.string().min(10).optional(),
  creativeInterpretation: z.string().min(10).optional(),
  strategicImplication: z.string().min(10).optional(),
  whatItDoes: z.string().min(10).optional(),
  whyItMayWork: z.string().min(10).optional(),
  explanationBasis: z.enum(EXPLANATION_BASES).optional(),
  whenToUse: z.array(PsychologyConditionSchema).optional(),
  whenNotToUse: z.array(PsychologyConditionSchema).optional(),
  appropriateIntensity: z.enum(PSYCHOLOGY_INTENSITIES).optional(),
  /** Abstract ladder (never finished copy). `excessive` can never be recommended. */
  intensityLadder: z
    .array(z.object({ level: z.enum(['low', 'moderate', 'high', 'excessive']), description: z.string().min(5), recommended: z.boolean() }).strict())
    .optional(),
  riskLevel: z.enum(RISK_LEVELS).optional(),
  riskDetails: z.array(PsychologyRiskSchema).optional(),
  ethicalBoundary: z.string().min(10).optional(),
  /** `elevated` principles are ones whose misuse is deception (scarcity, social proof …): they need more governance. */
  ethicalSensitivity: z.enum(['standard', 'elevated']).optional(),
  safeApplications: stringList().optional(),
  prohibitedApplications: stringList().optional(),
  /** Self-critique (bank §76). */
  doesNotExplain: stringList().optional(),
  alternativeExplanations: stringList().optional(),
  vulnerableAudienceGuidance: stringList().optional(),
  /** Structured evidence. Confidence is capped by what this supports (see bank psychology-evidence). */
  evidence: z.array(EvidenceReferenceSchema).optional(),
  /** Confidence for a specific context, which can differ from the general `confidence` (bank §50–51). */
  contextualConfidence: z
    .array(z.object({ context: z.string().min(3), confidence: ConfidenceLevelSchema, rationale: z.string().min(5) }).strict())
    .optional(),
  /** Failure intelligence: worked / failed / neutral / unexpected, always with its context (bank §73, §97). */
  outcomeLearnings: z
    .array(
      z
        .object({
          outcome: z.enum(PSYCHOLOGY_OUTCOMES),
          context: z.string().min(3),
          summary: z.string().min(10),
          effectOnConfidence: z.enum(['raised', 'lowered', 'none']),
        })
        .strict()
    )
    .optional(),
});
export type Psychology = z.infer<typeof PsychologySchema>;

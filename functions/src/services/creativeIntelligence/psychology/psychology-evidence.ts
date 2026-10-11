import {
  CONFIDENCE_LEVELS,
  type ConfidenceLevel,
  type EvidenceReference,
  type EvidenceType,
} from '../ontology';

/**
 * Evidence model for psychology (bank §49–51). Evidence is not equally reliable, and an AI-generated hypothesis is
 * never evidence. This module answers one question only: what is the highest confidence a body of evidence could
 * justify? It does not compute scores or rank principles.
 */
export type { EvidenceReference, EvidenceType };

/** Types that report observation or experiment, as opposed to opinion, framework or model output. */
const EMPIRICAL: ReadonlySet<EvidenceType> = new Set([
  'academic_research', 'behavioral_experiment', 'meta_analysis', 'systematic_review', 'mitra_experiment', 'ab_test',
  'customer_research', 'industry_research', 'historical_marketing_evidence', 'customer_feedback', 'search_behavior_data',
]);
const SYNTHESIS: ReadonlySet<EvidenceType> = new Set(['meta_analysis', 'systematic_review']);
const IN_CONTEXT_TESTS: ReadonlySet<EvidenceType> = new Set(['mitra_experiment', 'ab_test']);

export const isEmpiricalEvidence = (e: EvidenceReference): boolean => EMPIRICAL.has(e.type);

const rank = (level: ConfidenceLevel): number => CONFIDENCE_LEVELS.indexOf(level);

/**
 * The highest confidence this evidence could justify.
 * - none / AI-generated only / only contradicting  → hypothesis
 * - opinion, frameworks, benchmarks, qualitative   → weak_evidence
 * - one supporting empirical source of medium+ quality → moderate_evidence
 * - a high-quality synthesis, or ≥2 high-quality empirical sources → strong_evidence
 * - `validated` additionally needs a high-quality in-context test (Mitra experiment / A/B test)
 * Contradicting evidence caps the ceiling at moderate_evidence until it is explained.
 */
export function confidenceCeiling(evidence: readonly EvidenceReference[] = []): ConfidenceLevel {
  const supporting = evidence.filter((e) => e.direction !== 'contradicts' && e.type !== 'ai_generated_hypothesis');
  const contradicting = evidence.some((e) => e.direction === 'contradicts');
  if (supporting.length === 0) return 'hypothesis';

  const empirical = supporting.filter(isEmpiricalEvidence);
  const solid = empirical.filter((e) => e.quality === 'medium' || e.quality === 'high');
  const high = empirical.filter((e) => e.quality === 'high');

  let ceiling: ConfidenceLevel = 'weak_evidence';
  if (solid.length >= 1) ceiling = 'moderate_evidence';
  if (high.some((e) => SYNTHESIS.has(e.type)) || high.length >= 2) ceiling = 'strong_evidence';
  if (ceiling === 'strong_evidence' && high.some((e) => IN_CONTEXT_TESTS.has(e.type)) && !contradicting) ceiling = 'validated';
  if (contradicting && rank(ceiling) > rank('moderate_evidence')) ceiling = 'moderate_evidence';
  return ceiling;
}

export function confidenceExceedsEvidence(confidence: ConfidenceLevel | undefined, evidence: readonly EvidenceReference[] | undefined): boolean {
  return rank(confidence ?? 'unknown') > rank(confidenceCeiling(evidence));
}

/** True when the principle holds a claim as a finding rather than as a plausible mechanism, hypothesis or heuristic. */
export const CLAIMS_EVIDENCE_BASES: readonly string[] = ['established_finding', 'supported_explanation'];

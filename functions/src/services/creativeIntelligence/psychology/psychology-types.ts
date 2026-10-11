import {
  PSYCHOLOGY_CATEGORIES,
  type CompatibilityClaim,
  type CompatibilityDimension,
  type ConfidenceLevel,
  type EntityOfType,
  type EntityRef,
  type ExplanationBasis,
  type OntologyConstraint,
  type OntologyRelationshipType,
  type OntologyStatus,
  type PsychologyCategory,
  type PsychologyCondition,
  type PsychologyIntensity,
  type RiskLevel,
} from '../ontology';

/**
 * Psychology Bank (Phase 10.2). The bank is a GOVERNED VIEW of the Phase 10.1 `psychology` ontology entity — one
 * identity system, one registry, one relationship vocabulary. A bank principle IS an ontology `psychology` entity.
 *
 * It describes behavioral phenomena; it never promises outcomes and never generates executions.
 */
export type PsychologyPrinciple = EntityOfType<'psychology'>;
export { PSYCHOLOGY_CATEGORIES };
export type { PsychologyCategory, PsychologyCondition };

// ---------------------------------------------------------------------------
// Taxonomy — extensible. To add a category: add it to PSYCHOLOGY_CATEGORIES (ontology/psychology.ts) and to
// PSYCHOLOGY_TAXONOMY below; nothing else is restructured.
// ---------------------------------------------------------------------------
export interface PsychologyCategoryDefinition {
  readonly id: PsychologyCategory;
  readonly label: string;
  readonly purpose: string;
  /** Concepts the taxonomy intends to cover. NOT entities: a concept becomes real only when authored and validated. */
  readonly plannedConcepts: readonly string[];
}

export const PSYCHOLOGY_TAXONOMY: Readonly<Record<PsychologyCategory, PsychologyCategoryDefinition>> = {
  attention: {
    id: 'attention',
    label: 'Attention',
    purpose: 'Phenomena affecting whether something is noticed, processed or retained long enough for communication to occur.',
    plannedConcepts: ['curiosity', 'novelty', 'surprise', 'pattern-interruption', 'contrast', 'specificity', 'incompletion', 'salience', 'distinctiveness', 'information-gap', 'expectation-violation', 'visual-isolation', 'information-seeking'],
  },
  desire: {
    id: 'desire',
    label: 'Desire',
    purpose: 'States and drivers associated with desired outcomes. Explains how desire may shape perception, evaluation or behavior; the Human Motivation layer remains the motivation ontology.',
    plannedConcepts: ['pleasure', 'comfort', 'status', 'belonging', 'identity', 'aspiration', 'convenience-preference', 'achievement', 'autonomy', 'recognition', 'relief', 'novelty', 'security', 'control', 'self-expression', 'ikea-effect'],
  },
  trust: {
    id: 'trust',
    label: 'Trust',
    purpose: 'Phenomena affecting perceived credibility and uncertainty, especially for local businesses with little reputation yet.',
    plannedConcepts: ['social-proof', 'authority', 'direct-observation', 'transparency', 'specificity', 'familiarity', 'consistency', 'evidence', 'credibility', 'authenticity', 'similarity', 'source-independence', 'reciprocity', 'identification'],
  },
  decision: {
    id: 'decision',
    label: 'Decision',
    purpose: 'Phenomena affecting how people weigh options, effort, risk and timing when choosing.',
    plannedConcepts: ['urgency', 'scarcity', 'risk-reduction', 'choice-reduction', 'anchoring', 'loss-aversion', 'cognitive-load-reduction', 'default-effects', 'framing', 'commitment', 'social-validation', 'effort-reduction', 'endowment-effect'],
  },
  emotion: {
    id: 'emotion',
    label: 'Emotion',
    purpose: 'Emotional states or responses — treated as responses to a situation, not as a creative colour.',
    plannedConcepts: ['joy', 'relief', 'nostalgia', 'anticipation', 'pride', 'excitement', 'belonging', 'frustration', 'hope', 'fear', 'curiosity', 'confidence', 'love', 'surprise', 'delight', 'empathy', 'narrative-transportation'],
  },
};

/** Categories the roadmap anticipates. They are NOT valid yet: using one fails category validation until added. */
export const FUTURE_PSYCHOLOGY_CATEGORIES = [
  'memory', 'identity', 'social_behavior', 'perception', 'learning', 'habit', 'risk', 'motivation', 'cognitive_processing',
] as const;

/** Roles in a creative (bank §70). Prevents an unstructured pile of triggers. */
export const PSYCHOLOGY_ROLES = ['primary', 'secondary', 'supporting'] as const;
export type PsychologyRole = (typeof PSYCHOLOGY_ROLES)[number];

// ---------------------------------------------------------------------------
// Authoring: a bank entry = one ontology psychology entity + the relationships it declares.
// Relationships are declared by id so they can be installed once their targets exist (mechanisms arrive in 10.6).
// ---------------------------------------------------------------------------
export interface PsychologyLink {
  readonly relationship: OntologyRelationshipType;
  readonly target: EntityRef;
  readonly strength?: 'strong' | 'moderate' | 'weak';
  readonly conditions?: readonly string[];
  readonly rationale?: string;
}

export interface PsychologyBankEntry {
  readonly principle: PsychologyPrinciple;
  readonly links: readonly PsychologyLink[];
}

/** A condition authored as text, or with its machine-readable (dimension, value) form. */
export type ConditionInput = string | { description: string; dimension?: CompatibilityDimension; value?: string };

export interface PrincipleSpec {
  id: string;
  name: string;
  category: PsychologyCategory;
  additionalCategories?: PsychologyCategory[];
  domain: PsychologyPrinciple['psychologicalDomain'];
  definition: string;
  technicalDefinition: string;
  creativeInterpretation: string;
  strategicImplication: string;
  whatItDoes: string;
  whyItMayWork: string;
  explanationBasis: ExplanationBasis;
  scope: string;
  whenToUse: ConditionInput[];
  whenNotToUse: ConditionInput[];
  intensity: PsychologyIntensity;
  intensityLadder?: NonNullable<PsychologyPrinciple['intensityLadder']>;
  riskLevel: RiskLevel;
  risks: [description: string, severity: RiskLevel][];
  ethicalBoundary: string;
  sensitivity: 'standard' | 'elevated';
  safeApplications: string[];
  prohibitedApplications: string[];
  doesNotExplain: string[];
  alternativeExplanations: string[];
  vulnerableAudienceGuidance?: string[];
  examples: string[];
  antiExamples: string[];
  status?: OntologyStatus;
  confidence?: ConfidenceLevel;
  assumptions?: string[];
}

const toCondition = (c: ConditionInput): PsychologyCondition => (typeof c === 'string' ? { description: c } : c);

/**
 * Builds the ontology `psychology` entity from a bank spec, deriving the ontology's generic fields
 * (relevantConditions, possibleEffects, constraints, compatibility …) from the bank's own, so nothing is stated twice.
 * Defaults are deliberately honest: version 1, `experimental`, confidence `hypothesis`, no evidence asserted.
 */
export function definePrinciple(spec: PrincipleSpec, links: PsychologyLink[] = []): PsychologyBankEntry {
  const whenToUse = spec.whenToUse.map(toCondition);
  const whenNotToUse = spec.whenNotToUse.map(toCondition);

  const compatibility: CompatibilityClaim[] = [
    ...whenToUse.filter((c) => c.dimension && c.value).map((c) => ({ dimension: c.dimension as CompatibilityDimension, value: c.value as string, fit: 'conditional' as const, rationale: c.description })),
    ...whenNotToUse.filter((c) => c.dimension && c.value).map((c) => ({ dimension: c.dimension as CompatibilityDimension, value: c.value as string, fit: 'avoid' as const, rationale: c.description })),
  ];
  const constraints: OntologyConstraint[] = [
    ...whenNotToUse.map((c) => ({ kind: 'avoid_when' as const, description: c.description })),
    ...spec.prohibitedApplications.map((description) => ({ kind: 'ethical' as const, description })),
  ];

  const principle: PsychologyPrinciple = {
    id: spec.id,
    slug: spec.id,
    type: 'psychology',
    name: spec.name,
    version: 1,
    status: spec.status ?? 'experimental',
    definition: spec.definition,
    semanticPurpose: `Informs creative strategy about ${spec.name.toLowerCase()} as a behavioral phenomenon; it does not prescribe an execution or promise an outcome.`,
    scope: spec.scope,
    examples: spec.examples,
    antiExamples: spec.antiExamples,
    compatibility,
    constraints,
    confidence: spec.confidence ?? 'hypothesis',
    assumptions: spec.assumptions,
    psychologicalDomain: spec.domain,
    relevantConditions: whenToUse.map((c) => c.description),
    possibleEffects: [spec.whatItDoes],
    risks: spec.risks.map(([description]) => description),
    ethicalConsiderations: [spec.ethicalBoundary],
    category: spec.category,
    additionalCategories: spec.additionalCategories,
    technicalDefinition: spec.technicalDefinition,
    creativeInterpretation: spec.creativeInterpretation,
    strategicImplication: spec.strategicImplication,
    whatItDoes: spec.whatItDoes,
    whyItMayWork: spec.whyItMayWork,
    explanationBasis: spec.explanationBasis,
    whenToUse,
    whenNotToUse,
    appropriateIntensity: spec.intensity,
    intensityLadder: spec.intensityLadder,
    riskLevel: spec.riskLevel,
    riskDetails: spec.risks.map(([description, severity]) => ({ description, severity })),
    ethicalBoundary: spec.ethicalBoundary,
    ethicalSensitivity: spec.sensitivity,
    safeApplications: spec.safeApplications,
    prohibitedApplications: spec.prohibitedApplications,
    doesNotExplain: spec.doesNotExplain,
    alternativeExplanations: spec.alternativeExplanations,
    vulnerableAudienceGuidance: spec.vulnerableAudienceGuidance,
  };
  return { principle, links };
}

/** Shorthand for a machine-readable condition. */
export const cond = (description: string, dimension?: CompatibilityDimension, value?: string): ConditionInput => ({ description, dimension, value });

export const link = (
  relationship: OntologyRelationshipType,
  type: EntityRef['type'],
  id: string,
  extra: { strength?: 'strong' | 'moderate' | 'weak'; conditions?: string[]; rationale?: string } = {}
): PsychologyLink => ({ relationship, target: { type, id }, ...extra });

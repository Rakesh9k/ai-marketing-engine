import {
  MECHANISM_CATEGORIES,
  MECHANISM_KINDS,
  type CompatibilityClaim,
  type ConfidenceLevel,
  type DecisionStage,
  type EntityOfType,
  type MechanismCategory,
  type MechanismKind,
  type OntologyConstraint,
  type OntologyStatus,
  type RiskLevel,
} from '../ontology';
import type { PsychologyLink } from '../psychology';

/**
 * Marketing Mechanism Bank (Phase 10.3). A bank mechanism IS an ontology `creative_mechanism` entity — same identity
 * system, same registry, same relationship vocabulary as Phases 10.1–10.2. This module adds the taxonomy, an authoring
 * builder and nothing that duplicates ontology infrastructure.
 *
 * A mechanism is a reusable METHOD of communicating that may create a strategic or behavioral effect under conditions.
 * It is not an execution, a psychological phenomenon, a structure, a trend or a promised outcome.
 */
export type MarketingMechanism = EntityOfType<'creative_mechanism'>;
export { MECHANISM_CATEGORIES, MECHANISM_KINDS };
export type { MechanismCategory, MechanismKind };

export interface MechanismCategoryDefinition {
  readonly id: MechanismCategory;
  readonly label: string;
  readonly purpose: string;
  /** Initial-library target range; quality outranks quantity, so the range is a guide, not a quota. */
  readonly targetRange: readonly [number, number];
}

export const MECHANISM_TAXONOMY: Readonly<Record<MechanismCategory, MechanismCategoryDefinition>> = {
  narrative_framework: {
    id: 'narrative_framework', label: 'Narrative & Framework',
    purpose: 'Ways of organising a message as a story, process or recognised communication framework.',
    targetRange: [22, 30],
  },
  proof_authority: {
    id: 'proof_authority', label: 'Proof & Authority',
    purpose: 'Ways of supporting a claim with genuine evidence, demonstration or credible third parties.',
    targetRange: [22, 30],
  },
  cognitive_psychological: {
    id: 'cognitive_psychological', label: 'Cognitive & Psychological',
    purpose: 'Communication methods built on how people notice, interpret, identify and decide — each grounded in a Psychology Bank principle, not a replacement for one.',
    targetRange: [22, 30],
  },
  pricing_offer_risk: {
    id: 'pricing_offer_risk', label: 'Pricing, Offer & Risk',
    purpose: 'Ways of presenting price, offer composition and risk truthfully so the real value and terms are easy to understand.',
    targetRange: [20, 26],
  },
  urgency_scarcity: {
    id: 'urgency_scarcity', label: 'Urgency & Scarcity',
    purpose: 'Ways of communicating REAL time windows and REAL limits. A manufactured limit is never a valid mechanism.',
    targetRange: [14, 20],
  },
};

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------
export type MechanismLink = PsychologyLink;

export interface MechanismBankEntry {
  readonly mechanism: MarketingMechanism;
  readonly links: readonly MechanismLink[];
}

/** [mechanismId, why, structural?] — `avoid` is contextual tension unless marked structural. */
export type AvoidSpec = readonly [id: string, why: string] | readonly [id: string, why: string, structural: 'structural'];

/**
 * Compact authoring form. Short keys keep ~120 entries reviewable; `defineMechanism` expands them into the full
 * ontology entity and its relationships.
 */
export interface MechanismSpec {
  /** Stable code. Never renumbered, never reused; inserting a mechanism takes the next free code in its band. */
  c: string;
  id: string;
  n: string;
  cat: MechanismCategory;
  kind?: MechanismKind;
  /** definition */ d: string;
  /** purpose (the job, not an outcome) */ p: string;
  /** hypothesised basis */ basis?: string;
  /** bestFor */ bf: string[];
  /** strengths */ st: string[];
  /** weaknesses (mandatory) */ wk: string[];
  /** psychology ids (authored principles become edges; planned concepts are tracked as coverage gaps) */ psy: string[];
  /** marketing principle ids */ mp: string[];
  /** objectives */ ob: string[];
  /** audience situations where it is a good fit */ sit?: string[];
  /** audience situations where it is weak or should be rejected */ weak?: string[];
  stages?: DecisionStage[];
  /** industries where it is especially strong (empty = agnostic) */ ind?: string[];
  prod?: string[];
  fmt?: string[];
  hook?: string[];
  story?: string[];
  vis?: string[];
  copy?: string[];
  /** assets required to execute honestly */ req: string[];
  opt?: string[];
  pref?: string[];
  /** compatible mechanisms */ w?: string[];
  /** often combined with */ o?: string[];
  /** supports (this mechanism strengthens the others) */ s?: string[];
  /** avoid combining with, and why */ av?: AvoidSpec[];
  /** anti-pattern ids that constrain it (mandatory) */ anti: string[];
  /** ethical boundaries */ eth: string[];
  /** extra truthful preconditions (category defaults are added for elevated mechanisms) */ pre?: string[];
  risk?: RiskLevel;
  sens?: 'standard' | 'elevated';
  scope?: string;
  ex?: string[];
  antiEx?: string[];
  status?: OntologyStatus;
  conf?: ConfidenceLevel;
}

/** Category defaults: what is true unless an entry says otherwise. */
const CATEGORY_DEFAULTS: Readonly<
  Record<MechanismCategory, { risk: RiskLevel; sens: 'standard' | 'elevated'; pre: string[]; eth: string[] }>
> = {
  narrative_framework: { risk: 'low', sens: 'standard', pre: [], eth: ['Tell only true stories and describe real events and people accurately.'] },
  proof_authority: {
    risk: 'moderate', sens: 'elevated',
    pre: ['The proof exists, is genuine, current and relevant to the claim being made.'],
    eth: ['Never fabricate, alter, purchase or misattribute proof, and disclose any commercial relationship.'],
  },
  cognitive_psychological: { risk: 'moderate', sens: 'standard', pre: [], eth: ['Use the effect to make real value clearer, not to bypass informed choice.'] },
  pricing_offer_risk: {
    risk: 'moderate', sens: 'elevated',
    pre: ['Prices, components, terms and any guarantee are real, disclosed and honoured.'],
    eth: ['Show the full price and material conditions; never inflate values or hide terms.'],
  },
  urgency_scarcity: {
    risk: 'high', sens: 'elevated',
    pre: ['The time limit or availability limit is real, verifiable and honoured.'],
    eth: ['Never manufacture scarcity or urgency; if the limit stops being real, stop using the mechanism.'],
  },
};

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

export function defineMechanism(s: MechanismSpec): MechanismBankEntry {
  const d = CATEGORY_DEFAULTS[s.cat];
  const sensitivity = s.sens ?? d.sens;
  const eth = unique([...(s.eth ?? []), ...(sensitivity === 'elevated' ? d.eth : [])]);
  const pre = unique([...(sensitivity === 'elevated' ? d.pre : []), ...(s.pre ?? [])]);

  const compatibility: CompatibilityClaim[] = [
    ...(s.ind ?? []).map((value) => ({ dimension: 'industry' as const, value, fit: 'conditional' as const })),
    ...(s.sit ?? []).map((value) => ({ dimension: 'situation' as const, value, fit: 'conditional' as const })),
    ...(s.weak ?? []).map((value) => ({ dimension: 'situation' as const, value, fit: 'weak' as const })),
  ];
  const constraints: OntologyConstraint[] = [
    ...(s.weak ?? []).map((value) => ({ kind: 'avoid_when' as const, description: `the audience situation is ${value.replace(/-/g, ' ')}` })),
    ...eth.map((description) => ({ kind: 'ethical' as const, description })),
    ...pre.map((description) => ({ kind: 'truthful_precondition' as const, description })),
  ];

  const mechanism: MarketingMechanism = {
    id: s.id,
    slug: s.id,
    type: 'creative_mechanism',
    name: s.n,
    version: 1,
    status: s.status ?? 'experimental',
    definition: s.d,
    semanticPurpose: `Names ${s.n.toLowerCase()} as a reusable communication method so strategy can select, combine or reject it; it prescribes no execution.`,
    scope: s.scope ?? `Covers ${s.n.toLowerCase()} as a method. Excludes any specific caption, reel, layout or campaign that uses it.`,
    examples: s.ex ?? [`Applying ${s.n.toLowerCase()} to ${s.p.charAt(0).toLowerCase()}${s.p.slice(1)}`],
    antiExamples: s.antiEx ?? [`A finished creative that happens to use ${s.n.toLowerCase()}`],
    compatibility,
    constraints,
    confidence: s.conf ?? 'hypothesis',
    psychologicalBasis: s.basis ?? `May work through ${s.psy.map((p) => p.replace(/-/g, ' ')).join(', ')} when its conditions hold`,
    audienceConditions: [],
    awarenessConditions: s.stages ?? [],
    applicableObjectives: s.ob,
    risks: s.wk,
    ethicalConstraints: eth,
    truthfulPreconditions: pre,
    code: s.c,
    mechanismCategory: s.cat,
    kind: s.kind ?? 'mechanism',
    purpose: s.p,
    bestFor: s.bf,
    strengths: s.st,
    weaknesses: s.wk,
    industries: s.ind ?? [],
    productTypes: s.prod ?? [],
    audienceSituationRefs: s.sit ?? [],
    formats: s.fmt ?? [],
    psychologyRefs: s.psy,
    marketingPrincipleRefs: s.mp,
    hookPatternRefs: s.hook ?? [],
    storyStructureRefs: s.story ?? [],
    visualStructureRefs: s.vis ?? [],
    copyStructureRefs: s.copy ?? [],
    requiredAssets: s.req,
    optionalAssets: s.opt ?? [],
    preferredAssets: s.pref ?? [],
    riskLevel: s.risk ?? d.risk,
    ethicalSensitivity: sensitivity,
    explanationBasis: (s.kind ?? 'mechanism') === 'framework' ? 'heuristic' : 'plausible_mechanism',
  };

  const rel = (relationship: MechanismLink['relationship'], type: MechanismLink['target']['type'], id: string, extra: Partial<MechanismLink> = {}): MechanismLink => ({
    relationship,
    target: { type, id },
    ...extra,
  });
  const links: MechanismLink[] = [
    ...(s.w ?? []).map((id) => rel('compatibleWith', 'creative_mechanism', id)),
    ...(s.o ?? []).map((id) => rel('oftenCombinedWith', 'creative_mechanism', id)),
    ...(s.s ?? []).map((id) => rel('supports', 'creative_mechanism', id)),
    ...(s.av ?? []).map(([id, why, structural]) =>
      structural === 'structural'
        ? rel('conflictsWith', 'creative_mechanism', id, { rationale: why })
        : rel('notRecommendedWith', 'creative_mechanism', id, { conditions: [why], rationale: 'Contextual tension, not an absolute incompatibility.' })
    ),
    ...s.psy.map((id) => rel('uses', 'psychology', id)),
    ...s.anti.map((id) => rel('constrainedBy', 'anti_pattern', id)),
  ];
  return { mechanism, links };
}

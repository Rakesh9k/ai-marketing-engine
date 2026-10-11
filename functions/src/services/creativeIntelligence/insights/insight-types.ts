import {
  INSIGHT_CATEGORIES,
  INSIGHT_OUTCOME_KINDS,
  type CompatibilityClaim,
  type ConfidenceLevel,
  type EntityOfType,
  type InsightCategory,
  type OntologyStatus,
} from '../ontology';
import type { PsychologyLink } from '../psychology';

/**
 * Insight Pattern Library (Phase 10.4). An insight IS an ontology `insight_pattern` entity in the shared registry.
 *
 * Canonical model (each layer is a separate field, deliberately):
 *   OBSERVATION → PATTERN → TENSION → MOTIVATION + BARRIER → INSIGHT → DESIRED OUTCOME → MARKETING OPPORTUNITY
 * and only afterwards: marketing principle → psychology → mechanism → structure → execution.
 *
 * An insight is a context-dependent HYPOTHESIS. Behavior is evidence; it is not automatically an explanation.
 */
export type InsightPatternEntity = EntityOfType<'insight_pattern'>;
export { INSIGHT_CATEGORIES, INSIGHT_OUTCOME_KINDS };
export type { InsightCategory };

export interface InsightCategoryDefinition {
  readonly id: InsightCategory;
  readonly label: string;
  readonly tensionFamily: string;
  /** Categories where misuse can exploit people; their insights need explicit ethical governance. */
  readonly elevated: boolean;
}

export const INSIGHT_TAXONOMY: Readonly<Record<InsightCategory, InsightCategoryDefinition>> = {
  decision: { id: 'decision', label: 'Decision', tensionFamily: 'Wanting the right choice vs the effort of deciding', elevated: false },
  convenience: { id: 'convenience', label: 'Convenience', tensionFamily: 'Ease vs the sense of compromise', elevated: false },
  trust_risk: { id: 'trust_risk', label: 'Trust & Risk', tensionFamily: 'Wanting the outcome vs fear of being wrong or misled', elevated: false },
  identity: { id: 'identity', label: 'Identity', tensionFamily: 'Who I am vs who the purchase says I am', elevated: true },
  social: { id: 'social', label: 'Social', tensionFamily: 'My preference vs the group', elevated: true },
  emotional: { id: 'emotional', label: 'Emotional', tensionFamily: 'Wanting a feeling vs the feeling that gets in the way', elevated: true },
  value_price: { id: 'value_price', label: 'Value & Price', tensionFamily: 'Paying vs being sure it was worth it', elevated: false },
  effort: { id: 'effort', label: 'Effort', tensionFamily: 'The outcome vs the work of getting it', elevated: false },
  time: { id: 'time', label: 'Time', tensionFamily: 'Needing it now vs needing it to be right', elevated: false },
  choice_complexity: { id: 'choice_complexity', label: 'Choice & Complexity', tensionFamily: 'Freedom of choice vs overload', elevated: false },
  aspiration: { id: 'aspiration', label: 'Aspiration', tensionFamily: 'Who I am vs who I want to become', elevated: true },
  control_autonomy: { id: 'control_autonomy', label: 'Control & Autonomy', tensionFamily: 'Guidance vs staying in charge', elevated: false },
  belonging: { id: 'belonging', label: 'Belonging', tensionFamily: 'Being part of something vs being myself', elevated: true },
  status: { id: 'status', label: 'Status', tensionFamily: 'Being seen well vs seeming to try too hard', elevated: true },
  discovery_curiosity: { id: 'discovery_curiosity', label: 'Discovery & Curiosity', tensionFamily: 'Wanting the new vs wanting the safe', elevated: false },
  habit_inertia: { id: 'habit_inertia', label: 'Habit & Inertia', tensionFamily: 'Dissatisfaction vs the cost of changing', elevated: false },
  experience: { id: 'experience', label: 'Experience', tensionFamily: 'The promise vs the lived experience', elevated: false },
  information: { id: 'information', label: 'Information', tensionFamily: 'Not enough vs too much to go on', elevated: false },
  confidence: { id: 'confidence', label: 'Confidence', tensionFamily: 'Wanting to act vs not knowing it will work for me', elevated: false },
  local_cultural: { id: 'local_cultural', label: 'Local & Cultural', tensionFamily: 'Shared local meaning vs one-size-fits-all', elevated: true },
};

// ---------------------------------------------------------------------------
// Authoring
// ---------------------------------------------------------------------------
export type InsightLink = PsychologyLink;

export interface InsightBankEntry {
  readonly insight: InsightPatternEntity;
  readonly links: readonly InsightLink[];
}

/** Compact authoring form. `defineInsight` expands it into the ontology entity and its relationships. */
export interface InsightSpec {
  /** Stable code. Never renumbered, never reused. */ c: string;
  id: string;
  /** name */ n: string;
  /** primary category */ cat: InsightCategory;
  /** additional categories */ cats?: InsightCategory[];
  /** surface observation: observable, uninterpreted */ obs: string;
  /** behavioral pattern: who does what, when, under what conditions — without why */ pat: string;
  /** the two competing states */ ten: [string, string];
  /** human motivation, in words */ mt: string;
  /** motivation ids (ingredients, not the insight) */ mot: string[];
  /** barrier, in words */ bar: string;
  bt: string[];
  /** desired outcomes by kind (at least one that is not merely functional) */
  out: { f?: string; e?: string; s?: string; i?: string; d?: string };
  /** the insight statement */ ins: string;
  /** the marketing opportunity (not an execution) */ opp: string;
  /** context conditions where it is claimed to hold */ ctx: string[];
  /** audience conditions, in words (defaults to the situation ids) */ aud?: string[];
  sit: string[];
  ind?: string[];
  prod?: string[];
  ob: string[];
  psy: string[];
  mp: string[];
  /** mechanisms that could later express the opportunity (referenced only after the insight is established) */ mech: string[];
  /** alternative explanations */ alt: string[];
  /** assumptions */ asm: string[];
  /** limitations */ lim: string[];
  /** what would count against it */ test: string;
  eth?: string[];
  anti?: string[];
  /** compatible insights */ w?: string[];
  /** insights in tension with it */ x?: [id: string, why: string][];
  /** the same pattern in other industries */ ctxs?: { industry: string; statement: string }[];
  status?: OntologyStatus;
  conf?: ConfidenceLevel;
}

const humanize = (id: string) => id.replace(/-/g, ' ');

export function defineInsight(s: InsightSpec): InsightBankEntry {
  const cats = [s.cat, ...(s.cats ?? [])];
  const elevated = cats.some((c) => INSIGHT_TAXONOMY[c].elevated);
  const defaultAnti: string[] = [];
  if (cats.some((c) => ['identity', 'aspiration', 'status', 'emotional'].includes(c))) defaultAnti.push('exploiting-insecurity');
  if (cats.includes('local_cultural')) defaultAnti.push('cultural-stereotyping');
  if (cats.some((c) => ['social', 'belonging'].includes(c))) defaultAnti.push('social-pressure-tactics');
  const anti = [...new Set([...(s.anti ?? []), ...defaultAnti, 'unsupported-causal-claim'])];

  const compatibility: CompatibilityClaim[] = [
    ...(s.ind ?? []).map((value) => ({ dimension: 'industry' as const, value, fit: 'conditional' as const })),
    ...s.sit.map((value) => ({ dimension: 'situation' as const, value, fit: 'conditional' as const })),
  ];

  const insight: InsightPatternEntity = {
    id: s.id,
    slug: s.id,
    type: 'insight_pattern',
    name: s.n,
    version: 1,
    status: s.status ?? 'experimental',
    definition: s.ins,
    semanticPurpose: 'Explains what may be happening beneath an observable behavior so that strategy can start from the human situation; it prescribes no execution.',
    scope: `Claimed to hold ${s.ctx[0] ?? 'in the stated context'}; not a claim about everyone.`,
    examples: [s.obs],
    antiExamples: ['A restatement of the observation, a broad motivation or a persona with no tension, barrier or context'],
    compatibility,
    constraints: [
      ...(s.eth ?? []).map((description) => ({ kind: 'ethical' as const, description })),
      ...s.lim.map((description) => ({ kind: 'avoid_when' as const, description })),
    ],
    confidence: s.conf ?? 'hypothesis',
    assumptions: s.asm,
    insight: s.ins,
    audienceConditions: s.aud ?? s.sit.map(humanize),
    situationConditions: s.ctx,
    underlyingMotivation: s.mt,
    tension: `${s.ten[0]} vs ${s.ten[1]}`,
    barrier: s.bar,
    implication: s.opp,
    code: s.c,
    category: s.cat,
    additionalCategories: s.cats,
    surfaceObservation: s.obs,
    behavioralPattern: s.pat,
    tensionPair: s.ten,
    motivationRefs: s.mot,
    barrierTypes: s.bt,
    desiredOutcomes: { functional: s.out.f, emotional: s.out.e, social: s.out.s, identity: s.out.i, decision: s.out.d },
    contextConditions: s.ctx,
    audienceSituationRefs: s.sit,
    industries: s.ind ?? [],
    productTypes: s.prod ?? [],
    objectives: s.ob,
    psychologyRefs: s.psy,
    marketingPrincipleRefs: s.mp,
    mechanismRefs: s.mech,
    alternativeExplanations: s.alt,
    limitations: s.lim,
    falsifiableBy: s.test,
    ethicalConsiderations: s.eth ?? ['State the insight as a hypothesis scoped to its context, and do not use it to pressure or stereotype the audience.'],
    ethicalSensitivity: elevated ? 'elevated' : 'standard',
    contextualizations: s.ctxs,
  };

  const rel = (relationship: InsightLink['relationship'], type: InsightLink['target']['type'], id: string, extra: Partial<InsightLink> = {}): InsightLink => ({ relationship, target: { type, id }, ...extra });
  const links: InsightLink[] = [
    ...s.psy.map((id) => rel('uses', 'psychology', id)),
    ...s.mp.map((id) => rel('supports', 'marketing_principle', id)),
    ...s.mech.map((id) => rel('expressedThrough', 'creative_mechanism', id)),
    ...s.mot.map((id) => rel('supports', 'human_motivation', id)),
    ...s.sit.map((id) => rel('derivedFrom', 'audience_situation', id)),
    ...(s.w ?? []).map((id) => rel('compatibleWith', 'insight_pattern', id)),
    ...(s.x ?? []).map(([id, why]) => rel('conflictsWith', 'insight_pattern', id, { rationale: why, conditions: [why] })),
    ...anti.map((id) => rel('constrainedBy', 'anti_pattern', id)),
  ];
  return { insight, links };
}

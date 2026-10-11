import {
  CONFIDENCE_LEVELS,
  entityKey,
  hasErrors,
  validateRelationship,
  type ConfidenceLevel,
  type EntityRef,
  type InsightCategory,
  type OntologyRegistry,
  type ValidationIssue,
} from '../ontology';
import { createMechanismBank, type MechanismRegistry } from '../mechanisms';
import { INSIGHT_ANTI_PATTERNS } from './insight-boundaries';
import { INSIGHT_CATEGORIES, type InsightBankEntry, type InsightPatternEntity } from './insight-types';
import { reviewInsightLibrary, validateInsight, validateInsightLinks } from './insight-validation';
import { GOLD_INSIGHTS } from './gold/gold.insights';
const DECISION_EFFORT_INSIGHTS: readonly InsightBankEntry[] = [];
const TRUST_VALUE_INSIGHTS: readonly InsightBankEntry[] = [];
const PEOPLE_CULTURE_INSIGHTS: readonly InsightBankEntry[] = [];

export class InsightValidationError extends Error {
  constructor(public readonly issues: readonly ValidationIssue[]) {
    super(`Insight validation failed: ${issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`).join('; ')}`);
    this.name = 'InsightValidationError';
  }
}

/** The initial library. Codes are stable; ids are readable references; neither depends on array position. */
export const CORE_INSIGHT_ENTRIES: readonly InsightBankEntry[] = [
  ...GOLD_INSIGHTS,
  ...DECISION_EFFORT_INSIGHTS,
  ...TRUST_VALUE_INSIGHTS,
  ...PEOPLE_CULTURE_INSIGHTS,
];

export interface InsightQuery {
  /** Matches the primary or an additional category. */
  category?: InsightCategory;
  motivation?: string;
  barrierType?: string;
  /** Matches either side of the tension, case-insensitively. */
  tension?: string;
  outcomeKind?: 'functional' | 'emotional' | 'social' | 'identity' | 'decision';
  industry?: string;
  audienceSituation?: string;
  objective?: string;
  marketingPrinciple?: string;
  mechanism?: string;
  psychology?: string;
  minConfidence?: ConfidenceLevel;
  /** When true, industry-agnostic insights (none listed) also match an industry filter. Default true. */
  includeAgnostic?: boolean;
}

const REFERENCE_EDGES: readonly { field: keyof InsightPatternEntity; type: EntityRef['type']; relationship: 'supports' | 'derivedFrom' }[] = [
  { field: 'marketingPrincipleRefs', type: 'marketing_principle', relationship: 'supports' },
  { field: 'motivationRefs', type: 'human_motivation', relationship: 'supports' },
  { field: 'audienceSituationRefs', type: 'audience_situation', relationship: 'derivedFrom' },
];

const rank = (c: ConfidenceLevel | undefined): number => CONFIDENCE_LEVELS.indexOf(c ?? 'unknown');

/**
 * The Insight Pattern Library. Insights are ontology `insight_pattern` entities in the SAME registry as the Psychology
 * and Mechanism banks; relationships are ordinary ontology edges. It stores and queries; it does not generate insights,
 * select among them, or change any campaign.
 */
export class InsightRegistry {
  private readonly entries = new Map<string, InsightBankEntry>();

  constructor(readonly mechanisms: MechanismRegistry) {}

  get ontology(): OntologyRegistry {
    return this.mechanisms.ontology;
  }

  private mechanismNames(): string[] {
    return this.mechanisms.list().map((m) => m.name);
  }

  installAll(entries: readonly InsightBankEntry[]): void {
    const mechanismIds = new Set(this.mechanisms.list().map((m) => m.id));
    const mechanismNames = this.mechanismNames();
    const batchIds = new Set(entries.map((e) => e.insight.id));
    const known = (id: string) => this.entries.has(id) || batchIds.has(id);
    const issues: ValidationIssue[] = [];

    for (const entry of entries) {
      const label = entry.insight.id;
      issues.push(...validateInsight(entry.insight, { mechanismIds, mechanismNames }).issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${label}: ${i.message}` })));
      issues.push(...validateInsightLinks(entry).filter((i) => i.severity === 'error'));
      for (const l of entry.links) {
        const check = validateRelationship({ source: { type: 'insight_pattern', id: label }, relationship: l.relationship, target: l.target, strength: l.strength, conditions: l.conditions ? [...l.conditions] : undefined, rationale: l.rationale });
        issues.push(...check.issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${label}: ${i.message}` })));
        if (l.target.type === 'insight_pattern' && !known(l.target.id)) issues.push({ severity: 'error', code: 'DANGLING_INSIGHT_REFERENCE', message: `${label} references unknown insight "${l.target.id}".` });
        if (l.target.type === 'anti_pattern' && !this.ontology.has(l.target)) issues.push({ severity: 'error', code: 'DANGLING_ANTI_PATTERN_REFERENCE', message: `${label} references unknown anti-pattern "${l.target.id}".` });
        if (l.target.type === 'creative_mechanism' && !this.ontology.has(l.target)) issues.push({ severity: 'error', code: 'DANGLING_MECHANISM_REFERENCE', message: `${label} references unknown mechanism "${l.target.id}".` });
      }
    }
    const combined = [...[...this.entries.values()].filter((e) => !batchIds.has(e.insight.id)), ...entries];
    issues.push(...reviewInsightLibrary(combined).filter((i) => i.severity === 'error'));
    if (hasErrors(issues)) throw new InsightValidationError(issues);

    for (const entry of entries) {
      this.ontology.register(entry.insight);
      this.entries.set(entry.insight.id, entry);
    }
    for (const entry of entries) {
      for (const l of entry.links) {
        if (!this.ontology.has(l.target)) continue; // principle / motivation / situation / planned psychology: tracked by coverage
        this.ontology.addRelationship({
          source: { type: 'insight_pattern', id: entry.insight.id },
          relationship: l.relationship,
          target: l.target,
          strength: l.strength,
          conditions: l.conditions ? [...l.conditions] : undefined,
          rationale: l.rationale,
        });
      }
    }
  }

  /** Adds edges for principle / motivation / audience-situation ids whose ontology entity now exists. Returns edges added. */
  resolveReferenceEdges(): number {
    let added = 0;
    for (const { insight: i } of this.entries.values()) {
      const me: EntityRef = { type: 'insight_pattern', id: i.id };
      for (const r of REFERENCE_EDGES) {
        for (const id of (i[r.field] as string[] | undefined) ?? []) {
          const other: EntityRef = { type: r.type, id };
          if (!this.ontology.has(other)) continue;
          const before = this.ontology.relationships().length;
          this.ontology.addRelationship({ source: me, relationship: r.relationship, target: other });
          if (this.ontology.relationships().length > before) added += 1;
        }
      }
    }
    return added;
  }

  referenceCoverage(): Record<string, { total: number; resolved: number }> {
    const out: Record<string, { total: number; resolved: number }> = {};
    const bump = (key: string, resolved: boolean) => {
      const s = (out[key] ??= { total: 0, resolved: 0 });
      s.total += 1;
      if (resolved) s.resolved += 1;
    };
    for (const { insight: i } of this.entries.values()) {
      for (const r of REFERENCE_EDGES) for (const id of (i[r.field] as string[] | undefined) ?? []) bump(r.type, this.ontology.has({ type: r.type, id }));
      for (const id of i.psychologyRefs ?? []) bump('psychology', this.ontology.has({ type: 'psychology', id }));
      for (const id of i.mechanismRefs ?? []) bump('creative_mechanism', this.ontology.has({ type: 'creative_mechanism', id }));
    }
    return out;
  }

  // ---- lookups -------------------------------------------------------------------------------------------------
  get(idOrCode: string): InsightPatternEntity | undefined {
    return this.ontology.get('insight_pattern', idOrCode) ?? this.list().find((i) => i.code === idOrCode);
  }

  list(opts: { includeDeprecated?: boolean } = {}): InsightPatternEntity[] {
    return this.ontology.list('insight_pattern', opts).filter((i) => this.entries.has(i.id));
  }

  /** Counts by PRIMARY category; use `countsIncludingSecondary` for coverage. */
  counts(): Record<InsightCategory, number> {
    return Object.fromEntries(INSIGHT_CATEGORIES.map((c) => [c, this.list().filter((i) => i.category === c).length])) as Record<InsightCategory, number>;
  }

  countsIncludingSecondary(): Record<InsightCategory, number> {
    return Object.fromEntries(INSIGHT_CATEGORIES.map((c) => [c, this.list().filter((i) => i.category === c || i.additionalCategories?.includes(c)).length])) as Record<InsightCategory, number>;
  }

  /** Filters the library; every supplied filter must match. It does not rank, score or choose an insight. */
  query(q: InsightQuery = {}): InsightPatternEntity[] {
    const agnostic = q.includeAgnostic !== false;
    const t = q.tension?.toLowerCase();
    return this.list().filter((i) => {
      if (q.category && i.category !== q.category && !i.additionalCategories?.includes(q.category)) return false;
      if (q.motivation && !(i.motivationRefs ?? []).includes(q.motivation)) return false;
      if (q.barrierType && !(i.barrierTypes ?? []).includes(q.barrierType)) return false;
      if (t && !(i.tensionPair ?? []).some((side) => side.toLowerCase().includes(t))) return false;
      if (q.outcomeKind && !i.desiredOutcomes?.[q.outcomeKind]) return false;
      if (q.industry && !((i.industries ?? []).includes(q.industry) || (agnostic && !(i.industries ?? []).length))) return false;
      if (q.audienceSituation && !(i.audienceSituationRefs ?? []).includes(q.audienceSituation)) return false;
      if (q.objective && !(i.objectives ?? []).includes(q.objective)) return false;
      if (q.marketingPrinciple && !(i.marketingPrincipleRefs ?? []).includes(q.marketingPrinciple)) return false;
      if (q.mechanism && !(i.mechanismRefs ?? []).includes(q.mechanism)) return false;
      if (q.psychology && !(i.psychologyRefs ?? []).includes(q.psychology)) return false;
      if (q.minConfidence && rank(i.confidence) < rank(q.minConfidence)) return false;
      return true;
    });
  }

  /** The reasoning chain of one insight as data, layer by layer, for explanation ("why did we start here?"). */
  chain(id: string): Record<string, unknown> {
    const i = this.get(id);
    if (!i) throw new Error(`Unknown insight ${id}`);
    return {
      observation: i.surfaceObservation,
      pattern: i.behavioralPattern,
      tension: i.tensionPair,
      motivation: { text: i.underlyingMotivation, refs: i.motivationRefs },
      barrier: { text: i.barrier, types: i.barrierTypes },
      desiredOutcomes: i.desiredOutcomes,
      insight: i.insight,
      marketingOpportunity: i.implication,
      marketingPrinciples: i.marketingPrincipleRefs,
      psychology: i.psychologyRefs,
      mechanisms: i.mechanismRefs,
      confidence: i.confidence,
      assumptions: i.assumptions,
      alternativeExplanations: i.alternativeExplanations,
      falsifiableBy: i.falsifiableBy,
    };
  }

  /** Competing interpretations the insight must not overfit against. */
  alternatives(id: string): readonly string[] {
    return this.get(id)?.alternativeExplanations ?? [];
  }

  /** Structured quality metadata (the spec's evaluation dimensions) — deliberately not a single score. */
  profile(id: string): Record<string, unknown> {
    const i = this.get(id);
    if (!i) throw new Error(`Unknown insight ${id}`);
    const edges = this.ontology.from({ type: 'insight_pattern', id });
    return {
      id: i.id,
      code: i.code,
      specificity: { contextConditions: (i.contextConditions ?? []).length, situations: (i.audienceSituationRefs ?? []).length },
      depth: { layers: ['observation', 'pattern', 'tension', 'motivation', 'barrier', 'desiredOutcome', 'insight', 'opportunity'].length, outcomeKinds: Object.values(i.desiredOutcomes ?? {}).filter(Boolean).length },
      evidence: { confidence: i.confidence, items: (i.evidence ?? []).length, assumptions: (i.assumptions ?? []).length },
      alternatives: (i.alternativeExplanations ?? []).length,
      falsifiable: !!i.falsifiableBy,
      actionability: { principles: (i.marketingPrincipleRefs ?? []).length, mechanisms: (i.mechanismRefs ?? []).length },
      reusability: { industriesListed: (i.industries ?? []).length, contextualizations: (i.contextualizations ?? []).length },
      ethics: { sensitivity: i.ethicalSensitivity, antiPatterns: edges.filter((e) => e.relationship === 'constrainedBy').length },
      learning: { outcomes: (i.outcomeLearnings ?? []).length, contextualConfidence: (i.contextualConfidence ?? []).length },
    };
  }

  validate(opts: { strict?: boolean } = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const mechanismIds = new Set(this.mechanisms.list().map((m) => m.id));
    const mechanismNames = this.mechanismNames();
    for (const entry of this.entries.values()) {
      issues.push(...validateInsight(this.get(entry.insight.id) ?? entry.insight, { mechanismIds, mechanismNames }).issues);
      issues.push(...validateInsightLinks(entry));
    }
    issues.push(...reviewInsightLibrary([...this.entries.values()]));
    if (opts.strict) {
      for (const [kind, c] of Object.entries(this.referenceCoverage())) {
        if (c.resolved < c.total) issues.push({ severity: 'error', code: 'UNRESOLVED_REFERENCE', message: `${c.total - c.resolved} of ${c.total} ${kind} references do not resolve to ontology entities yet.` });
      }
    }
    issues.push(...this.ontology.validateGraph());
    return issues;
  }
}

/** Creates an insight library over a (new or shared) Mechanism Bank / ontology, preloaded with the core library. */
export function createInsightBank(
  opts: { mechanisms?: MechanismRegistry; entries?: readonly InsightBankEntry[]; includeCore?: boolean } = {}
): InsightRegistry {
  const mechanisms = opts.mechanisms ?? createMechanismBank();
  for (const a of INSIGHT_ANTI_PATTERNS) if (!mechanisms.ontology.has({ type: 'anti_pattern', id: a.id })) mechanisms.ontology.register(a);
  const bank = new InsightRegistry(mechanisms);
  bank.installAll([...(opts.includeCore === false ? [] : CORE_INSIGHT_ENTRIES), ...(opts.entries ?? [])]);
  return bank;
}

export { entityKey };

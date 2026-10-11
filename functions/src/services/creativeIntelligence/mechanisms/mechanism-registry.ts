import {
  CONFIDENCE_LEVELS,
  entityKey,
  hasErrors,
  validateRelationship,
  type ConfidenceLevel,
  type EntityRef,
  type MechanismCategory,
  type MechanismKind,
  type OntologyRegistry,
  type RiskLevel,
  type ValidationIssue,
} from '../ontology';
import { createPsychologyBank, type PsychologyRegistry } from '../psychology';
import { MECHANISM_ANTI_PATTERNS } from './mechanism-boundaries';
import { reviewLibrary, validateMechanism, validateMechanismLinks } from './mechanism-validation';
import { MECHANISM_CATEGORIES, type MarketingMechanism, type MechanismBankEntry } from './mechanism-types';
import { NARRATIVE_MECHANISMS } from './narrative/narrative.mechanisms';
import { PROOF_AUTHORITY_MECHANISMS } from './proof-authority/proof-authority.mechanisms';
import { COGNITIVE_MECHANISMS } from './cognitive/cognitive.mechanisms';
import { PRICING_OFFER_RISK_MECHANISMS } from './pricing-offer-risk/pricing-offer-risk.mechanisms';
import { URGENCY_SCARCITY_MECHANISMS } from './urgency-scarcity/urgency-scarcity.mechanisms';

export class MechanismValidationError extends Error {
  constructor(public readonly issues: readonly ValidationIssue[]) {
    super(`Mechanism validation failed: ${issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`).join('; ')}`);
    this.name = 'MechanismValidationError';
  }
}

/** The initial library. Codes are stable; ids are readable references; neither depends on array position. */
export const CORE_MECHANISM_ENTRIES: readonly MechanismBankEntry[] = [
  ...COGNITIVE_MECHANISMS,
  ...PRICING_OFFER_RISK_MECHANISMS,
  ...NARRATIVE_MECHANISMS,
  ...PROOF_AUTHORITY_MECHANISMS,
  ...URGENCY_SCARCITY_MECHANISMS,
];

/** Read-only query over the data. This is NOT a recommendation engine: it filters, it does not rank or choose. */
export interface MechanismQuery {
  category?: MechanismCategory;
  kind?: MechanismKind;
  objective?: string;
  audienceSituation?: string;
  industry?: string;
  productType?: string;
  format?: string;
  psychology?: string;
  marketingPrinciple?: string;
  compatibleWith?: string;
  /** Mechanisms that declare tension with this one. */
  avoidWith?: string;
  minConfidence?: ConfidenceLevel;
  riskLevel?: RiskLevel;
  requiresAsset?: string;
  /** Exclude mechanisms that declare this situation as a weak fit. */
  excludeWeakFor?: string;
  /** When true, industry-agnostic mechanisms (no industries listed) also match an industry filter. Default true. */
  includeAgnostic?: boolean;
}

export interface AssetGaps {
  readonly missingRequired: readonly string[];
  readonly missingPreferred: readonly string[];
  /** False when a required asset is missing: the mechanism must be downgraded or rejected, never faked. */
  readonly feasible: boolean;
}

const REFERENCE_EDGES: readonly {
  field: keyof MarketingMechanism;
  type: EntityRef['type'];
  direction: 'from-mechanism' | 'to-mechanism';
  relationship: 'requires' | 'expressedThrough' | 'targets' | 'worksWith';
}[] = [
  { field: 'marketingPrincipleRefs', type: 'marketing_principle', direction: 'to-mechanism', relationship: 'expressedThrough' },
  { field: 'hookPatternRefs', type: 'hook_pattern', direction: 'from-mechanism', relationship: 'expressedThrough' },
  { field: 'storyStructureRefs', type: 'story_structure', direction: 'from-mechanism', relationship: 'expressedThrough' },
  { field: 'visualStructureRefs', type: 'visual_structure', direction: 'from-mechanism', relationship: 'expressedThrough' },
  { field: 'copyStructureRefs', type: 'copy_structure', direction: 'from-mechanism', relationship: 'expressedThrough' },
  { field: 'requiredAssets', type: 'asset_requirement', direction: 'from-mechanism', relationship: 'requires' },
  { field: 'audienceSituationRefs', type: 'audience_situation', direction: 'from-mechanism', relationship: 'targets' },
  { field: 'formats', type: 'format', direction: 'from-mechanism', relationship: 'worksWith' },
];

const rank = (c: ConfidenceLevel | undefined): number => CONFIDENCE_LEVELS.indexOf(c ?? 'unknown');

/**
 * The Marketing Mechanism Bank. Mechanisms are ontology `creative_mechanism` entities in the SAME registry as the
 * Psychology Bank; relationships are ordinary ontology edges. Reference ids for things later phases will author
 * (principles, structures, assets, situations) become edges automatically once such an entity exists, and their
 * coverage is reported honestly by `referenceCoverage()`.
 */
export class MechanismRegistry {
  private readonly entries = new Map<string, MechanismBankEntry>();

  constructor(readonly psychology: PsychologyRegistry) {}

  get ontology(): OntologyRegistry {
    return this.psychology.ontology;
  }

  /** Validates (entries, links, whole-library duplicates), then installs. Throws listing every error. Nothing is installed on failure. */
  installAll(entries: readonly MechanismBankEntry[]): void {
    const batchIds = new Set(entries.map((e) => e.mechanism.id));
    const known = (id: string) => this.entries.has(id) || batchIds.has(id);
    const issues: ValidationIssue[] = [];

    for (const entry of entries) {
      const label = entry.mechanism.id;
      issues.push(...validateMechanism(entry.mechanism).issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${label}: ${i.message}` })));
      issues.push(...validateMechanismLinks(entry).filter((i) => i.severity === 'error'));
      for (const l of entry.links) {
        const check = validateRelationship({ source: { type: 'creative_mechanism', id: label }, relationship: l.relationship, target: l.target, strength: l.strength, conditions: l.conditions ? [...l.conditions] : undefined, rationale: l.rationale });
        issues.push(...check.issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${label}: ${i.message}` })));
        if (l.target.type === 'creative_mechanism' && !known(l.target.id)) {
          issues.push({ severity: 'error', code: 'DANGLING_MECHANISM_REFERENCE', message: `${label} references unknown mechanism "${l.target.id}".` });
        }
        if (l.target.type === 'anti_pattern' && !this.ontology.has(l.target)) {
          issues.push({ severity: 'error', code: 'DANGLING_ANTI_PATTERN_REFERENCE', message: `${label} references unknown anti-pattern "${l.target.id}".` });
        }
      }
    }
    const combined = [...[...this.entries.values()].filter((e) => !batchIds.has(e.mechanism.id)), ...entries];
    issues.push(...reviewLibrary(combined).filter((i) => i.severity === 'error'));
    if (hasErrors(issues)) throw new MechanismValidationError(issues);

    for (const entry of entries) {
      this.ontology.register(entry.mechanism);
      this.entries.set(entry.mechanism.id, entry);
    }
    for (const entry of entries) {
      for (const l of entry.links) {
        if (l.target.type === 'psychology' && !this.ontology.has(l.target)) continue; // planned concept, tracked by coverage
        this.ontology.addRelationship({
          source: { type: 'creative_mechanism', id: entry.mechanism.id },
          relationship: l.relationship,
          target: l.target,
          strength: l.strength,
          conditions: l.conditions ? [...l.conditions] : undefined,
          rationale: l.rationale,
        });
      }
    }
    this.resolveReferenceEdges();
  }

  /**
   * Adds graph edges for reference ids whose ontology entity now exists (a principle, structure, asset requirement,
   * audience situation or format). Safe to call repeatedly. Returns the number of edges newly added.
   */
  resolveReferenceEdges(): number {
    let added = 0;
    for (const { mechanism: m } of this.entries.values()) {
      const mech: EntityRef = { type: 'creative_mechanism', id: m.id };
      for (const r of REFERENCE_EDGES) {
        for (const id of (m[r.field] as string[] | undefined) ?? []) {
          const other: EntityRef = { type: r.type, id };
          if (!this.ontology.has(other)) continue;
          const before = this.ontology.relationships().length;
          this.ontology.addRelationship(r.direction === 'to-mechanism' ? { source: other, relationship: r.relationship, target: mech } : { source: mech, relationship: r.relationship, target: other });
          if (this.ontology.relationships().length > before) added += 1;
        }
      }
      for (const id of m.psychologyRefs ?? []) {
        const psy: EntityRef = { type: 'psychology', id };
        if (!this.ontology.has(psy)) continue;
        const before = this.ontology.relationships().length;
        this.ontology.addRelationship({ source: mech, relationship: 'uses', target: psy });
        if (this.ontology.relationships().length > before) added += 1;
      }
    }
    return added;
  }

  /** Per reference kind: how many ids are cited, and how many already resolve to ontology entities. */
  referenceCoverage(): Record<string, { total: number; resolved: number }> {
    const out: Record<string, { total: number; resolved: number }> = {};
    const bump = (key: string, resolved: boolean) => {
      const s = (out[key] ??= { total: 0, resolved: 0 });
      s.total += 1;
      if (resolved) s.resolved += 1;
    };
    for (const { mechanism: m } of this.entries.values()) {
      for (const r of REFERENCE_EDGES) for (const id of (m[r.field] as string[] | undefined) ?? []) bump(r.type, this.ontology.has({ type: r.type, id }));
      for (const id of m.psychologyRefs ?? []) bump('psychology', this.ontology.has({ type: 'psychology', id }));
    }
    return out;
  }

  // ---- lookups -------------------------------------------------------------------------------------------------
  get(idOrCode: string): MarketingMechanism | undefined {
    const byId = this.ontology.get('creative_mechanism', idOrCode);
    if (byId) return byId;
    return this.list().find((m) => m.code === idOrCode);
  }

  list(opts: { includeDeprecated?: boolean } = {}): MarketingMechanism[] {
    return this.ontology.list('creative_mechanism', opts).filter((m) => this.entries.has(m.id));
  }

  counts(): Record<MechanismCategory, number> {
    return Object.fromEntries(MECHANISM_CATEGORIES.map((c) => [c, this.list().filter((m) => m.mechanismCategory === c).length])) as Record<MechanismCategory, number>;
  }

  /** Filters the library. Every supplied filter must match. Returns data in registry order; it does not rank. */
  query(q: MechanismQuery = {}): MarketingMechanism[] {
    const agnostic = q.includeAgnostic !== false;
    return this.list().filter((m) => {
      if (q.category && m.mechanismCategory !== q.category) return false;
      if (q.kind && (m.kind ?? 'mechanism') !== q.kind) return false;
      if (q.objective && !m.applicableObjectives.includes(q.objective)) return false;
      if (q.audienceSituation && !(m.audienceSituationRefs ?? []).includes(q.audienceSituation)) return false;
      if (q.excludeWeakFor && m.compatibility.some((c) => c.dimension === 'situation' && c.value === q.excludeWeakFor && (c.fit === 'weak' || c.fit === 'avoid'))) return false;
      if (q.industry && !((m.industries ?? []).includes(q.industry) || (agnostic && !(m.industries ?? []).length))) return false;
      if (q.productType && !((m.productTypes ?? []).includes(q.productType) || (agnostic && !(m.productTypes ?? []).length))) return false;
      if (q.format && !((m.formats ?? []).includes(q.format) || (agnostic && !(m.formats ?? []).length))) return false;
      if (q.psychology && !(m.psychologyRefs ?? []).includes(q.psychology)) return false;
      if (q.marketingPrinciple && !(m.marketingPrincipleRefs ?? []).includes(q.marketingPrinciple)) return false;
      if (q.minConfidence && rank(m.confidence) < rank(q.minConfidence)) return false;
      if (q.riskLevel && m.riskLevel !== q.riskLevel) return false;
      if (q.requiresAsset && !(m.requiredAssets ?? []).includes(q.requiresAsset)) return false;
      if (q.compatibleWith && !this.related(m.id, ['compatibleWith', 'oftenCombinedWith', 'supports']).includes(q.compatibleWith) && !this.related(q.compatibleWith, ['compatibleWith', 'oftenCombinedWith', 'supports']).includes(m.id)) return false;
      if (q.avoidWith && !this.related(m.id, ['notRecommendedWith', 'conflictsWith']).includes(q.avoidWith) && !this.related(q.avoidWith, ['notRecommendedWith', 'conflictsWith']).includes(m.id)) return false;
      return true;
    });
  }

  /** Mechanism ids reachable from `id` by the given relationship types (outgoing edges). */
  related(id: string, relationships: ('compatibleWith' | 'oftenCombinedWith' | 'supports' | 'notRecommendedWith' | 'conflictsWith')[]): string[] {
    return this.ontology
      .from({ type: 'creative_mechanism', id }, relationships)
      .filter((e) => e.target.type === 'creative_mechanism')
      .map((e) => (e.target as EntityRef).id);
  }

  /** What a mechanism needs that the business does not have. Missing required assets mean: do not fabricate; reject or downgrade. */
  assetGaps(id: string, available: readonly string[]): AssetGaps {
    const m = this.get(id);
    if (!m) throw new Error(`Unknown mechanism ${id}`);
    const have = new Set(available);
    const missingRequired = (m.requiredAssets ?? []).filter((a) => !have.has(a));
    return { missingRequired, missingPreferred: (m.preferredAssets ?? []).filter((a) => !have.has(a)), feasible: missingRequired.length === 0 };
  }

  /** Splits mechanisms into those executable with the available assets and those that are not (with what is missing). */
  partitionByAssets(available: readonly string[], among: readonly MarketingMechanism[] = this.list()): {
    feasible: MarketingMechanism[];
    infeasible: { mechanism: MarketingMechanism; missingRequired: readonly string[] }[];
  } {
    const feasible: MarketingMechanism[] = [];
    const infeasible: { mechanism: MarketingMechanism; missingRequired: readonly string[] }[] = [];
    for (const m of among) {
      const gaps = this.assetGaps(m.id, available);
      if (gaps.feasible) feasible.push(m);
      else infeasible.push({ mechanism: m, missingRequired: gaps.missingRequired });
    }
    return { feasible, infeasible };
  }

  /** Structured quality metadata — deliberately not a single score. */
  profile(id: string): Record<string, unknown> {
    const m = this.get(id);
    if (!m) throw new Error(`Unknown mechanism ${id}`);
    const edges = this.ontology.from({ type: 'creative_mechanism', id });
    return {
      id: m.id,
      code: m.code,
      reusability: { industriesListed: (m.industries ?? []).length, objectives: m.applicableObjectives.length, formats: (m.formats ?? []).length, productTypes: (m.productTypes ?? []).length },
      composability: { compatible: edges.filter((e) => e.relationship === 'compatibleWith' || e.relationship === 'oftenCombinedWith' || e.relationship === 'supports').length, tensions: edges.filter((e) => e.relationship === 'notRecommendedWith' || e.relationship === 'conflictsWith').length },
      evidence: { confidence: m.confidence, evidenceItems: (m.evidence ?? []).length, ceiling: m.explanationBasis },
      ethics: { sensitivity: m.ethicalSensitivity, risk: m.riskLevel, boundaries: m.ethicalConstraints.length, preconditions: m.truthfulPreconditions.length, antiPatterns: edges.filter((e) => e.relationship === 'constrainedBy').length },
      failureDocumentation: { weaknesses: (m.weaknesses ?? []).length, weakSituations: m.compatibility.filter((c) => c.fit === 'weak' || c.fit === 'avoid').length },
      learning: { outcomes: (m.outcomeLearnings ?? []).length, contextualConfidence: (m.contextualConfidence ?? []).length },
    };
  }

  /** Re-validates every mechanism, the library-level duplicate review, and the whole ontology graph. */
  validate(opts: { strict?: boolean } = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const entry of this.entries.values()) {
      issues.push(...validateMechanism(this.get(entry.mechanism.id) ?? entry.mechanism).issues);
      issues.push(...validateMechanismLinks(entry));
    }
    issues.push(...reviewLibrary([...this.entries.values()]));
    if (opts.strict) {
      for (const [kind, c] of Object.entries(this.referenceCoverage())) {
        if (c.resolved < c.total) issues.push({ severity: 'error', code: 'UNRESOLVED_REFERENCE', message: `${c.total - c.resolved} of ${c.total} ${kind} references do not resolve to ontology entities yet.` });
      }
    }
    issues.push(...this.ontology.validateGraph());
    return issues;
  }
}

/** Creates a mechanism bank over a (new or shared) Psychology Bank / ontology, preloaded with the core library. */
export function createMechanismBank(
  opts: { psychology?: PsychologyRegistry; entries?: readonly MechanismBankEntry[]; includeCore?: boolean } = {}
): MechanismRegistry {
  const psychology = opts.psychology ?? createPsychologyBank();
  for (const antiPattern of MECHANISM_ANTI_PATTERNS) {
    if (!psychology.ontology.has({ type: 'anti_pattern', id: antiPattern.id })) psychology.ontology.register(antiPattern);
  }
  const bank = new MechanismRegistry(psychology);
  bank.installAll([...(opts.includeCore === false ? [] : CORE_MECHANISM_ENTRIES), ...(opts.entries ?? [])]);
  return bank;
}

export { entityKey };

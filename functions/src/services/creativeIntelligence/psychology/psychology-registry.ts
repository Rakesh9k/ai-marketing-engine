import {
  createOntologyRegistry,
  entityKey,
  hasErrors,
  type EntityRef,
  type OntologyRegistry,
  type PsychologyCategory,
  type ValidationIssue,
} from '../ontology';
import { DARK_PATTERN_ANTI_PATTERNS } from './psychology-boundaries';
import { validateEntryLinks, validatePrinciple } from './psychology-validation';
import { PSYCHOLOGY_CATEGORIES, PSYCHOLOGY_TAXONOMY, type PsychologyBankEntry, type PsychologyLink, type PsychologyPrinciple } from './psychology-types';
import { ATTENTION_PRINCIPLES } from './attention/attention.principles';
import { DESIRE_PRINCIPLES } from './desire/desire.principles';
import { TRUST_PRINCIPLES } from './trust/trust.principles';
import { DECISION_PRINCIPLES } from './decision/decision.principles';
import { EMOTION_PRINCIPLES } from './emotion/emotion.principles';

export class PsychologyValidationError extends Error {
  constructor(public readonly issues: readonly ValidationIssue[]) {
    super(`Psychology validation failed: ${issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`).join('; ')}`);
    this.name = 'PsychologyValidationError';
  }
}

/** The small, hand-authored reference set. Not a library: see the README for why it stays small. */
export const CORE_PSYCHOLOGY_ENTRIES: readonly PsychologyBankEntry[] = [
  ...ATTENTION_PRINCIPLES,
  ...DESIRE_PRINCIPLES,
  ...TRUST_PRINCIPLES,
  ...DECISION_PRINCIPLES,
  ...EMOTION_PRINCIPLES,
];

interface DeferredLink {
  readonly sourceId: string;
  readonly link: PsychologyLink;
}

/**
 * The Psychology Bank. It does not own a second identity system: principles are ontology `psychology` entities
 * registered in the shared OntologyRegistry, and relationships are ordinary ontology edges.
 *
 * A link whose target does not exist yet (e.g. a creative mechanism, which Phase 10.6 will author) is DEFERRED, not
 * dropped or faked: it is listed by `deferredLinks()`, becomes an edge once the target exists (`resolveDeferredLinks`),
 * and is an error under `validate({ strict: true })`.
 */
export class PsychologyRegistry {
  private readonly entries = new Map<string, PsychologyBankEntry>();
  private deferred: DeferredLink[] = [];

  constructor(readonly ontology: OntologyRegistry = createOntologyRegistry()) {}

  /** Validates and installs principles (all principles first, then their relationships). Throws on any error. */
  installAll(entries: readonly PsychologyBankEntry[]): void {
    const issues: ValidationIssue[] = [];
    for (const entry of entries) {
      const principle = validatePrinciple(entry.principle);
      issues.push(...principle.issues.filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${entry.principle.id}: ${i.message}` })));
      issues.push(...validateEntryLinks(entry).filter((i) => i.severity === 'error').map((i) => ({ ...i, message: `${entry.principle.id}: ${i.message}` })));
    }
    if (hasErrors(issues)) throw new PsychologyValidationError(issues);

    for (const entry of entries) {
      this.ontology.register(entry.principle);
      this.entries.set(entry.principle.id, entry);
    }
    for (const entry of entries) {
      for (const l of entry.links) this.link(entry.principle.id, l);
    }
  }

  install(entry: PsychologyBankEntry): void {
    this.installAll([entry]);
  }

  private link(sourceId: string, l: PsychologyLink): void {
    if (!this.ontology.has(l.target)) {
      if (!this.deferred.some((d) => d.sourceId === sourceId && entityKey(d.link.target) === entityKey(l.target) && d.link.relationship === l.relationship)) {
        this.deferred.push({ sourceId, link: l });
      }
      return;
    }
    this.ontology.addRelationship({
      source: { type: 'psychology', id: sourceId } satisfies EntityRef,
      relationship: l.relationship,
      target: l.target,
      strength: l.strength,
      conditions: l.conditions ? [...l.conditions] : undefined,
      rationale: l.rationale,
    });
  }

  /** Call after registering more ontology objects (e.g. mechanisms): turns now-resolvable deferred links into edges. */
  resolveDeferredLinks(): number {
    const pending = this.deferred;
    this.deferred = [];
    for (const d of pending) this.link(d.sourceId, d.link);
    return pending.length - this.deferred.length;
  }

  deferredLinks(): readonly { sourceId: string; relationship: string; target: EntityRef }[] {
    return this.deferred.map((d) => ({ sourceId: d.sourceId, relationship: d.link.relationship, target: d.link.target }));
  }

  get(id: string): PsychologyPrinciple | undefined {
    return this.ontology.get('psychology', id);
  }

  list(category?: PsychologyCategory, opts: { includeDeprecated?: boolean } = {}): PsychologyPrinciple[] {
    return this.ontology
      .list('psychology', opts)
      .filter((p) => !category || p.category === category || p.additionalCategories?.includes(category));
  }

  categories(): readonly PsychologyCategory[] {
    return PSYCHOLOGY_CATEGORIES;
  }

  counts(): Record<PsychologyCategory, number> {
    return Object.fromEntries(PSYCHOLOGY_CATEGORIES.map((c) => [c, this.list(c).length])) as Record<PsychologyCategory, number>;
  }

  /** Planned taxonomy concepts that have no authored principle yet — an honest coverage gap list, not a todo generator. */
  unauthoredConcepts(): Record<PsychologyCategory, string[]> {
    const have = new Set(this.ontology.list('psychology', { includeDeprecated: true }).map((p) => p.id));
    return Object.fromEntries(PSYCHOLOGY_CATEGORIES.map((c) => [c, PSYCHOLOGY_TAXONOMY[c].plannedConcepts.filter((id) => !have.has(id))])) as Record<PsychologyCategory, string[]>;
  }

  /**
   * Re-validates every principle, link and the whole ontology graph.
   * `strict` treats unresolved references (such as mechanisms not authored yet) as errors.
   */
  validate(opts: { strict?: boolean } = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const entry of this.entries.values()) {
      const current = this.get(entry.principle.id) ?? entry.principle;
      issues.push(...validatePrinciple(current).issues);
      issues.push(...validateEntryLinks(entry));
    }
    for (const d of this.deferred) {
      issues.push({
        severity: opts.strict ? 'error' : 'warning',
        code: opts.strict ? 'UNRESOLVED_REFERENCE' : 'DEFERRED_LINK',
        message: `${d.sourceId} --${d.link.relationship}--> ${entityKey(d.link.target)}: target is not defined in the ontology yet.`,
      });
    }
    issues.push(...this.ontology.validateGraph());
    return issues;
  }
}

/** Creates a bank over an (optionally shared) ontology registry, preloaded with the dark-pattern prohibitions and core principles. */
export function createPsychologyBank(
  opts: { ontology?: OntologyRegistry; entries?: readonly PsychologyBankEntry[]; includeCore?: boolean } = {}
): PsychologyRegistry {
  const bank = new PsychologyRegistry(opts.ontology);
  for (const antiPattern of DARK_PATTERN_ANTI_PATTERNS) {
    if (!bank.ontology.has({ type: 'anti_pattern', id: antiPattern.id })) bank.ontology.register(antiPattern);
  }
  bank.installAll([...(opts.includeCore === false ? [] : CORE_PSYCHOLOGY_ENTRIES), ...(opts.entries ?? [])]);
  return bank;
}

import {
  ONTOLOGY_ENTITY_TYPES,
  entityKey,
  type EntityRef,
  type OntologyEntityType,
} from './ontology-types';
import {
  ACYCLIC_RELATIONSHIPS,
  type OntologyRelationship,
  type OntologyRelationshipType,
} from './ontology-relations';
import {
  OntologyValidationError,
  hasErrors,
  validateEntity,
  validateRelationship,
  type EntityOfType,
  type OntologyEntity,
  type ValidationIssue,
} from './ontology-validation';

/**
 * In-memory ontology registry and graph. It answers "what exists and how can it relate" — never "what should Mitra
 * use here" (recommendation, Phase 10.12) and never persists anything (storage, later phase).
 *
 * - Entities are versioned: registering a higher version of an id replaces the head and keeps the history.
 * - Nothing is ever deleted; deprecated entities stay resolvable so historical relationships remain interpretable.
 * - Relationships are first-class edges referencing entities by (type, id).
 */

/** Which recipe field holds ids of which entity type. Recipes reference objects; they never embed them. */
export const RECIPE_FIELD_TYPES: Readonly<Record<string, OntologyEntityType>> = {
  audienceSituationIds: 'audience_situation',
  insightPatternIds: 'insight_pattern',
  psychologyIds: 'psychology',
  motivationIds: 'human_motivation',
  principleIds: 'marketing_principle',
  mechanismIds: 'creative_mechanism',
  offerMechanismIds: 'offer_mechanism',
  hookPatternIds: 'hook_pattern',
  storyStructureIds: 'story_structure',
  copyStructureIds: 'copy_structure',
  visualStructureIds: 'visual_structure',
  ctaStructureIds: 'cta_structure',
  styleSystemIds: 'style_system',
  formatIds: 'format',
  platformIds: 'platform',
  assetRequirementIds: 'asset_requirement',
  combinationRuleIds: 'combination_rule',
  antiPatternIds: 'anti_pattern',
};

const edgeKey = (r: OntologyRelationship): string =>
  `${entityKey(r.source)}|${r.relationship}|${r.target.type === 'external' ? `external:${r.target.refType}:${r.target.id}` : entityKey(r.target)}`;

interface Slot {
  head: OntologyEntity;
  history: OntologyEntity[];
}

export class OntologyRegistry {
  private readonly slots = new Map<string, Slot>();
  private readonly edges = new Map<string, OntologyRelationship>();

  // ---- entities -----------------------------------------------------------
  /** Validates and registers an entity. Throws OntologyValidationError listing every problem. */
  register(input: unknown): OntologyEntity {
    const result = validateEntity(input);
    if (!result.ok || !result.entity) throw new OntologyValidationError(result.issues);
    const entity = result.entity;
    const key = entityKey({ type: entity.type, id: entity.id });
    const existing = this.slots.get(key);

    if (existing) {
      if (entity.version <= existing.head.version) {
        throw new OntologyValidationError([
          { severity: 'error', code: 'VERSION_NOT_INCREASED', message: `${key} is already registered at version ${existing.head.version}; a change must register a higher version.` },
        ]);
      }
      existing.history.push(existing.head);
      existing.head = entity;
    } else {
      this.slots.set(key, { head: entity, history: [] });
    }
    return entity;
  }

  get<T extends OntologyEntityType>(type: T, id: string): EntityOfType<T> | undefined {
    return this.slots.get(entityKey({ type, id }))?.head as EntityOfType<T> | undefined;
  }

  private static defaultInstance = new OntologyRegistry();

  static register(inputOrType: unknown, entityInput?: unknown): OntologyEntity {
    if (typeof inputOrType === 'string' && entityInput) {
      return OntologyRegistry.defaultInstance.register({ type: inputOrType as OntologyEntityType, ...(entityInput as object) });
    }
    return OntologyRegistry.defaultInstance.register(inputOrType);
  }

  static has(typeOrRef: OntologyEntityType | EntityRef, id?: string): boolean {
    if (typeof typeOrRef === 'string' && id) {
      return OntologyRegistry.defaultInstance.has({ type: typeOrRef, id });
    }
    return OntologyRegistry.defaultInstance.has(typeOrRef as EntityRef);
  }

  static get<T extends OntologyEntityType>(type: T, id: string): EntityOfType<T> | undefined {
    return OntologyRegistry.defaultInstance.get(type, id);
  }

  static getAll<T = unknown>(type: string): T[] {
    return OntologyRegistry.defaultInstance.list(type as OntologyEntityType) as unknown as T[];
  }

  has(typeOrRef: OntologyEntityType | EntityRef, id?: string): boolean {
    if (typeof typeOrRef === 'string' && id) {
      return this.slots.has(entityKey({ type: typeOrRef, id }));
    }
    return this.slots.has(entityKey(typeOrRef as EntityRef));
  }

  list<T extends OntologyEntityType>(type: T, opts: { includeDeprecated?: boolean } = {}): EntityOfType<T>[] {
    const out: EntityOfType<T>[] = [];
    for (const slot of this.slots.values()) {
      if (slot.head.type !== type) continue;
      if (!opts.includeDeprecated && slot.head.status === 'deprecated') continue;
      out.push(slot.head as EntityOfType<T>);
    }
    return out;
  }

  /** Superseded versions, oldest first (the current head is not included). */
  history(ref: EntityRef): readonly OntologyEntity[] {
    return this.slots.get(entityKey(ref))?.history ?? [];
  }

  counts(): Record<OntologyEntityType, number> {
    const counts = Object.fromEntries(ONTOLOGY_ENTITY_TYPES.map((t) => [t, 0])) as Record<OntologyEntityType, number>;
    for (const slot of this.slots.values()) counts[slot.head.type] += 1;
    return counts;
  }

  // ---- relationships ------------------------------------------------------
  /**
   * Validates and adds an edge. Endpoints must already exist (no dangling references), the source→relationship→target
   * triple must be in the matrix, and edges of acyclic relationship types may not close a cycle.
   * Re-adding an identical edge is a no-op. Returns non-fatal warnings (e.g. edge to a deprecated entity).
   */
  addRelationship(input: unknown): { relationship: OntologyRelationship; warnings: readonly ValidationIssue[] } {
    const result = validateRelationship(input);
    if (!result.ok || !result.relationship) throw new OntologyValidationError(result.issues);
    const rel = result.relationship;
    const issues: ValidationIssue[] = [...result.issues];

    if (!this.has(rel.source)) {
      issues.push({ severity: 'error', code: 'DANGLING_REFERENCE', message: `Unknown source ${entityKey(rel.source)}.` });
    }
    if (rel.target.type !== 'external' && !this.has(rel.target)) {
      issues.push({ severity: 'error', code: 'DANGLING_REFERENCE', message: `Unknown target ${entityKey(rel.target)}.` });
    }
    if (hasErrors(issues)) throw new OntologyValidationError(issues);

    for (const ref of [rel.source, rel.target]) {
      if (ref.type === 'external') continue;
      if (this.slots.get(entityKey(ref))?.head.status === 'deprecated') {
        issues.push({ severity: 'warning', code: 'DEPRECATED_REFERENCE', message: `${entityKey(ref)} is deprecated; new relationships should point at its replacement.` });
      }
    }

    const key = edgeKey(rel);
    if (this.edges.has(key)) return { relationship: this.edges.get(key) as OntologyRelationship, warnings: issues };

    if (ACYCLIC_RELATIONSHIPS.includes(rel.relationship) && rel.target.type !== 'external') {
      if (this.reaches(rel.target, rel.source, rel.relationship)) {
        throw new OntologyValidationError([
          { severity: 'error', code: 'CIRCULAR_DEPENDENCY', message: `${entityKey(rel.source)} --${rel.relationship}--> ${entityKey(rel.target)} would create a ${rel.relationship} cycle.` },
        ]);
      }
    }

    this.edges.set(key, rel);
    return { relationship: rel, warnings: issues };
  }

  relationships(): readonly OntologyRelationship[] {
    return [...this.edges.values()];
  }

  from(ref: EntityRef, types?: readonly OntologyRelationshipType[]): OntologyRelationship[] {
    const k = entityKey(ref);
    return this.relationships().filter((r) => entityKey(r.source) === k && (!types || types.includes(r.relationship)));
  }

  to(ref: EntityRef, types?: readonly OntologyRelationshipType[]): OntologyRelationship[] {
    const k = entityKey(ref);
    return this.relationships().filter(
      (r) => r.target.type !== 'external' && entityKey(r.target) === k && (!types || types.includes(r.relationship))
    );
  }

  /** True when `to` is reachable from `from` following outgoing edges of exactly one relationship type. */
  private reaches(from: EntityRef, to: EntityRef, relationship: OntologyRelationshipType): boolean {
    const goal = entityKey(to);
    const seen = new Set<string>();
    const stack: EntityRef[] = [from];
    while (stack.length) {
      const cur = stack.pop() as EntityRef;
      const k = entityKey(cur);
      if (k === goal) return true;
      if (seen.has(k)) continue;
      seen.add(k);
      for (const edge of this.from(cur, [relationship])) {
        if (edge.target.type !== 'external') stack.push(edge.target);
      }
    }
    return false;
  }

  /**
   * Shortest chain of edges from one entity to another following outgoing edges (optionally limited to some
   * relationship types). This is graph traversal only — it ranks and recommends nothing.
   */
  findPath(
    from: EntityRef,
    to: EntityRef,
    opts: { relationships?: readonly OntologyRelationshipType[]; maxDepth?: number } = {}
  ): OntologyRelationship[] | undefined {
    const goal = entityKey(to);
    const maxDepth = opts.maxDepth ?? 10;
    const queue: { ref: EntityRef; path: OntologyRelationship[] }[] = [{ ref: from, path: [] }];
    const seen = new Set<string>([entityKey(from)]);
    while (queue.length) {
      const { ref, path } = queue.shift() as { ref: EntityRef; path: OntologyRelationship[] };
      if (entityKey(ref) === goal) return path;
      if (path.length >= maxDepth) continue;
      for (const edge of this.from(ref, opts.relationships)) {
        if (edge.target.type === 'external') continue;
        const k = entityKey(edge.target);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push({ ref: edge.target, path: [...path, edge] });
      }
    }
    return undefined;
  }

  // ---- whole-graph integrity ---------------------------------------------
  /** Re-checks every integrity rule across the graph. Errors = broken graph; warnings = worth a look. */
  validateGraph(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const edge of this.edges.values()) {
      const check = validateRelationship(edge);
      issues.push(...check.issues);
      if (!this.has(edge.source)) issues.push({ severity: 'error', code: 'DANGLING_REFERENCE', message: `Edge source ${entityKey(edge.source)} does not exist.` });
      if (edge.target.type !== 'external' && !this.has(edge.target)) {
        issues.push({ severity: 'error', code: 'DANGLING_REFERENCE', message: `Edge target ${entityKey(edge.target)} does not exist.` });
      }
    }

    for (const slot of this.slots.values()) {
      const e = slot.head;
      if (e.type === 'creative_recipe') {
        const record = e as unknown as Record<string, unknown>;
        for (const [field, type] of Object.entries(RECIPE_FIELD_TYPES)) {
          for (const id of (record[field] as string[] | undefined) ?? []) {
            if (!this.has({ type, id })) {
              issues.push({ severity: 'error', code: 'RECIPE_DANGLING_REFERENCE', message: `Recipe ${e.id}.${field} references unknown ${type} "${id}".`, path: field });
            } else if (this.slots.get(entityKey({ type, id }))?.head.status === 'deprecated') {
              issues.push({ severity: 'warning', code: 'DEPRECATED_REFERENCE', message: `Recipe ${e.id}.${field} references deprecated ${type} "${id}".`, path: field });
            }
          }
        }
      }
      if (e.type === 'combination_rule') {
        const refs = [...e.targets, ...e.when.flatMap((c) => (c.kind === 'entity' ? [c.ref] : []))];
        for (const ref of refs) {
          if (!this.has(ref)) issues.push({ severity: 'error', code: 'RULE_DANGLING_REFERENCE', message: `Combination rule ${e.id} references unknown ${entityKey(ref)}.` });
        }
      }
      if (e.status === 'deprecated' && e.deprecation?.replacedBy && !this.has({ type: e.type, id: e.deprecation.replacedBy })) {
        issues.push({ severity: 'error', code: 'DANGLING_REPLACEMENT', message: `${entityKey({ type: e.type, id: e.id })} names unknown replacement "${e.deprecation.replacedBy}".` });
      }
    }

    for (const rel of ACYCLIC_RELATIONSHIPS) {
      for (const edge of this.relationships().filter((r) => r.relationship === rel)) {
        if (edge.target.type !== 'external' && this.reaches(edge.target, edge.source, rel)) {
          issues.push({ severity: 'error', code: 'CIRCULAR_DEPENDENCY', message: `${rel} cycle through ${entityKey(edge.source)}.` });
        }
      }
    }
    return issues;
  }
}

export function createOntologyRegistry(): OntologyRegistry {
  return new OntologyRegistry();
}

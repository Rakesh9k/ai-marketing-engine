import { z } from 'zod';
import {
  CONFIDENCE_LEVELS,
  EntityRefSchema,
  ExternalRefSchema,
  ONTOLOGY_ENTITY_TYPES,
  type OntologyEntityType,
} from './ontology-types';

/**
 * Controlled relationship vocabulary and the machine-readable source → relationship → target matrix.
 * Relationship names are never free text anywhere in the codebase; `relatedTo` exists only as a flagged fallback.
 */

export const RELATIONSHIP_CATEGORIES = {
  causal_reasoning: ['influences', 'supports', 'motivates', 'derivedFrom', 'reveals', 'guides', 'addresses', 'targets', 'enables'],
  expression: ['expressedThrough', 'uses', 'implementedBy'],
  compatibility: ['compatibleWith', 'worksWith', 'appropriateFor', 'conditionalOn', 'oftenCombinedWith', 'alternativeTo'],
  conflict: ['conflictsWith', 'contradicts', 'weakens', 'notRecommendedFor', 'notRecommendedWith', 'avoids'],
  dependency: ['requires', 'constrainedBy', 'constrains', 'dependsOn'],
  strength: ['strengthens'],
  composition: ['composedOf'],
  learning: ['validatedBy', 'invalidatedBy', 'learnedFrom', 'measuredBy'],
  fallback: ['relatedTo'],
} as const;

export type RelationshipCategory = keyof typeof RELATIONSHIP_CATEGORIES;
export type OntologyRelationshipType = (typeof RELATIONSHIP_CATEGORIES)[RelationshipCategory][number];

export const ONTOLOGY_RELATIONSHIP_TYPES = Object.values(RELATIONSHIP_CATEGORIES).flat() as OntologyRelationshipType[];
export const OntologyRelationshipTypeSchema = z.enum(
  ONTOLOGY_RELATIONSHIP_TYPES as [OntologyRelationshipType, ...OntologyRelationshipType[]]
);

export const LEARNING_RELATIONSHIPS: readonly OntologyRelationshipType[] = RELATIONSHIP_CATEGORIES.learning;

/** Graphs of these relationships must stay acyclic: nothing may, transitively, require / derive from / contain itself. */
export const ACYCLIC_RELATIONSHIPS: readonly OntologyRelationshipType[] = ['requires', 'dependsOn', 'derivedFrom', 'composedOf'];

export function categoryOf(rel: OntologyRelationshipType): RelationshipCategory {
  for (const [category, members] of Object.entries(RELATIONSHIP_CATEGORIES)) {
    if ((members as readonly string[]).includes(rel)) return category as RelationshipCategory;
  }
  throw new Error(`Unclassified relationship ${rel}`);
}

// ---------------------------------------------------------------------------
// Relationship record (first-class edge).
// ---------------------------------------------------------------------------
export const RELATIONSHIP_STRENGTHS = ['strong', 'moderate', 'weak'] as const;

export const OntologyRelationshipSchema = z
  .object({
    id: z.string().min(1).optional(),
    source: EntityRefSchema,
    relationship: OntologyRelationshipTypeSchema,
    /** Entity target, or an external ref (evidence / experiment / performance / learning) for learning relationships. */
    target: z.union([EntityRefSchema, ExternalRefSchema]),
    strength: z.enum(RELATIONSHIP_STRENGTHS).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    rationale: z.string().min(1).optional(),
    /** Honest uncertainty: omit, or `unknown` / `hypothesis`, unless evidenceRefs back a stronger level. */
    confidence: z.enum(CONFIDENCE_LEVELS).optional(),
    evidenceRefs: z.array(z.string().min(1)).optional(),
    constraints: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();
export type OntologyRelationship = z.infer<typeof OntologyRelationshipSchema>;

// ---------------------------------------------------------------------------
// Compatibility matrix.
// ---------------------------------------------------------------------------
export interface RelationshipRule {
  readonly source: OntologyEntityType;
  readonly relationship: OntologyRelationshipType;
  readonly target: OntologyEntityType;
}

type T = OntologyEntityType;
const STRUCTURES: readonly T[] = ['hook_pattern', 'story_structure', 'copy_structure', 'visual_structure', 'cta_structure'];
const ALL: readonly T[] = ONTOLOGY_ENTITY_TYPES;
const EXPRESSIVE: readonly T[] = ['creative_mechanism', ...STRUCTURES, 'offer_mechanism', 'style_system'];

function rows(sources: readonly T[], relationship: OntologyRelationshipType, targets: readonly T[]): RelationshipRule[] {
  return sources.flatMap((source) => targets.map((target) => ({ source, relationship, target })));
}

/** Peer relationships: same type on both sides (mechanism ↔ mechanism). */
const sameType = (types: readonly T[], relationship: OntologyRelationshipType): RelationshipRule[] =>
  types.map((t) => ({ source: t, relationship, target: t }));

export const RELATIONSHIP_MATRIX: readonly RelationshipRule[] = [
  // Reasoning chain: psychology → motivation → principle → mechanism
  ...rows(['psychology'], 'influences', ['human_motivation', 'marketing_principle']),
  ...rows(['psychology'], 'supports', ['marketing_principle', 'creative_mechanism', 'human_motivation']),
  // Phase 10.2 Psychology Bank: contextual applicability, mechanism compatibility, conflicts and ethical constraints
  ...rows(['psychology'], 'compatibleWith', ['creative_mechanism']),
  ...rows(['psychology'], 'conflictsWith', ['creative_mechanism']),
  ...rows(['psychology'], 'notRecommendedWith', ['creative_mechanism']),
  ...rows(['psychology'], 'appropriateFor', ['audience_situation']),
  ...rows(['psychology'], 'notRecommendedFor', ['audience_situation']),
  ...rows(['psychology'], 'conditionalOn', ['audience_situation', 'insight_pattern']),
  ...rows(['psychology'], 'constrainedBy', ['anti_pattern']),
  ...rows(['psychology'], 'oftenCombinedWith', ['psychology']),
  ...rows(['psychology'], 'notRecommendedWith', ['psychology']),
  ...rows(['human_motivation'], 'derivedFrom', ['psychology']),
  ...rows(['human_motivation'], 'motivates', ['marketing_principle', 'creative_mechanism']),
  ...rows(['audience_situation'], 'reveals', ['insight_pattern']),
  ...rows(['insight_pattern'], 'derivedFrom', ['audience_situation']),
  ...rows(['insight_pattern'], 'supports', ['marketing_principle', 'human_motivation', 'creative_mechanism']),
  ...rows(['insight_pattern'], 'addresses', ['audience_situation']),
  // Phase 10.4 Insight Pattern Library
  ...rows(['insight_pattern'], 'uses', ['psychology']),
  ...rows(['insight_pattern'], 'expressedThrough', ['creative_mechanism']),
  ...rows(['insight_pattern'], 'appropriateFor', ['audience_situation']),
  ...rows(['insight_pattern'], 'constrainedBy', ['anti_pattern']),
  ...sameType(['insight_pattern'], 'compatibleWith'),
  ...sameType(['insight_pattern'], 'oftenCombinedWith'),
  ...sameType(['insight_pattern'], 'conflictsWith'),
  ...sameType(['insight_pattern'], 'alternativeTo'),
  ...sameType(['insight_pattern'], 'notRecommendedWith'),
  ...rows(['marketing_principle'], 'guides', ['creative_mechanism', 'offer_mechanism']),
  ...rows(['marketing_principle'], 'expressedThrough', ['creative_mechanism', 'offer_mechanism']),
  ...rows(['marketing_principle'], 'strengthens', ['creative_mechanism']),
  ...rows(['marketing_principle'], 'derivedFrom', ['psychology', 'human_motivation']),
  // Mechanism ↔ communication structure
  ...rows(['creative_mechanism'], 'expressedThrough', STRUCTURES),
  ...rows(['creative_mechanism'], 'worksWith', [...STRUCTURES, 'style_system', 'format', 'offer_mechanism']),
  ...rows(['creative_mechanism'], 'requires', ['asset_requirement']),
  ...rows(['creative_mechanism'], 'derivedFrom', ['psychology']),
  ...rows(['creative_mechanism'], 'addresses', ['insight_pattern']),
  ...rows(['creative_mechanism'], 'targets', ['audience_situation']),
  ...rows(['creative_mechanism'], 'uses', ['psychology']),
  ...rows(['creative_mechanism'], 'dependsOn', ['creative_mechanism']),
  ...rows(['creative_mechanism'], 'enables', STRUCTURES),
  ...rows(EXPRESSIVE, 'appropriateFor', ['audience_situation', 'platform', 'format']),
  ...rows(EXPRESSIVE, 'notRecommendedFor', ['audience_situation', 'platform', 'format']),
  ...rows(EXPRESSIVE, 'conditionalOn', ['audience_situation', 'insight_pattern', 'platform', 'format']),
  ...rows([...EXPRESSIVE, 'marketing_principle', 'format'], 'constrainedBy', ['anti_pattern']),
  ...rows([...EXPRESSIVE.filter((t) => t !== 'style_system')], 'avoids', ['anti_pattern']),
  // Peer relationships
  ...sameType(['creative_mechanism', 'offer_mechanism', 'marketing_principle', 'psychology'], 'conflictsWith'),
  ...sameType(['creative_mechanism', 'offer_mechanism', 'marketing_principle', 'style_system'], 'contradicts'),
  ...sameType(['creative_mechanism', 'offer_mechanism', 'marketing_principle'], 'weakens'),
  ...sameType(['creative_mechanism'], 'supports'),
  ...sameType(['creative_mechanism', 'offer_mechanism', 'marketing_principle'], 'strengthens'),
  ...sameType(
    ['creative_mechanism', 'offer_mechanism', ...STRUCTURES, 'style_system', 'format', 'asset_requirement', 'psychology', 'marketing_principle'],
    'alternativeTo'
  ),
  ...sameType(['creative_mechanism', 'offer_mechanism', ...STRUCTURES, 'style_system', 'marketing_principle', 'psychology'], 'compatibleWith'),
  ...sameType(['creative_mechanism', 'offer_mechanism', ...STRUCTURES, 'style_system', 'marketing_principle'], 'oftenCombinedWith'),
  ...sameType(['creative_mechanism', 'offer_mechanism', ...STRUCTURES, 'style_system', 'marketing_principle'], 'notRecommendedWith'),
  // Structures among themselves, and with execution context
  ...rows(STRUCTURES, 'worksWith', STRUCTURES).filter((r) => r.source !== r.target),
  ...rows(STRUCTURES, 'requires', ['asset_requirement']),
  ...rows(STRUCTURES, 'implementedBy', ['format']),
  ...rows(['style_system'], 'worksWith', ['format', 'creative_mechanism']),
  // Offer
  ...rows(['offer_mechanism'], 'worksWith', ['cta_structure', 'creative_mechanism', 'copy_structure']),
  ...rows(['offer_mechanism'], 'requires', ['asset_requirement']),
  // Execution context
  ...rows(['format'], 'constrainedBy', ['platform']),
  ...rows(['format'], 'appropriateFor', ['platform']),
  ...rows(['format'], 'requires', ['asset_requirement']),
  ...rows(['platform'], 'compatibleWith', ['format']),
  // Governance
  ...rows(['anti_pattern'], 'constrains', ALL.filter((t) => t !== 'anti_pattern' && t !== 'combination_rule' && t !== 'creative_recipe')),
  ...rows(['anti_pattern'], 'conflictsWith', ALL.filter((t) => t !== 'anti_pattern' && t !== 'combination_rule' && t !== 'creative_recipe')),
  ...rows(['anti_pattern'], 'alternativeTo', ['creative_mechanism', 'offer_mechanism', ...STRUCTURES]),
  ...rows(['combination_rule', 'creative_recipe'], 'composedOf', ALL.filter((t) => t !== 'creative_recipe')),
  ...rows(['creative_recipe'], 'derivedFrom', ['creative_recipe']),
  ...rows(['creative_recipe'], 'alternativeTo', ['creative_recipe']),
];

/** Learning relationships (validatedBy …) point at evidence / experiments / performance / learnings outside the ontology. */
export const LEARNING_SOURCE_TYPES: readonly T[] = ALL.filter(
  (t) => t !== 'audience_situation' && t !== 'platform' && t !== 'asset_requirement' && t !== 'human_motivation'
);

const MATRIX_INDEX: ReadonlySet<string> = new Set(RELATIONSHIP_MATRIX.map((r) => `${r.source}|${r.relationship}|${r.target}`));

export function isRelationshipAllowed(source: T, relationship: OntologyRelationshipType, target: T): boolean {
  if (relationship === 'relatedTo') return true; // fallback; validation flags it
  return MATRIX_INDEX.has(`${source}|${relationship}|${target}`);
}

export function allowedTargets(source: T, relationship: OntologyRelationshipType): T[] {
  return RELATIONSHIP_MATRIX.filter((r) => r.source === source && r.relationship === relationship).map((r) => r.target);
}

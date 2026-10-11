import type { z } from 'zod';
import { AntiPatternSchema, type AntiPattern } from './anti-pattern';
import { AssetRequirementSchema, type AssetRequirement } from './asset-requirement';
import { AudienceSituationSchema, type AudienceSituation } from './audience-situation';
import { CombinationRuleSchema, type CombinationRule } from './combination-rule';
import { CopyStructureSchema, type CopyStructure } from './copy-structure';
import { CreativeMechanismSchema, type CreativeMechanism } from './creative-mechanism';
import { CreativeRecipeSchema, type CreativeRecipe } from './creative-recipe';
import { CtaStructureSchema, type CtaStructure } from './cta-structure';
import { FormatSchema, type Format } from './format';
import { HookPatternSchema, type HookPattern } from './hook-pattern';
import { HumanMotivationSchema, type HumanMotivation } from './human-motivation';
import { InsightPatternSchema, type InsightPattern } from './insight-pattern';
import { MarketingPrincipleSchema, type MarketingPrinciple } from './marketing-principle';
import { OfferMechanismSchema, type OfferMechanism } from './offer-mechanism';
import { OfferStructureSchema, type OfferStructure } from './offer-structure';
import {
  ONTOLOGY_ENTITY_TYPES,
  EVIDENCE_REQUIRING_CONFIDENCE,
  type OntologyEntityType,
} from './ontology-types';
import {
  LEARNING_RELATIONSHIPS,
  LEARNING_SOURCE_TYPES,
  OntologyRelationshipSchema,
  allowedTargets,
  isRelationshipAllowed,
  type OntologyRelationship,
} from './ontology-relations';
import { PlatformSchema, type Platform } from './platform';
import { PsychologySchema, type Psychology } from './psychology';
import { StoryStructureSchema, type StoryStructure } from './story-structure';
import { StyleSystemSchema, type StyleSystem } from './style-system';
import { VisualStructureSchema, type VisualStructure } from './visual-structure';

export type OntologyEntity =
  | Psychology
  | HumanMotivation
  | MarketingPrinciple
  | AudienceSituation
  | InsightPattern
  | CreativeMechanism
  | HookPattern
  | StoryStructure
  | CopyStructure
  | VisualStructure
  | OfferMechanism
  | OfferStructure
  | CtaStructure
  | StyleSystem
  | Format
  | Platform
  | AssetRequirement
  | AntiPattern
  | CombinationRule
  | CreativeRecipe;

export type EntityOfType<T extends OntologyEntityType> = Extract<OntologyEntity, { type: T }>;

export const ENTITY_SCHEMAS: { readonly [T in OntologyEntityType]: z.ZodType<EntityOfType<T>, z.ZodTypeDef, unknown> } = {
  psychology: PsychologySchema,
  human_motivation: HumanMotivationSchema,
  marketing_principle: MarketingPrincipleSchema,
  audience_situation: AudienceSituationSchema,
  insight_pattern: InsightPatternSchema,
  creative_mechanism: CreativeMechanismSchema,
  hook_pattern: HookPatternSchema,
  story_structure: StoryStructureSchema,
  copy_structure: CopyStructureSchema,
  visual_structure: VisualStructureSchema,
  offer_mechanism: OfferMechanismSchema,
  offer_structure: OfferStructureSchema as any,
  cta_structure: CtaStructureSchema,
  style_system: StyleSystemSchema,
  format: FormatSchema,
  platform: PlatformSchema,
  asset_requirement: AssetRequirementSchema,
  anti_pattern: AntiPatternSchema,
  combination_rule: CombinationRuleSchema,
  creative_recipe: CreativeRecipeSchema,
};

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------
export interface ValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export class OntologyValidationError extends Error {
  constructor(public readonly issues: readonly ValidationIssue[]) {
    super(`Ontology validation failed: ${issues.filter((i) => i.severity === 'error').map((i) => `${i.code}: ${i.message}`).join('; ')}`);
    this.name = 'OntologyValidationError';
  }
}

const error = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'error', code, message, path });
const warning = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'warning', code, message, path });
export const hasErrors = (issues: readonly ValidationIssue[]): boolean => issues.some((i) => i.severity === 'error');

// ---------------------------------------------------------------------------
// Content guards: the ontology holds reusable intelligence, never finished outputs (Principles §16, Phase 10.1 §43–46).
// ---------------------------------------------------------------------------
/** Illustrative fields — abstract descriptions of what the object is / is not — are not scanned for output leakage. */
const UNSCANNED_KEYS: ReadonlySet<string> = new Set(['examples', 'antiExamples', 'metadata']);

const OUTPUT_SIGNALS: readonly { readonly code: string; readonly pattern: RegExp; readonly what: string }[] = [
  { code: 'PRICE_OR_OFFER_FIGURE', pattern: /(₹|rs\.?\s?|inr\s?|\$|€|£)\s?\d/i, what: 'a specific price' },
  { code: 'HASHTAG_OR_HANDLE', pattern: /(^|\s)[#@][a-z0-9_]{2,}/i, what: 'a hashtag or handle' },
  { code: 'URL', pattern: /https?:\/\/|www\./i, what: 'a URL' },
  { code: 'PIXEL_DIMENSIONS', pattern: /\b\d{3,4}\s?[x×]\s?\d{3,4}\b|\b\d+\s?px\b/i, what: 'pixel dimensions' },
  { code: 'COLOR_VALUE', pattern: /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\brgba?\(/i, what: 'a colour value' },
  { code: 'EMOJI', pattern: /\p{Extended_Pictographic}/u, what: 'an emoji (finished copy)' },
  { code: 'QUOTED_COPY', pattern: /["“”][^"“”]*\s[^"“”]*\s[^"“”]*\s[^"“”]*["“”]/, what: 'a quoted sentence (finished copy)' },
  { code: 'PERSONAL_DATA', pattern: /[\w.+-]+@[\w-]+\.[\w.]+|\b\d{10,}\b/, what: 'personal contact data' },
];

const FORBIDDEN_NAME_PATTERNS: readonly RegExp[] = [
  /^\d+\s/, // "5 Instagram Reel Ideas", "10 Restaurant Hooks"
  /\b(viral|trending audio|canva|best caption|exact caption|exact headline|winning creative)\b/i,
  /^(bad|poor|weak|generic)\s+(creative|content|post|ad)s?$/i, // "Bad Creative" is not an anti-pattern
  /\b(template|ideas?)\b$/i,
];

const DESIGN_SPECIFIC_TYPES: ReadonlySet<OntologyEntityType> = new Set(['style_system', 'visual_structure']);
const DESIGN_TERMS = /\b(font|typeface|serif|sans-serif|helvetica|arial|roboto|kerning|logo placement|margin|padding)\b/i;

/** Fields in which an unconditional effectiveness claim is a violation (Principles §4, §9). */
const CLAIM_FIELDS: ReadonlySet<string> = new Set([
  'definition', 'semanticPurpose', 'possibleEffects', 'psychologicalBasis', 'strategicPurpose', 'narrativeLogic',
  'attentionLogic', 'communicationLogic', 'hierarchyLogic', 'actionLogic', 'insight', 'implication',
  'whatItDoes', 'whyItMayWork', 'technicalDefinition', 'creativeInterpretation', 'strategicImplication',
  'purpose', 'strengths', 'bestFor',
]);
const UNIVERSAL_CLAIM =
  /\b(always|(guarantee[sd]?|guaranteeing)\s+(to\s+|that\s+)?(convert|work|increase|improve|boost|results?|conversions?|sales|success|virality|ctr|roi|engagement|growth|uplift)|proven to|100\s?%|every time|without fail|never fails?|works for everyone|cannot fail)\b/i;

function* walkStrings(value: unknown, key = '', skip: ReadonlySet<string> = new Set()): Generator<{ key: string; path: string; text: string }> {
  const visit = function* (v: unknown, k: string, path: string): Generator<{ key: string; path: string; text: string }> {
    if (typeof v === 'string') yield { key: k, path, text: v };
    else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* visit(v[i], k, `${path}[${i}]`);
    else if (v && typeof v === 'object') {
      for (const [childKey, child] of Object.entries(v as Record<string, unknown>)) {
        if (skip.has(childKey)) continue;
        yield* visit(child, childKey, path ? `${path}.${childKey}` : childKey);
      }
    }
  };
  yield* visit(value, key, key);
}

export function checkEntityContent(entity: OntologyEntity): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (FORBIDDEN_NAME_PATTERNS.some((p) => p.test(entity.name))) {
    issues.push(error('FINISHED_OUTPUT_NAME', `"${entity.name}" reads like a content asset, idea list or template, not reusable intelligence.`, 'name'));
  }

  for (const { key, path, text } of walkStrings(entity, '', UNSCANNED_KEYS)) {
    for (const signal of OUTPUT_SIGNALS) {
      if (signal.pattern.test(text)) {
        issues.push(error(signal.code, `${path} contains ${signal.what}; the ontology stores reusable intelligence, not finished outputs or customer data.`, path));
      }
    }
    if (entity.type !== 'anti_pattern' && CLAIM_FIELDS.has(key) && UNIVERSAL_CLAIM.test(text)) {
      issues.push(error('UNIVERSAL_EFFECTIVENESS_CLAIM', `${path} claims universal or guaranteed effectiveness; state conditions and possible effects instead.`, path));
    }
    if (DESIGN_SPECIFIC_TYPES.has(entity.type) && DESIGN_TERMS.test(text)) {
      issues.push(error('DESIGN_SPECIFICS', `${path} contains brand-design specifics; those belong to the design system, not the ontology.`, path));
    }
  }
  return issues;
}

/** Id/slug, lifecycle and honesty rules that Zod shape checks cannot express. */
export function checkEntityRules(entity: OntologyEntity): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (entity.status === 'deprecated' && !entity.deprecation) {
    issues.push(error('DEPRECATION_REQUIRED', 'A deprecated entity must record why and when it was deprecated.', 'deprecation'));
  }
  if (entity.status !== 'deprecated' && entity.deprecation) {
    issues.push(error('DEPRECATION_ON_ACTIVE', 'Only deprecated entities may carry deprecation metadata.', 'deprecation'));
  }
  if (entity.confidence && EVIDENCE_REQUIRING_CONFIDENCE.includes(entity.confidence) && !((entity as any).evidenceRefs && (entity as any).evidenceRefs.length)) {
    issues.push(error('CONFIDENCE_WITHOUT_EVIDENCE', `Confidence "${entity.confidence}" requires evidenceRefs; do not fabricate confidence.`, 'confidence'));
  }
  if (entity.type === 'combination_rule') {
    if (!entity.when.some((c: any) => c.kind === 'entity')) {
      issues.push(error('RULE_NEEDS_ENTITY_CONDITION', 'A combination rule must reference at least one ontology object in its conditions.', 'when'));
    }
    if (entity.outcome === 'recommend_target' && entity.targets.length === 0) {
      issues.push(error('RULE_NEEDS_TARGET', 'A "recommend_target" rule must name its targets.', 'targets'));
    }
  }
  if (entity.type === 'anti_pattern' && entity.kind === 'ethical_prohibition' && entity.alternatives.length === 0) {
    issues.push(warning('PROHIBITION_WITHOUT_ALTERNATIVE', 'An ethical prohibition should point to a legitimate alternative.', 'alternatives'));
  }
  return issues;
}

export interface EntityValidationResult {
  readonly ok: boolean;
  readonly entity?: OntologyEntity;
  readonly issues: readonly ValidationIssue[];
}

export function validateEntity(input: unknown): EntityValidationResult {
  const rawType = typeof input === 'object' && input !== null ? (input as { type?: unknown }).type : undefined;
  if (typeof rawType !== 'string' || !(ONTOLOGY_ENTITY_TYPES as readonly string[]).includes(rawType)) {
    return { ok: false, issues: [error('UNKNOWN_ENTITY_TYPE', `Unknown ontology entity type: ${String(rawType)}`, 'type')] };
  }
  const type = rawType as OntologyEntityType;
  const parsed = (ENTITY_SCHEMAS[type] as z.ZodType<OntologyEntity, z.ZodTypeDef, unknown>).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => error('INVALID_ENTITY', i.message, i.path.join('.'))),
    };
  }
  const issues = [...checkEntityRules(parsed.data), ...checkEntityContent(parsed.data)];
  return { ok: !hasErrors(issues), entity: parsed.data, issues };
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------
export interface RelationshipValidationResult {
  readonly ok: boolean;
  readonly relationship?: OntologyRelationship;
  readonly issues: readonly ValidationIssue[];
}

export function validateRelationship(input: unknown): RelationshipValidationResult {
  const rawSourceType = (input as { source?: { type?: unknown } } | null)?.source?.type;
  const rawTargetType = (input as { target?: { type?: unknown } } | null)?.target?.type;
  for (const [label, t] of [['source', rawSourceType], ['target', rawTargetType]] as const) {
    if (typeof t === 'string' && t !== 'external' && !(ONTOLOGY_ENTITY_TYPES as readonly string[]).includes(t)) {
      return { ok: false, issues: [error('UNKNOWN_ENTITY_TYPE', `Unknown ontology entity type on ${label}: ${t}`, label)] };
    }
  }
  const parsed = OntologyRelationshipSchema.safeParse(input);
  if (!parsed.success) {
    const unknownRel = parsed.error.issues.some((i) => i.path[0] === 'relationship');
    return {
      ok: false,
      issues: parsed.error.issues.map((i) =>
        error(unknownRel && i.path[0] === 'relationship' ? 'UNKNOWN_RELATIONSHIP_TYPE' : 'INVALID_RELATIONSHIP', i.message, i.path.join('.'))
      ),
    };
  }
  const rel = parsed.data;
  const issues: ValidationIssue[] = [];

  if (rel.target.type !== 'external' && rel.source.type === rel.target.type && rel.source.id === rel.target.id) {
    issues.push(error('SELF_RELATIONSHIP', `An entity cannot be related to itself (${rel.source.type}:${rel.source.id}).`));
  }

  const isLearning = LEARNING_RELATIONSHIPS.includes(rel.relationship);
  if (isLearning && rel.target.type !== 'external') {
    issues.push(error('LEARNING_TARGET_MUST_BE_EXTERNAL', `${rel.relationship} points at evidence / experiments / performance / learnings, not ontology entities.`));
  } else if (!isLearning && rel.target.type === 'external') {
    issues.push(error('EXTERNAL_TARGET_NOT_ALLOWED', `${rel.relationship} must target an ontology entity.`));
  } else if (isLearning) {
    if (!LEARNING_SOURCE_TYPES.includes(rel.source.type)) {
      issues.push(error('INVALID_SOURCE_TARGET', `${rel.source.type} cannot be the subject of ${rel.relationship}.`));
    }
  } else if (rel.target.type !== 'external' && !isRelationshipAllowed(rel.source.type, rel.relationship, rel.target.type)) {
    const allowed = allowedTargets(rel.source.type, rel.relationship);
    issues.push(
      error(
        'INVALID_SOURCE_TARGET',
        `${rel.source.type} --${rel.relationship}--> ${rel.target.type} is not allowed.` +
          (allowed.length ? ` Allowed targets: ${allowed.join(', ')}.` : ` ${rel.source.type} has no "${rel.relationship}" relationship.`)
      )
    );
  }

  if (rel.relationship === 'relatedTo') {
    issues.push(warning('GENERIC_RELATIONSHIP', '"relatedTo" is a fallback; prefer a semantic relationship.'));
  }
  if (rel.confidence && EVIDENCE_REQUIRING_CONFIDENCE.includes(rel.confidence) && !(rel.evidenceRefs && rel.evidenceRefs.length)) {
    issues.push(error('CONFIDENCE_WITHOUT_EVIDENCE', `Confidence "${rel.confidence}" requires evidenceRefs; omit confidence or mark it "hypothesis" / "unknown".`));
  }
  return { ok: !hasErrors(issues), relationship: rel, issues };
}

/** Exposed for the Psychology Bank, which applies the output-leakage signals to illustrative fields as well. */
export function scanOutputSignals(text: string): { code: string; what: string }[] {
  return OUTPUT_SIGNALS.filter((s) => s.pattern.test(text)).map((s) => ({ code: s.code, what: s.what }));
}

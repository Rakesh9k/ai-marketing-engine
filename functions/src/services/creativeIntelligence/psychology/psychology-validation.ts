import {
  CONFIDENCE_LEVELS,
  PSYCHOLOGY_CATEGORIES,
  hasErrors,
  scanOutputSignals,
  validateEntity,
  validateRelationship,
  type EntityRef,
  type ValidationIssue,
} from '../ontology';
import { confidenceCeiling, CLAIMS_EVIDENCE_BASES } from './psychology-evidence';
import { ETHICAL_APPLICATIONS } from './psychology-boundaries';
import { FUTURE_PSYCHOLOGY_CATEGORIES, type PsychologyBankEntry, type PsychologyPrinciple } from './psychology-types';

const error = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'error', code, message, path });
const warning = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'warning', code, message, path });

/** Principles whose misuse is deception. They must be marked `elevated` and carry full ethical governance. */
export const ETHICALLY_SENSITIVE_IDS: ReadonlySet<string> = new Set(ETHICAL_APPLICATIONS.map((a) => a.principleId));

// ---------------------------------------------------------------------------
// Semantic quality (bank §48, §81, §91): the bank will influence AI-generated strategy, so its language must not
// state psychology as certainty or as a lever.
// ---------------------------------------------------------------------------
const UNQUALIFIED_CLAIM =
  /\b(will make (people|users|customers)|forces? (users|people|customers|them)|causes? (a )?(conversion|purchase|people)|proven to (convert|work|sell)|works every time|always works|guaranteed|humans are wired|the brain (likes|loves|is wired)|wired to|hard-?wired)\b/i;
const ABSOLUTE_LANGUAGE = /\b(never|always|everyone|nobody|all people|all customers)\b/i;
const BEHAVIORAL_MYTH =
  /\b(attention span of (an? )?\d+|\d+[- ]second attention|exactly twice|twice as (powerful|strong)|red makes|people hate too many choices|people always|system 1 controls|fomo always)\b/i;
const HEDGE = /\b(may|might|can|could|possibl|suggest|under|depends|associated|tends?|often|potential|when)\b/i;

/** Descriptive fields: where claims about what psychology DOES live. Boundary / prohibition fields may say "never". */
const DESCRIPTIVE_FIELDS = ['definition', 'whatItDoes', 'whyItMayWork', 'technicalDefinition', 'creativeInterpretation', 'strategicImplication'] as const;

/** Shared claim-language scan (also used by the Mechanism Bank). */
export function scanClaimLanguage(text: string, field: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (UNQUALIFIED_CLAIM.test(text)) issues.push(error('UNQUALIFIED_CLAIM', `${field} states communication or psychology as certainty or a lever; use "may", "can", "under conditions".`, field));
  if (BEHAVIORAL_MYTH.test(text)) issues.push(error('BEHAVIORAL_MYTH', `${field} repeats a disputed behavioral claim as fact; if useful, record it as a hypothesis with evidence.`, field));
  if (ABSOLUTE_LANGUAGE.test(text)) issues.push(warning('ABSOLUTE_LANGUAGE', `${field} uses absolute language; check that it is supported and qualified.`, field));
  return issues;
}

export function checkSemanticQuality(p: PsychologyPrinciple): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of DESCRIPTIVE_FIELDS) {
    const text = p[field];
    if (!text) continue;
    if (UNQUALIFIED_CLAIM.test(text)) issues.push(error('UNQUALIFIED_CLAIM', `${field} states psychology as certainty or a lever; use "may", "can", "under conditions".`, field));
    if (BEHAVIORAL_MYTH.test(text)) issues.push(error('BEHAVIORAL_MYTH', `${field} repeats a disputed behavioral claim as fact; if useful, record it as a hypothesis with evidence.`, field));
    if (ABSOLUTE_LANGUAGE.test(text)) issues.push(warning('ABSOLUTE_LANGUAGE', `${field} uses absolute language; check that it is supported and qualified.`, field));
  }
  for (const field of ['whyItMayWork', 'whatItDoes'] as const) {
    const text = p[field];
    if (text && !HEDGE.test(text)) issues.push(warning('EXPLANATION_NOT_QUALIFIED', `${field} should be phrased as a possibility or condition.`, field));
  }
  return issues;
}

/** Illustrative / application fields must not hold finished creative (captions, hashtags, prices, quoted lines). */
function checkReusability(p: PsychologyPrinciple): ValidationIssue[] {
  const fields: [string, readonly string[] | undefined][] = [
    ['examples', p.examples],
    ['antiExamples', p.antiExamples],
    ['safeApplications', p.safeApplications],
    ['prohibitedApplications', p.prohibitedApplications],
    ['intensityLadder', p.intensityLadder?.map((l) => l.description)],
  ];
  const issues: ValidationIssue[] = [];
  for (const [field, values] of fields) {
    for (const text of values ?? []) {
      for (const s of scanOutputSignals(text)) {
        issues.push(error(`FINISHED_CREATIVE_${s.code}`, `${field} contains ${s.what}; the Psychology Bank describes phenomena, not finished creative.`, field));
      }
    }
  }
  return issues;
}

export interface PrincipleValidationResult {
  readonly ok: boolean;
  readonly principle?: PsychologyPrinciple;
  readonly issues: readonly ValidationIssue[];
}

/**
 * Validates one principle against the ontology's rules AND the Psychology Bank's governance rules.
 * `draft` principles may be incomplete; every other status (active, experimental) must be fully governed.
 */
export function validatePrinciple(input: unknown): PrincipleValidationResult {
  if (typeof input !== 'object' || input === null || (input as { type?: unknown }).type !== 'psychology') {
    return { ok: false, issues: [error('NOT_PSYCHOLOGY', 'The Psychology Bank only holds ontology entities of type "psychology".', 'type')] };
  }
  const raw = input as { category?: unknown; additionalCategories?: unknown };
  const categories = [raw.category, ...(Array.isArray(raw.additionalCategories) ? raw.additionalCategories : [])].filter((c) => c !== undefined);
  const bad = categories.find((c) => !(PSYCHOLOGY_CATEGORIES as readonly unknown[]).includes(c));
  if (bad !== undefined) {
    const future = (FUTURE_PSYCHOLOGY_CATEGORIES as readonly unknown[]).includes(bad);
    return {
      ok: false,
      issues: [error('UNSUPPORTED_CATEGORY', future ? `Category "${String(bad)}" is planned but not enabled yet.` : `Unknown psychology category "${String(bad)}".`, 'category')],
    };
  }

  const base = validateEntity(input);
  if (!base.entity || base.entity.type !== 'psychology') return { ok: false, issues: base.issues };
  const p = base.entity as any;
  const issues: ValidationIssue[] = [...base.issues];

  if (!p.category) issues.push(error('CATEGORY_REQUIRED', 'Every bank principle must declare its category.', 'category'));
  const sensitive = ETHICALLY_SENSITIVE_IDS.has(p.id);
  if (sensitive && p.ethicalSensitivity !== 'elevated') {
    issues.push(error('SENSITIVE_PRINCIPLE_NOT_ELEVATED', `"${p.id}" is ethically sensitive and must be marked ethicalSensitivity: "elevated".`, 'ethicalSensitivity'));
  }

  if (p.status !== 'draft') {
    const required: [string, boolean][] = [
      ['whatItDoes', !!p.whatItDoes],
      ['whyItMayWork', !!p.whyItMayWork],
      ['explanationBasis', !!p.explanationBasis],
      ['whenToUse', !!p.whenToUse?.length],
      ['whenNotToUse', !!p.whenNotToUse?.length],
      ['appropriateIntensity', !!p.appropriateIntensity],
      ['riskLevel', !!p.riskLevel],
      ['riskDetails', !!p.riskDetails?.length],
      ['ethicalBoundary', !!p.ethicalBoundary],
      ['confidence', !!p.confidence],
    ];
    for (const [field, present] of required) {
      if (!present) issues.push(error('MISSING_REQUIRED_FIELD', `A ${p.status} principle must define ${field}.`, field));
    }
    for (const field of ['technicalDefinition', 'creativeInterpretation', 'strategicImplication', 'doesNotExplain', 'alternativeExplanations'] as const) {
      const value = p[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        issues.push(warning('MISSING_SELF_CRITIQUE', `${field} is missing; entries should say what they do not explain and offer alternatives.`, field));
      }
    }
  }

  if (p.ethicalSensitivity === 'elevated') {
    if (!p.ethicalBoundary) issues.push(error('ELEVATED_NEEDS_BOUNDARY', 'An elevated principle cannot exist without an ethical boundary.', 'ethicalBoundary'));
    if (!p.safeApplications?.length) issues.push(error('ELEVATED_NEEDS_SAFE_APPLICATIONS', 'An elevated principle must list safe applications.', 'safeApplications'));
    if (!p.prohibitedApplications?.length) issues.push(error('ELEVATED_NEEDS_PROHIBITED_APPLICATIONS', 'An elevated principle must list prohibited applications.', 'prohibitedApplications'));
    if (p.riskLevel === 'low') issues.push(error('ELEVATED_RISK_TOO_LOW', 'An elevated principle cannot be rated low risk.', 'riskLevel'));
  }

  for (const rung of p.intensityLadder ?? []) {
    if (rung.level === 'excessive' && rung.recommended) issues.push(error('EXCESSIVE_INTENSITY_RECOMMENDED', 'Excessive intensity can never be recommended.', 'intensityLadder'));
  }

  // Evidence, confidence and uncertainty (bank §48–51, §80)
  const evidence = p.evidence ?? [];
  const ceiling = confidenceCeiling(evidence);
  if (CONFIDENCE_LEVELS.indexOf(p.confidence ?? 'unknown') > CONFIDENCE_LEVELS.indexOf(ceiling)) {
    issues.push(error('CONFIDENCE_EXCEEDS_EVIDENCE', `Confidence "${p.confidence}" is higher than the attached evidence supports (ceiling: "${ceiling}"). An AI-generated hypothesis is not evidence.`, 'confidence'));
  }
  if (p.explanationBasis && CLAIMS_EVIDENCE_BASES.includes(p.explanationBasis) && ceiling === 'hypothesis') {
    issues.push(error('FINDING_WITHOUT_EVIDENCE', `explanationBasis "${p.explanationBasis}" requires supporting evidence; use plausible_mechanism, hypothesis or heuristic.`, 'explanationBasis'));
  }
  const refs = new Set(p.evidenceRefs ?? []);
  for (const e of evidence) {
    if (!refs.has(e.id)) issues.push(error('EVIDENCE_REFS_MISMATCH', `Evidence "${e.id}" must also appear in evidenceRefs.`, 'evidenceRefs'));
  }
  const generalRank = CONFIDENCE_LEVELS.indexOf(p.confidence ?? 'unknown');
  const hasInContextTest = evidence.some((e: any) => e.type === 'mitra_experiment' || e.type === 'ab_test');
  for (const c of p.contextualConfidence ?? []) {
    if (CONFIDENCE_LEVELS.indexOf(c.confidence) > generalRank && !hasInContextTest) {
      issues.push(error('CONTEXTUAL_CONFIDENCE_EXCEEDS_GENERAL', `Contextual confidence for "${c.context}" cannot exceed general confidence without an in-context test.`, 'contextualConfidence'));
    }
  }
  for (const l of p.outcomeLearnings ?? []) {
    if (l.outcome === 'failed' && l.effectOnConfidence === 'raised') {
      issues.push(error('LEARNING_CONTRADICTION', 'A failed outcome cannot raise confidence.', 'outcomeLearnings'));
    }
  }

  issues.push(...checkSemanticQuality(p), ...checkReusability(p));
  return { ok: !hasErrors(issues), principle: p, issues };
}

// ---------------------------------------------------------------------------
// Relationship declarations of an entry (resolved against a registry by the PsychologyRegistry).
// ---------------------------------------------------------------------------
export function validateEntryLinks(entry: PsychologyBankEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const source: EntityRef = { type: 'psychology', id: entry.principle.id };

  for (const l of entry.links) {
    const result = validateRelationship({ source, relationship: l.relationship, target: l.target, strength: l.strength, conditions: l.conditions ? [...l.conditions] : undefined, rationale: l.rationale });
    issues.push(...result.issues.map((i) => ({ ...i, path: `links.${l.relationship}->${l.target.id}` })));
  }

  const mechanisms = (relationship: string) => entry.links.filter((l) => l.relationship === relationship && l.target.type === 'creative_mechanism').map((l) => l.target.id);
  const overlap = mechanisms('compatibleWith').filter((id) => mechanisms('conflictsWith').includes(id) || mechanisms('notRecommendedWith').includes(id));
  if (overlap.length) issues.push(error('CONTRADICTORY_LINKS', `Mechanism(s) ${overlap.join(', ')} are declared both compatible and conflicting; express the difference as a condition.`));

  if (entry.principle.ethicalSensitivity === 'elevated' && !entry.links.some((l) => l.relationship === 'constrainedBy' && l.target.type === 'anti_pattern')) {
    issues.push(error('MISSING_ANTI_PATTERN_LINK', `Elevated principle "${entry.principle.id}" must be constrainedBy at least one anti-pattern.`));
  }
  return issues;
}

/** Shared reusability scan (also used by the Mechanism Bank): finished creative in an illustrative field is an error. */
export function scanReusability(field: string, values: readonly string[] | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const text of values ?? []) {
    for (const s of scanOutputSignals(text)) {
      issues.push(error(`FINISHED_CREATIVE_${s.code}`, `${field} contains ${s.what}; the bank describes reusable intelligence, not finished creative.`, field));
    }
  }
  return issues;
}

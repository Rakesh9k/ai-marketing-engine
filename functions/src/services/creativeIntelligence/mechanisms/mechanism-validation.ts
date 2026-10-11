import {
  CONFIDENCE_LEVELS,
  MECHANISM_CATEGORIES,
  MECHANISM_KINDS,
  hasErrors,
  validateEntity,
  type ValidationIssue,
} from '../ontology';
import {
  CORE_PSYCHOLOGY_ENTRIES,
  PSYCHOLOGY_TAXONOMY,
  confidenceCeiling,
  scanClaimLanguage,
  CLAIMS_EVIDENCE_BASES,
  scanReusability,
} from '../psychology';
import { ALL_STRUCTURE_IDS, FORBIDDEN_OBJECTIVES, VOCABULARIES, type MechanismVocabularyKind } from './mechanism-vocabulary';
import type { MarketingMechanism, MechanismBankEntry } from './mechanism-types';

const error = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'error', code, message, path });
const warning = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'warning', code, message, path });

/** Authored principles plus every concept the Psychology taxonomy plans. A mechanism may cite only these. */
export const KNOWN_PSYCHOLOGY_IDS: ReadonlySet<string> = new Set([
  ...CORE_PSYCHOLOGY_ENTRIES.map((e) => e.principle.id),
  ...Object.values(PSYCHOLOGY_TAXONOMY).flatMap((c) => c.plannedConcepts),
]);
const PSYCHOLOGY_NAMES: ReadonlySet<string> = new Set(CORE_PSYCHOLOGY_ENTRIES.map((e) => e.principle.name.toLowerCase()));

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------------------------------------------------------------------------
// Language guards (bank §54–60): mechanisms are methods, not outcomes, hacks or finished content.
// ---------------------------------------------------------------------------
const HACK_OR_OUTCOME = /\b(hack|hacks|viral|algorithm|growth hack|high[- ]ctr|guaranteed (sales|conversions?|results?))\b/i;
const PURPOSE_PROMISES = /\b(increases? (sales|conversions?|ctr|revenue)|boosts? (sales|conversions?|revenue)|drives? (sales|conversions?)|guarantees?\b)/i;
const EXECUTION_NAME = /\b(reel|caption|thumbnail|instagram|facebook|whatsapp status|tiktok)\b|^\d+\s|\b\d+k\b/i;
const INDUSTRY_SPECIFIC_NAME = /\b(biryani|restaurant|salon|hyderabad|haircut|menu|pizza|cafe|gym)\b/i;

const FIELD_VOCABULARY: readonly [keyof MarketingMechanism, MechanismVocabularyKind][] = [
  ['industries', 'industry'], ['productTypes', 'productType'], ['audienceSituationRefs', 'audienceSituation'], ['formats', 'format'],
  ['marketingPrincipleRefs', 'principle'], ['hookPatternRefs', 'hook'], ['storyStructureRefs', 'story'], ['visualStructureRefs', 'visual'],
  ['copyStructureRefs', 'copy'], ['requiredAssets', 'asset'], ['optionalAssets', 'asset'], ['preferredAssets', 'asset'], ['applicableObjectives', 'objective'],
];

export interface MechanismValidationResult {
  readonly ok: boolean;
  readonly mechanism?: MarketingMechanism;
  readonly issues: readonly ValidationIssue[];
}

/**
 * Validates one mechanism against the ontology's rules AND the bank's governance. `draft` mechanisms may be
 * incomplete; every other status must be fully governed.
 */
export function validateMechanism(input: unknown): MechanismValidationResult {
  if (typeof input !== 'object' || input === null || (input as { type?: unknown }).type !== 'creative_mechanism') {
    return { ok: false, issues: [error('NOT_MECHANISM', 'The Mechanism Bank only holds ontology entities of type "creative_mechanism".', 'type')] };
  }
  const raw = input as { mechanismCategory?: unknown; kind?: unknown };
  if (raw.mechanismCategory !== undefined && !(MECHANISM_CATEGORIES as readonly unknown[]).includes(raw.mechanismCategory)) {
    return { ok: false, issues: [error('UNSUPPORTED_CATEGORY', `Unknown mechanism category "${String(raw.mechanismCategory)}".`, 'mechanismCategory')] };
  }
  if (raw.kind !== undefined && !(MECHANISM_KINDS as readonly unknown[]).includes(raw.kind)) {
    return { ok: false, issues: [error('UNSUPPORTED_KIND', `Unknown mechanism kind "${String(raw.kind)}".`, 'kind')] };
  }

  const base = validateEntity(input);
  if (!base.entity || base.entity.type !== 'creative_mechanism') return { ok: false, issues: base.issues };
  const m = base.entity as any;
  const issues: ValidationIssue[] = [...base.issues];
  const kind = m.kind ?? 'mechanism';

  if (!m.mechanismCategory) issues.push(error('CATEGORY_REQUIRED', 'Every bank mechanism must declare its category.', 'mechanismCategory'));
  if (!m.code) issues.push(error('CODE_REQUIRED', 'Every bank mechanism needs a stable MEC-### code.', 'code'));

  // ---- Abstraction: execution / psychology / structure / outcome masquerading as a mechanism -----------------
  if (EXECUTION_NAME.test(m.name)) issues.push(error('EXECUTION_MASQUERADING', `"${m.name}" names a platform, asset or number: that is an execution, not a mechanism.`, 'name'));
  if (INDUSTRY_SPECIFIC_NAME.test(m.name) || INDUSTRY_SPECIFIC_NAME.test(m.id)) issues.push(error('INDUSTRY_SPECIFIC_NAME', `"${m.name}" is tied to one industry or product; abstract it to the reusable mechanism.`, 'name'));
  if (HACK_OR_OUTCOME.test(`${m.name} ${m.definition} ${m.purpose ?? ''}`)) issues.push(error('OUTCOME_OR_HACK_LANGUAGE', 'Mechanisms are methods, not hacks or guaranteed outcomes (no "viral", "hack", "high CTR").', 'name'));
  if (KNOWN_PSYCHOLOGY_IDS.has(m.id) || KNOWN_PSYCHOLOGY_IDS.has(slugify(m.name)) || PSYCHOLOGY_NAMES.has(m.name.toLowerCase())) {
    issues.push(error('PSYCHOLOGY_MASQUERADING', `"${m.name}" is a psychological phenomenon, which belongs in the Psychology Bank; a mechanism is the communication method that applies it.`, 'name'));
  }
  if (kind === 'mechanism' && (ALL_STRUCTURE_IDS.has(m.id) || ALL_STRUCTURE_IDS.has(slugify(m.name)))) {
    issues.push(error('STRUCTURE_MASQUERADING', `"${m.name}" is a communication structure; classify it as kind "framework" or move it to the structure library.`, 'name'));
  }
  if (m.definition.length < 40) issues.push(error('DEFINITION_TOO_THIN', 'A definition must describe the communication logic, not name a tactic.', 'definition'));

  // ---- Governance: required fields for every non-draft mechanism ---------------------------------------------
  if (m.status !== 'draft') {
    const required: [string, boolean][] = [
      ['purpose', !!m.purpose],
      ['bestFor', !!m.bestFor?.length],
      ['strengths', !!m.strengths?.length],
      ['weaknesses', !!m.weaknesses?.length],
      ['psychologyRefs', !!m.psychologyRefs?.length],
      ['marketingPrincipleRefs', !!m.marketingPrincipleRefs?.length],
      ['requiredAssets', !!m.requiredAssets?.length],
      ['ethicalConstraints', m.ethicalConstraints.length > 0],
      ['confidence', !!m.confidence],
      ['explanationBasis', !!m.explanationBasis],
      ['riskLevel', !!m.riskLevel],
      ['ethicalSensitivity', !!m.ethicalSensitivity],
    ];
    for (const [field, present] of required) {
      if (!present) issues.push(error('MISSING_REQUIRED_FIELD', `A ${m.status} mechanism must define ${field}.`, field));
    }
    if (!m.audienceSituationRefs?.length) issues.push(warning('NO_AUDIENCE_SITUATION', 'No audience situation is declared; selection cannot match it to a situation.', 'audienceSituationRefs'));
  }

  // ---- Controlled vocabularies: no invented ids ---------------------------------------------------------------
  for (const [field, vocab] of FIELD_VOCABULARY) {
    for (const id of (m[field] as string[] | undefined) ?? []) {
      if (!VOCABULARIES[vocab].includes(id)) issues.push(error('UNKNOWN_REFERENCE', `${String(field)} contains "${id}", which is not a known ${vocab} id.`, String(field)));
    }
  }
  for (const objective of m.applicableObjectives) {
    if (FORBIDDEN_OBJECTIVES.includes(objective)) issues.push(error('OUTCOME_AS_OBJECTIVE', `"${objective}" is an outcome, not a marketing objective.`, 'applicableObjectives'));
  }
  for (const id of m.psychologyRefs ?? []) {
    if (!KNOWN_PSYCHOLOGY_IDS.has(id)) issues.push(error('UNKNOWN_PSYCHOLOGY', `psychologyRefs contains "${id}", which is neither an authored nor a planned Psychology Bank concept.`, 'psychologyRefs'));
  }
  const required = new Set(m.requiredAssets ?? []);
  for (const id of [...(m.optionalAssets ?? []), ...(m.preferredAssets ?? [])]) {
    if (required.has(id)) issues.push(warning('ASSET_LISTED_TWICE', `Asset "${id}" is both required and optional/preferred.`, 'optionalAssets'));
  }

  // ---- Ethics ------------------------------------------------------------------------------------------------
  if (m.ethicalSensitivity === 'elevated') {
    if (!m.ethicalConstraints.length) issues.push(error('ELEVATED_NEEDS_BOUNDARY', 'An elevated mechanism cannot exist without ethical boundaries.', 'ethicalConstraints'));
    if (!m.truthfulPreconditions.length) issues.push(error('ELEVATED_NEEDS_PRECONDITION', 'An elevated mechanism must declare the truthful precondition that makes it legitimate.', 'truthfulPreconditions'));
  }
  if (m.mechanismCategory === 'urgency_scarcity') {
    if (m.ethicalSensitivity !== 'elevated') issues.push(error('SCARCITY_NOT_ELEVATED', 'Urgency and scarcity mechanisms must be ethically elevated.', 'ethicalSensitivity'));
    if (!(m.requiredAssets ?? []).some((a: any) => ['genuine-deadline', 'real-inventory-data', 'capacity-information'].includes(a))) {
      issues.push(error('SCARCITY_WITHOUT_REAL_LIMIT', 'An urgency or scarcity mechanism must require a real deadline, inventory or capacity asset.', 'requiredAssets'));
    }
  }
  if (m.mechanismCategory === 'proof_authority' && m.ethicalSensitivity !== 'elevated') issues.push(error('PROOF_NOT_ELEVATED', 'Proof and authority mechanisms must be ethically elevated.', 'ethicalSensitivity'));
  if (m.mechanismCategory === 'pricing_offer_risk' && m.ethicalSensitivity !== 'elevated') issues.push(error('PRICING_NOT_ELEVATED', 'Pricing, offer and risk mechanisms must be ethically elevated.', 'ethicalSensitivity'));

  // ---- Evidence & confidence ---------------------------------------------------------------------------------
  const evidence = m.evidence ?? [];
  const ceiling = confidenceCeiling(evidence);
  if (CONFIDENCE_LEVELS.indexOf(m.confidence ?? 'unknown') > CONFIDENCE_LEVELS.indexOf(ceiling)) {
    issues.push(error('CONFIDENCE_EXCEEDS_EVIDENCE', `Confidence "${m.confidence}" is higher than the attached evidence supports (ceiling: "${ceiling}"). An AI-generated hypothesis is not evidence.`, 'confidence'));
  }
  if (m.explanationBasis && CLAIMS_EVIDENCE_BASES.includes(m.explanationBasis) && ceiling === 'hypothesis') {
    issues.push(error('FINDING_WITHOUT_EVIDENCE', `explanationBasis "${m.explanationBasis}" requires supporting evidence.`, 'explanationBasis'));
  }
  const refs = new Set(m.evidenceRefs ?? []);
  for (const e of evidence) if (!refs.has(e.id)) issues.push(error('EVIDENCE_REFS_MISMATCH', `Evidence "${e.id}" must also appear in evidenceRefs.`, 'evidenceRefs'));
  const generalRank = CONFIDENCE_LEVELS.indexOf(m.confidence ?? 'unknown');
  const hasInContextTest = evidence.some((e: any) => e.type === 'mitra_experiment' || e.type === 'ab_test');
  for (const c of m.contextualConfidence ?? []) {
    if (CONFIDENCE_LEVELS.indexOf(c.confidence) > generalRank && !hasInContextTest) {
      issues.push(error('CONTEXTUAL_CONFIDENCE_EXCEEDS_GENERAL', `Contextual confidence for "${c.context}" cannot exceed general confidence without an in-context test.`, 'contextualConfidence'));
    }
  }
  for (const l of m.outcomeLearnings ?? []) {
    if ((l.outcome === 'failed' || l.outcome === 'underperformed') && l.effectOnConfidence === 'raised') {
      issues.push(error('LEARNING_CONTRADICTION', 'A failed or underperforming outcome cannot raise confidence.', 'outcomeLearnings'));
    }
  }

  // ---- Semantic quality ---------------------------------------------------------------------------------------
  if (m.purpose && PURPOSE_PROMISES.test(m.purpose)) issues.push(error('PURPOSE_PROMISES_OUTCOME', 'Purpose must describe the job ("can support", "is intended to"), not promise an outcome.', 'purpose'));
  const prose: [string, string | undefined][] = [
    ['definition', m.definition], ['purpose', m.purpose], ['psychologicalBasis', m.psychologicalBasis],
    ...(m.strengths ?? []).map((s: any, i: any): [string, string] => [`strengths[${i}]`, s]),
    ...(m.bestFor ?? []).map((s: any, i: any): [string, string] => [`bestFor[${i}]`, s]),
  ];
  for (const [field, text] of prose) if (text) issues.push(...scanClaimLanguage(text, field));
  if (m.psychologicalBasis && !/\b(may|might|can|could|possible|depends|tends?|under|when)\b/i.test(m.psychologicalBasis)) {
    issues.push(warning('BASIS_NOT_QUALIFIED', 'psychologicalBasis should be phrased as a possibility or a condition.', 'psychologicalBasis'));
  }

  // ---- Reusability: nothing finished in any illustrative field -------------------------------------------------
  for (const [field, values] of [['examples', m.examples], ['antiExamples', m.antiExamples], ['bestFor', m.bestFor]] as const) {
    issues.push(...scanReusability(field, values));
  }

  return { ok: !hasErrors(issues), mechanism: m, issues };
}

// ---------------------------------------------------------------------------
// Entry-level and library-level checks
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'for', 'with', 'that', 'is', 'as', 'by', 'so', 'it', 'its', 'their', 'on', 'be', 'can', 'may']);
const words = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
const jaccard = (a: Set<string>, b: Set<string>): number => {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter || 1);
};

/** Checks that need only the entry itself: link shape and contradictions. */
export function validateMechanismLinks(entry: MechanismBankEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = entry.mechanism.id;
  const targets = (rels: string[]) => entry.links.filter((l) => rels.includes(l.relationship) && l.target.type === 'creative_mechanism').map((l) => l.target.id);
  const together = targets(['compatibleWith', 'oftenCombinedWith', 'supports']);
  const apart = targets(['notRecommendedWith', 'conflictsWith']);
  const overlap = together.filter((t) => apart.includes(t));
  if (overlap.length) issues.push(error('CONTRADICTORY_LINKS', `${id}: ${overlap.join(', ')} are both worksWith and avoidWith; express the difference as a condition.`));
  for (const t of [...together, ...apart]) if (t === id) issues.push(error('SELF_REFERENCE', `${id} references itself.`));
  if (!entry.links.some((l) => l.relationship === 'constrainedBy' && l.target.type === 'anti_pattern')) {
    issues.push(error('MISSING_ANTI_PATTERN', `${id}: every mechanism must be constrained by at least one anti-pattern.`));
  }
  return issues;
}

/** Library-level duplicate review: names, codes, near-duplicate names and definitions. */
export function reviewLibrary(entries: readonly MechanismBankEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const names = new Map<string, string>();
  const codes = new Map<string, string>();
  const ids = new Set<string>();
  for (const { mechanism: m } of entries) {
    if (ids.has(m.id)) issues.push(error('DUPLICATE_ID', `Duplicate id ${m.id}.`));
    ids.add(m.id);
    const nameKey = slugify(m.name);
    if (names.has(nameKey)) issues.push(error('DUPLICATE_NAME', `"${m.name}" duplicates ${names.get(nameKey)}.`));
    names.set(nameKey, m.id);
    if (m.code) {
      if (codes.has(m.code)) issues.push(error('DUPLICATE_CODE', `Code ${m.code} is used by ${codes.get(m.code)} and ${m.id}.`));
      codes.set(m.code, m.id);
    }
  }
  const list = entries.map((e) => e.mechanism);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i] as MarketingMechanism;
      const b = list[j] as MarketingMechanism;
      const nameSim = jaccard(words(a.name), words(b.name));
      const defSim = jaccard(words(a.definition), words(b.definition));
      if (nameSim === 1 && words(a.name).size > 0) issues.push(error('NEAR_DUPLICATE', `${a.id} and ${b.id} have the same name words.`));
      else if (defSim >= 0.7) issues.push(error('NEAR_DUPLICATE', `${a.id} and ${b.id} have near-identical definitions (similarity ${defSim.toFixed(2)}).`));
      else if (defSim >= 0.55) issues.push(warning('OVERLAP_REVIEW', `${a.id} and ${b.id} have overlapping definitions (similarity ${defSim.toFixed(2)}); confirm they are distinct abstractions.`));
    }
  }
  return issues;
}

import {
  CONFIDENCE_LEVELS,
  INSIGHT_CATEGORIES,
  hasErrors,
  validateEntity,
  type ValidationIssue,
} from '../ontology';
import { confidenceCeiling, scanClaimLanguage, scanReusability } from '../psychology';
import { KNOWN_PSYCHOLOGY_IDS, slugify } from '../mechanisms';
import { INSIGHT_VOCABULARIES, type InsightVocabularyKind } from './insight-vocabulary';
import { INSIGHT_TAXONOMY, type InsightBankEntry, type InsightPatternEntity } from './insight-types';

const error = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'error', code, message, path });
const warning = (code: string, message: string, path?: string): ValidationIssue => ({ severity: 'warning', code, message, path });

const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'they', 'them', 'their', 'than', 'then', 'when', 'what', 'will', 'would', 'about', 'into', 'more', 'most',
  'some', 'such', 'only', 'also', 'both', 'does', 'make', 'much', 'many', 'very', 'been', 'being', 'were', 'which', 'while', 'where', 'there', 'these', 'those',
  'each', 'other', 'could', 'should', 'might', 'often', 'rather', 'because', 'before', 'after', 'over', 'under', 'between', 'same', 'less', 'not', 'are', 'and', 'the', 'for',
]);
const stem = (w: string): string => w.replace(/(ing|ed|es|s)$/, '');
const tokens = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 3 && !STOPWORDS.has(w)).map(stem));
const overlap = (a: Set<string>, b: Set<string>): number => [...a].filter((w) => b.has(w)).length;
const jaccard = (a: Set<string>, b: Set<string>): number => overlap(a, b) / (a.size + b.size - overlap(a, b) || 1);

// ---------------------------------------------------------------------------
// The insight test (spec §46, §70): observation ≠ insight, tension, motivation, barrier, context, falsifiability.
// ---------------------------------------------------------------------------
const GENERIC_INSIGHT = /^(people|customers|consumers|everyone|users|buyers)\s+(want|like|love|value|need|prefer|expect)\s+[\w\s,-]{1,40}[.!]?$/i;
const PAIN_POINT = /^(customers|people|users|buyers|clients)\s+(are|feel|get|become)\s+(worried|frustrated|unhappy|annoyed|afraid|scared|stressed|confused|anxious)\b/i;
const IMPERATIVE_START = /^(use|add|show|make|post|create|run|offer|send|launch|try|build|write|share|give|promote|advertise)\b/i;
const EXECUTION_WORDS = /\b(reel|reels|caption|captions|carousel|hashtag|hashtags|thumbnail|instagram|tiktok|youtube|facebook|story post|tweet|whatsapp status)\b/i;
const OBSERVATION_INTERPRETS = /\b(because|wants?|wanted|needs?|crave[sd]?|loves?|loved|prefers?|preferred|desires?|convenien\w*|afraid|fear[sd]?|worr\w+|motivated|enjoy\w*)\b/i;
const PERSONA_DETAIL = /\b(aged?\s*\d{2}|\d{2}[- ]years?[- ]old|salary|income of|\blpa\b|name:|lives in a)/i;
const UNIVERSAL_AUDIENCE = /\b(all|every|always|never|only)\s+(indian|indians|hyderabadi|hyderabad|telugu|women|men|families|customers|people|parents|buyers|millennials)\b|\b(indians|hyderabadis|women|men)\s+(always|never|all)\b/i;
const HEDGE = /\b(may|might|can|could|often|sometimes|some|tends?|in this|when|where|as much as|rather than|not (only|just|simply|merely|necessarily))\b/i;
const REINTERPRETS = /(not (only|just|simply|merely|necessarily|always)|rather than|more than|as much as|instead of|isn['’]t|aren['’]t|doesn['’]t|don['’]t|may be|may not|less .{3,60}than|before they|until)/i;
const TACTIC_IN_INSIGHT = /\b(countdown|scarcity|urgency|discount|testimonial|before\/after|before-and-after|social proof|flash sale)\b/i;
const TESTABLE = /\b(test|compare|measure|observe|whether|if |ask|interview|track|check|look for)\b/i;

const FIELD_VOCABULARY: readonly [keyof InsightPatternEntity, InsightVocabularyKind][] = [
  ['motivationRefs', 'motivation'], ['barrierTypes', 'barrier'], ['objectives', 'objective'], ['industries', 'industry'],
  ['productTypes', 'productType'], ['audienceSituationRefs', 'situation'], ['marketingPrincipleRefs', 'principle'],
];

export interface InsightValidationOptions {
  /** Names of every mechanism in the bank; an insight statement may not simply name one (insight ≠ mechanism). */
  readonly mechanismNames?: readonly string[];
  readonly mechanismIds?: ReadonlySet<string>;
}

export interface InsightValidationResult {
  readonly ok: boolean;
  readonly insight?: InsightPatternEntity;
  readonly issues: readonly ValidationIssue[];
}

export function validateInsight(input: unknown, opts: InsightValidationOptions = {}): InsightValidationResult {
  if (typeof input !== 'object' || input === null || (input as { type?: unknown }).type !== 'insight_pattern') {
    return { ok: false, issues: [error('NOT_INSIGHT', 'The Insight Library only holds ontology entities of type "insight_pattern".', 'type')] };
  }
  const raw = input as { category?: unknown; additionalCategories?: unknown };
  const cats = [raw.category, ...(Array.isArray(raw.additionalCategories) ? raw.additionalCategories : [])].filter((c) => c !== undefined);
  const bad = cats.find((c) => !(INSIGHT_CATEGORIES as readonly unknown[]).includes(c));
  if (bad !== undefined) return { ok: false, issues: [error('UNSUPPORTED_CATEGORY', `Unknown insight category "${String(bad)}".`, 'category')] };

  const base = validateEntity(input);
  if (!base.entity || base.entity.type !== 'insight_pattern') return { ok: false, issues: base.issues };
  const i = base.entity;
  const issues: ValidationIssue[] = [...base.issues];
  const statement = i.insight.trim();

  // ---- Is it more than an observation / motivation / segment / pain point / persona / mechanism / execution? --------
  if (GENERIC_INSIGHT.test(statement)) issues.push(error('GENERIC_MOTIVATION_AS_INSIGHT', 'A bare "people want X" is an ingredient (a motivation), not an insight: add who, when, tension and barrier.', 'insight'));
  if (PAIN_POINT.test(statement)) issues.push(error('PAIN_POINT_AS_INSIGHT', 'A pain point describes a feeling; an insight explains what lies beneath it and why.', 'insight'));
  if (IMPERATIVE_START.test(statement)) issues.push(error('EXECUTION_AS_INSIGHT', 'An insight explains a human situation; it does not instruct. Move instructions to the marketing opportunity.', 'insight'));
  if (EXECUTION_WORDS.test(statement) || EXECUTION_WORDS.test(i.implication)) issues.push(error('EXECUTION_AS_INSIGHT', 'Insights and opportunities describe strategy, not formats or platforms.', 'insight'));
  if (TACTIC_IN_INSIGHT.test(statement)) issues.push(error('MECHANISM_AS_INSIGHT', 'The insight statement names a tactic or mechanism; establish the human situation first, then choose a mechanism.', 'insight'));
  for (const name of opts.mechanismNames ?? []) {
    if (name.length > 5 && statement.toLowerCase().includes(name.toLowerCase())) {
      issues.push(error('MECHANISM_AS_INSIGHT', `The insight statement names the mechanism "${name}"; mechanisms come after the insight, never as its justification.`, 'insight'));
    }
  }
  if (PERSONA_DETAIL.test(`${statement} ${i.surfaceObservation ?? ''} ${i.behavioralPattern ?? ''} ${i.audienceConditions.join(' ')}`)) {
    issues.push(error('PERSONA_AS_INSIGHT', 'Persona or demographic detail (age, income, job) is not an insight.', 'insight'));
  }
  const wordCount = statement.split(/\s+/).length;
  if (wordCount < 15 || statement.length < 90) issues.push(error('INSIGHT_TOO_THIN', 'An insight connects situation, tension, motivation, barrier and desired outcome; this is too short to do that.', 'insight'));
  if (!HEDGE.test(statement)) issues.push(error('INSIGHT_NOT_HEDGED', 'An insight is a hypothesis: phrase it with "may", "often", "when" or an explicit contrast.', 'insight'));
  if (!REINTERPRETS.test(statement)) issues.push(error('INSIGHT_LACKS_REINTERPRETATION', 'An insight reinterprets the behavior ("not only … but …", "rather than", "more than"); this restates it.', 'insight'));
  if (UNIVERSAL_AUDIENCE.test(`${statement} ${i.implication} ${i.behavioralPattern ?? ''}`)) issues.push(error('UNIVERSAL_AUDIENCE_CLAIM', 'Do not generalise to everyone in a group or culture; scope to this audience and context.', 'insight'));
  const coherenceSource = tokens(`${i.barrier} ${i.tension} ${Object.values(i.desiredOutcomes ?? {}).filter(Boolean).join(' ')} ${i.underlyingMotivation}`);
  if (overlap(tokens(statement), coherenceSource) < 2) issues.push(error('INSIGHT_DISCONNECTED', 'The insight statement does not use its own tension, barrier, motivation or desired outcome.', 'insight'));
  const oppTokens = tokens(i.implication);
  if (jaccard(tokens(statement), oppTokens) >= 0.6) issues.push(error('OPPORTUNITY_RESTATES_INSIGHT', 'The marketing opportunity must be a strategic consequence, not a rewording of the insight.', 'implication'));
  if (i.implication.length < 30) issues.push(error('OPPORTUNITY_TOO_THIN', 'State the strategic opportunity: what the business can do because of the insight.', 'implication'));

  // ---- Observation is separate from interpretation ------------------------------------------------------------
  for (const field of ['surfaceObservation', 'behavioralPattern'] as const) {
    const text = i[field];
    if (text && OBSERVATION_INTERPRETS.test(text)) issues.push(error('OBSERVATION_INTERPRETS', `${field} must describe what is observed, not why (found interpretive wording).`, field));
  }

  // ---- Governance: required fields for every non-draft insight -------------------------------------------------
  if (!i.category) issues.push(error('CATEGORY_REQUIRED', 'Every library insight must declare its category.', 'category'));
  if (!i.code) issues.push(error('CODE_REQUIRED', 'Every library insight needs a stable INS-### code.', 'code'));
  const outcomeKinds = Object.entries(i.desiredOutcomes ?? {}).filter(([, v]) => !!v).map(([k]) => k);
  if (i.status !== 'draft') {
    const required: [string, boolean][] = [
      ['surfaceObservation', !!i.surfaceObservation], ['behavioralPattern', !!i.behavioralPattern], ['tensionPair', !!i.tensionPair],
      ['motivationRefs', !!i.motivationRefs?.length], ['barrierTypes', !!i.barrierTypes?.length], ['contextConditions', !!i.contextConditions?.length],
      ['audienceSituationRefs', !!i.audienceSituationRefs?.length], ['objectives', !!i.objectives?.length], ['psychologyRefs', !!i.psychologyRefs?.length],
      ['marketingPrincipleRefs', !!i.marketingPrincipleRefs?.length], ['alternativeExplanations', (i.alternativeExplanations?.length ?? 0) >= 2],
      ['assumptions', !!i.assumptions?.length], ['limitations', !!i.limitations?.length], ['falsifiableBy', !!i.falsifiableBy],
      ['ethicalConsiderations', !!i.ethicalConsiderations?.length], ['confidence', !!i.confidence], ['ethicalSensitivity', !!i.ethicalSensitivity],
    ];
    for (const [field, present] of required) if (!present) issues.push(error('MISSING_REQUIRED_FIELD', `A ${i.status} insight must define ${field}${field === 'alternativeExplanations' ? ' (at least two)' : ''}.`, field));
    if (outcomeKinds.length < 2 || outcomeKinds.every((k) => k === 'functional')) {
      issues.push(error('OUTCOMES_PRODUCT_ONLY', 'Desired outcomes must include at least two kinds, and not only a functional one (emotional, social, identity or decision).', 'desiredOutcomes'));
    }
    if (!i.mechanismRefs?.length) issues.push(warning('NO_MECHANISM_PATH', 'No mechanism is referenced, so the chain insight → mechanism cannot be traced yet.', 'mechanismRefs'));
  }
  if (i.tensionPair) {
    const [a, b] = i.tensionPair;
    if (a.trim().toLowerCase() === b.trim().toLowerCase()) issues.push(error('TENSION_NOT_A_CONFLICT', 'A tension needs two different competing states.', 'tensionPair'));
  }
  if (i.falsifiableBy && !TESTABLE.test(i.falsifiableBy)) issues.push(error('NOT_FALSIFIABLE', 'falsifiableBy must describe an observation or test that could count against the insight.', 'falsifiableBy'));
  if (i.alternativeExplanations && new Set(i.alternativeExplanations.map((a) => a.toLowerCase())).size !== i.alternativeExplanations.length) {
    issues.push(error('DUPLICATE_ALTERNATIVES', 'Alternative explanations must be distinct.', 'alternativeExplanations'));
  }
  if (i.insight && i.alternativeExplanations?.some((a) => jaccard(tokens(a), tokens(statement)) >= 0.7)) {
    issues.push(error('ALTERNATIVE_IS_THE_INSIGHT', 'An alternative explanation repeats the insight rather than competing with it.', 'alternativeExplanations'));
  }

  // ---- Controlled vocabularies ---------------------------------------------------------------------------------
  for (const [field, vocab] of FIELD_VOCABULARY) {
    for (const id of (i[field] as string[] | undefined) ?? []) {
      if (!INSIGHT_VOCABULARIES[vocab].includes(id)) issues.push(error('UNKNOWN_REFERENCE', `${String(field)} contains "${id}", which is not a known ${vocab} id.`, String(field)));
    }
  }
  for (const id of i.psychologyRefs ?? []) {
    if (!KNOWN_PSYCHOLOGY_IDS.has(id)) issues.push(error('UNKNOWN_PSYCHOLOGY', `psychologyRefs contains "${id}", which is neither an authored nor a planned Psychology Bank concept.`, 'psychologyRefs'));
  }
  if (opts.mechanismIds) {
    for (const id of i.mechanismRefs ?? []) {
      if (!opts.mechanismIds.has(id)) issues.push(error('UNKNOWN_MECHANISM', `mechanismRefs contains "${id}", which is not in the Mechanism Bank.`, 'mechanismRefs'));
    }
  }
  if (KNOWN_PSYCHOLOGY_IDS.has(i.id) || (opts.mechanismIds?.has(i.id) ?? false) || KNOWN_PSYCHOLOGY_IDS.has(slugify(i.name))) {
    issues.push(error('INGREDIENT_AS_INSIGHT', `"${i.name}" is a psychological concept or mechanism name, not an insight.`, 'name'));
  }

  // ---- Ethics ------------------------------------------------------------------------------------------------
  const categories = [i.category, ...(i.additionalCategories ?? [])].filter((c): c is NonNullable<typeof c> => !!c);
  if (categories.some((c) => INSIGHT_TAXONOMY[c].elevated) && i.ethicalSensitivity !== 'elevated') {
    issues.push(error('SENSITIVE_INSIGHT_NOT_ELEVATED', 'Identity, social, emotional, aspiration, belonging, status and local-cultural insights must be ethically elevated.', 'ethicalSensitivity'));
  }

  // ---- Evidence & confidence ---------------------------------------------------------------------------------
  const evidence = i.evidence ?? [];
  const ceiling = confidenceCeiling(evidence);
  if (CONFIDENCE_LEVELS.indexOf(i.confidence ?? 'unknown') > CONFIDENCE_LEVELS.indexOf(ceiling)) {
    issues.push(error('CONFIDENCE_EXCEEDS_EVIDENCE', `Confidence "${i.confidence}" is higher than the attached evidence supports (ceiling: "${ceiling}"). An AI-generated hypothesis is not evidence.`, 'confidence'));
  }
  const refs = new Set(i.evidenceRefs ?? []);
  for (const e of evidence) if (!refs.has(e.id)) issues.push(error('EVIDENCE_REFS_MISMATCH', `Evidence "${e.id}" must also appear in evidenceRefs.`, 'evidenceRefs'));
  const rank = CONFIDENCE_LEVELS.indexOf(i.confidence ?? 'unknown');
  if (rank >= CONFIDENCE_LEVELS.indexOf('strong_evidence') && !evidence.some((e) => e.direction === 'supports' && e.context)) {
    issues.push(error('STRONG_WITHOUT_CONTEXT_EVIDENCE', 'Strong confidence in a contextual insight needs evidence from its own context.', 'confidence'));
  }
  if (rank >= CONFIDENCE_LEVELS.indexOf('strong_evidence') && (i.alternativeExplanations?.length ?? 0) >= 3) {
    issues.push(warning('CERTAINTY_WITH_OPEN_ALTERNATIVES', 'High confidence alongside several open alternative explanations: record how the alternatives were ruled out.', 'alternativeExplanations'));
  }
  const hasInContextTest = evidence.some((e) => e.type === 'mitra_experiment' || e.type === 'ab_test');
  for (const c of i.contextualConfidence ?? []) {
    if (CONFIDENCE_LEVELS.indexOf(c.confidence) > rank && !hasInContextTest) issues.push(error('CONTEXTUAL_CONFIDENCE_EXCEEDS_GENERAL', `Contextual confidence for "${c.context}" cannot exceed general confidence without an in-context test.`, 'contextualConfidence'));
  }
  for (const l of i.outcomeLearnings ?? []) {
    if ((l.outcome === 'failed' || l.outcome === 'unsupported') && l.effectOnConfidence === 'raised') issues.push(error('LEARNING_CONTRADICTION', 'A failed or unsupported outcome cannot raise confidence.', 'outcomeLearnings'));
  }

  // ---- Semantic quality & reusability -------------------------------------------------------------------------
  for (const [field, text] of [['insight', i.insight], ['implication', i.implication], ['behavioralPattern', i.behavioralPattern], ['underlyingMotivation', i.underlyingMotivation]] as const) {
    if (text) issues.push(...scanClaimLanguage(text, field));
  }
  for (const [field, values] of [['examples', i.examples], ['antiExamples', i.antiExamples], ['alternativeExplanations', i.alternativeExplanations], ['contextConditions', i.contextConditions]] as const) {
    issues.push(...scanReusability(field, values));
  }
  return { ok: !hasErrors(issues), insight: i, issues };
}

// ---------------------------------------------------------------------------
// Entry-level and library-level
// ---------------------------------------------------------------------------
export function validateInsightLinks(entry: InsightBankEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = entry.insight.id;
  const together = entry.links.filter((l) => l.relationship === 'compatibleWith' && l.target.type === 'insight_pattern').map((l) => l.target.id);
  const apart = entry.links.filter((l) => l.relationship === 'conflictsWith' && l.target.type === 'insight_pattern').map((l) => l.target.id);
  const both = together.filter((t) => apart.includes(t));
  if (both.length) issues.push(error('CONTRADICTORY_LINKS', `${id}: ${both.join(', ')} are both compatible and conflicting.`));
  for (const t of [...together, ...apart]) if (t === id) issues.push(error('SELF_REFERENCE', `${id} references itself.`));
  if (!entry.links.some((l) => l.relationship === 'constrainedBy' && l.target.type === 'anti_pattern')) issues.push(error('MISSING_ANTI_PATTERN', `${id}: every insight must be constrained by at least one anti-pattern.`));
  return issues;
}

export function reviewInsightLibrary(entries: readonly InsightBankEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = { id: new Set<string>(), name: new Map<string, string>(), code: new Map<string, string>() };
  for (const { insight: i } of entries) {
    if (seen.id.has(i.id)) issues.push(error('DUPLICATE_ID', `Duplicate id ${i.id}.`));
    seen.id.add(i.id);
    const key = slugify(i.name);
    if (seen.name.has(key)) issues.push(error('DUPLICATE_NAME', `"${i.name}" duplicates ${seen.name.get(key)}.`));
    seen.name.set(key, i.id);
    if (i.code) {
      if (seen.code.has(i.code)) issues.push(error('DUPLICATE_CODE', `Code ${i.code} is used by ${seen.code.get(i.code)} and ${i.id}.`));
      seen.code.set(i.code, i.id);
    }
  }
  const list = entries.map((e) => e.insight);
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const x = list[a] as InsightPatternEntity;
      const y = list[b] as InsightPatternEntity;
      const sim = jaccard(tokens(x.insight), tokens(y.insight));
      if (sim >= 0.7) issues.push(error('NEAR_DUPLICATE', `${x.id} and ${y.id} have near-identical insight statements (similarity ${sim.toFixed(2)}).`));
      else if (sim >= 0.5) issues.push(warning('OVERLAP_REVIEW', `${x.id} and ${y.id} overlap (similarity ${sim.toFixed(2)}); confirm they are distinct situations.`));
      if (x.tension === y.tension && x.barrier === y.barrier) issues.push(error('SAME_TENSION_AND_BARRIER', `${x.id} and ${y.id} share the same tension and barrier.`));
    }
  }
  return issues;
}

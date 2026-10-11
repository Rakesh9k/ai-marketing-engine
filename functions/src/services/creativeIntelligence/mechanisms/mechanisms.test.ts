import { createOntologyRegistry } from '../ontology';
import { createPsychologyBank } from '../psychology';
import {
  CORE_MECHANISM_ENTRIES,
  MECHANISM_ANTI_PATTERNS,
  MECHANISM_CATEGORIES,
  MECHANISM_TAXONOMY,
  MechanismValidationError,
  OVERLAP_REVIEW,
  createMechanismBank,
  defineMechanism,
  reviewLibrary,
  validateMechanism,
  validateMechanismLinks,
  type MechanismBankEntry,
  type MechanismSpec,
} from './index';

const codes = (issues: readonly { code: string }[]) => issues.map((i) => i.code);
const errors = (issues: readonly { severity: string; code: string }[]) => issues.filter((i) => i.severity === 'error').map((i) => i.code);
const entry = (id: string): MechanismBankEntry => {
  const e = CORE_MECHANISM_ENTRIES.find((x) => x.mechanism.id === id);
  if (!e) throw new Error(`no mechanism ${id}`);
  return e;
};
const mech = (id: string) => entry(id).mechanism;
const variant = (id: string, patch: Record<string, unknown>) => ({ ...mech(id), ...patch });

const GOLD = ['curiosity-gap', 'value-stack', 'story-from-failure', 'objection-removal', 'insider-knowledge'];

// One shared bank: installation is deterministic and read-only tests do not mutate it.
const bank = createMechanismBank();

describe('library shape', () => {
  test('the initial library is in the 100–150 range and category-balanced', () => {
    expect(CORE_MECHANISM_ENTRIES.length).toBeGreaterThanOrEqual(100);
    expect(CORE_MECHANISM_ENTRIES.length).toBeLessThanOrEqual(150);
    const counts = bank.counts();
    for (const c of MECHANISM_CATEGORIES) {
      const [lo, hi] = MECHANISM_TAXONOMY[c].targetRange;
      expect(counts[c]).toBeGreaterThanOrEqual(lo);
      expect(counts[c]).toBeLessThanOrEqual(hi);
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(CORE_MECHANISM_ENTRIES.length);
  });

  test('stable ids and codes: unique, well-formed, independent of array position', () => {
    const ids = CORE_MECHANISM_ENTRIES.map((e) => e.mechanism.id);
    const mcodes = CORE_MECHANISM_ENTRIES.map((e) => e.mechanism.code);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(mcodes).size).toBe(mcodes.length);
    for (const c of mcodes) expect(c).toMatch(/^MEC-\d{3}$/);
    // The gold five hold the first five codes, whatever order the library is assembled in.
    expect(GOLD.map((id) => mech(id).code)).toEqual(['MEC-001', 'MEC-002', 'MEC-003', 'MEC-004', 'MEC-005']);
    expect(bank.get('MEC-001')?.id).toBe('curiosity-gap');
    expect(bank.get('MEC-003')?.id).toBe('story-from-failure');
    // Reordering the library does not change identity.
    const reversed = createMechanismBank({ includeCore: false, entries: [...CORE_MECHANISM_ENTRIES].reverse() });
    expect(reversed.get('MEC-002')?.id).toBe('value-stack');
  });

  test('names are unique and every mechanism has a valid category', () => {
    const names = CORE_MECHANISM_ENTRIES.map((e) => e.mechanism.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const e of CORE_MECHANISM_ENTRIES) expect(MECHANISM_CATEGORIES).toContain(e.mechanism.mechanismCategory);
  });

  test('every mechanism validates with no errors and no warnings', () => {
    for (const e of CORE_MECHANISM_ENTRIES) {
      const v = validateMechanism(e.mechanism);
      expect(errors(v.issues)).toEqual([]);
      expect(v.issues.filter((i) => i.severity === 'warning')).toEqual([]);
    }
    expect(bank.validate().filter((i) => i.severity === 'error')).toEqual([]);
    expect(bank.validate().filter((i) => i.severity === 'warning')).toEqual([]);
  });

  test('library-level review finds no duplicate or near-duplicate mechanisms', () => {
    expect(reviewLibrary(CORE_MECHANISM_ENTRIES)).toEqual([]);
  });

  test('frameworks are classified as frameworks, not psychological mechanisms', () => {
    const frameworks = bank.query({ kind: 'framework' }).map((m) => m.id).sort();
    expect(frameworks).toEqual(['aida-framework', 'before-after-bridge', 'benefit-outcome-framework', 'feature-benefit-framework', 'pas-framework', 'problem-solution-framework']);
    for (const m of bank.query({ kind: 'framework' })) {
      expect(m.mechanismCategory).toBe('narrative_framework');
      expect(m.explanationBasis).toBe('heuristic');
    }
  });

  test('the overlap review is consistent with the library', () => {
    const ids = new Set(CORE_MECHANISM_ENTRIES.map((e) => e.mechanism.id));
    for (const d of OVERLAP_REVIEW) {
      for (const into of d.into) expect(ids.has(into)).toBe(true);
      if (d.ruling === 'merged' || d.ruling === 'psychology' || d.ruling === 'renamed') expect(ids.has(d.concept)).toBe(false);
      if (d.ruling === 'distinct') expect(ids.has(d.concept)).toBe(true);
    }
  });
});

describe('abstraction: not an execution, psychology, structure or outcome', () => {
  const base = 'curiosity-gap';

  test.each([
    ['Biryani Close-Up Reel', ['INDUSTRY_SPECIFIC_NAME', 'EXECUTION_MASQUERADING']],
    ['10K Views Hook', ['EXECUTION_MASQUERADING']],
    ['Best Instagram Caption', ['EXECUTION_MASQUERADING']],
    ['Viral Restaurant Post', ['OUTCOME_OR_HACK_LANGUAGE', 'INDUSTRY_SPECIFIC_NAME']],
    ['Scarcity Hack', ['OUTCOME_OR_HACK_LANGUAGE']],
  ])('"%s" is rejected', (name, expected) => {
    expect(errors(validateMechanism(variant(base, { name })).issues)).toEqual(expect.arrayContaining(expected as string[]));
  });

  test.each(['scarcity', 'curiosity', 'social-proof', 'loss-aversion', 'anchoring', 'novelty'])('psychology "%s" cannot be a mechanism', (id) => {
    expect(errors(validateMechanism(variant(base, { id, slug: id, name: id.replace(/-/g, ' ') })).issues)).toContain('PSYCHOLOGY_MASQUERADING');
  });

  test('a structure cannot be a plain mechanism, but may be a declared framework', () => {
    expect(errors(validateMechanism(variant(base, { id: 'tease-reveal-payoff', slug: 'tease-reveal-payoff', name: 'Tease Reveal Payoff' })).issues)).toContain('STRUCTURE_MASQUERADING');
    expect(errors(validateMechanism(variant(base, { id: 'tease-reveal-payoff', slug: 'tease-reveal-payoff', name: 'Tease Reveal Payoff', kind: 'framework' })).issues)).not.toContain('STRUCTURE_MASQUERADING');
  });

  test('finished copy, specific prices and outcome promises are rejected', () => {
    expect(errors(validateMechanism(variant(base, { definition: 'Use the line "Nobody tells you this about biryani" as a caption' })).issues)).toContain('QUOTED_COPY');
    expect(errors(validateMechanism(variant(base, { definition: 'A mechanism priced at ₹799 for weekend families to withhold information.' })).issues)).toContain('PRICE_OR_OFFER_FIGURE');
    expect(errors(validateMechanism(variant(base, { purpose: 'Increases sales by capturing attention.' })).issues)).toContain('PURPOSE_PROMISES_OUTCOME');
    expect(errors(validateMechanism(variant(base, { examples: ['Post this with #hyderabadfoodie'] })).issues).some((c) => c.startsWith('FINISHED_CREATIVE_'))).toBe(true);
  });

  test('false certainty and behavioral myths are rejected', () => {
    expect(errors(validateMechanism(variant(base, { definition: 'A mechanism that always works because the brain is wired to resolve gaps.' })).issues).length).toBeGreaterThan(0);
    expect(codes(validateMechanism(variant(base, { psychologicalBasis: 'The attention span of 8 seconds means gaps always win and people hate too many choices.' })).issues)).toContain('BEHAVIORAL_MYTH');
    expect(errors(validateMechanism(variant(base, { strengths: ['Guaranteed to convert every audience'] })).issues).length).toBeGreaterThan(0);
  });

  test('outcomes are not objectives and vocabularies are closed', () => {
    expect(errors(validateMechanism(variant(base, { applicableObjectives: ['viral'] })).issues)).toEqual(expect.arrayContaining(['OUTCOME_AS_OBJECTIVE', 'UNKNOWN_REFERENCE']));
    expect(errors(validateMechanism(variant(base, { requiredAssets: ['stolen-footage'] })).issues)).toContain('UNKNOWN_REFERENCE');
    expect(errors(validateMechanism(variant(base, { psychologyRefs: ['vibes'] })).issues)).toContain('UNKNOWN_PSYCHOLOGY');
    expect(errors(validateMechanism(variant(base, { industries: ['space-travel'] })).issues)).toContain('UNKNOWN_REFERENCE');
  });

  test('no mechanism is a hack, a virality promise, or an industry-specific execution', () => {
    for (const e of CORE_MECHANISM_ENTRIES) {
      const text = `${e.mechanism.name} ${e.mechanism.definition} ${e.mechanism.purpose}`;
      expect(text).not.toMatch(/\b(hack|viral|algorithm)\b/i);
      expect(e.mechanism.name).not.toMatch(/\b(biryani|restaurant|salon|hyderabad|reel|caption)\b/i);
      expect((e.mechanism.industries ?? []).length).toBeLessThan(6); // industries mean "especially strong in", never a pseudo-universal list
    }
  });

  test('unknown categories and kinds are rejected', () => {
    expect(codes(validateMechanism(variant(base, { mechanismCategory: 'vibes' })).issues)).toEqual(['UNSUPPORTED_CATEGORY']);
    expect(codes(validateMechanism(variant(base, { kind: 'trick' })).issues)).toEqual(['UNSUPPORTED_KIND']);
    expect(codes(validateMechanism({ ...mech(base), type: 'psychology' }).issues)).toEqual(['NOT_MECHANISM']);
  });
});

describe('required fields and governance', () => {
  test.each(['purpose', 'bestFor', 'strengths', 'weaknesses', 'psychologyRefs', 'marketingPrincipleRefs', 'requiredAssets', 'ethicalConstraints', 'confidence', 'explanationBasis', 'riskLevel'])(
    'a non-draft mechanism must define %s',
    (field) => {
      const empty = Array.isArray((mech('countdown') as Record<string, unknown>)[field]) ? [] : undefined;
      expect(errors(validateMechanism(variant('countdown', { [field]: empty })).issues)).toContain('MISSING_REQUIRED_FIELD');
    }
  );

  test('weaknesses are mandatory: every shipped mechanism documents how it can fail', () => {
    for (const e of CORE_MECHANISM_ENTRIES) expect((e.mechanism.weaknesses ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test('a draft may be incomplete, but an elevated draft still needs its ethical boundary', () => {
    expect(errors(validateMechanism(variant('countdown', { status: 'draft', weaknesses: [], bestFor: [], purpose: undefined })).issues)).toEqual([]);
    expect(errors(validateMechanism(variant('countdown', { status: 'draft', ethicalConstraints: [] })).issues)).toContain('ELEVATED_NEEDS_BOUNDARY');
  });

  test('every mechanism is constrained by at least one anti-pattern in the graph', () => {
    for (const e of CORE_MECHANISM_ENTRIES) {
      expect(bank.ontology.from({ type: 'creative_mechanism', id: e.mechanism.id }, ['constrainedBy']).length).toBeGreaterThan(0);
    }
  });

  test('stable codes are required for the bank', () => {
    expect(codes(validateMechanism(variant('countdown', { code: undefined })).issues)).toContain('CODE_REQUIRED');
  });
});

describe('ethics', () => {
  test('urgency & scarcity: every mechanism requires a REAL limit asset and a truthful precondition', () => {
    const urgency = bank.query({ category: 'urgency_scarcity' });
    expect(urgency.length).toBeGreaterThanOrEqual(14);
    for (const m of urgency) {
      expect(m.ethicalSensitivity).toBe('elevated');
      expect(m.truthfulPreconditions.length).toBeGreaterThan(0);
      expect((m.requiredAssets ?? []).some((a: any) => ['genuine-deadline', 'real-inventory-data', 'capacity-information'].includes(a))).toBe(true);
      expect(m.ethicalConstraints.join(' ')).toMatch(/real|genuine|honour|never/i);
    }
  });

  test('manufactured scarcity cannot be encoded as a valid mechanism', () => {
    expect(errors(validateMechanism(variant('countdown', { requiredAssets: ['offer-terms'] })).issues)).toContain('SCARCITY_WITHOUT_REAL_LIMIT');
    expect(errors(validateMechanism(variant('countdown', { ethicalSensitivity: 'standard' })).issues)).toContain('SCARCITY_NOT_ELEVATED');
    expect(errors(validateMechanism(variant('waitlist', { truthfulPreconditions: [] })).issues)).toContain('ELEVATED_NEEDS_PRECONDITION');
  });

  test.each([
    ['waitlist', 'fake-waitlist'], ['limited-edition', 'fake-limited-edition'], ['capacity-limits', 'fake-scarcity'], ['countdown', 'false-countdown'], ['flash-sale', 'fake-urgency'],
    ['customer-testimonial', 'fabricated-testimonial'], ['review-stack', 'fake-social-proof'], ['volume-social-proof', 'fabricated-order-numbers'], ['certification', 'false-authority'],
    ['awards', 'fake-award'], ['celebrity-endorsement', 'undisclosed-paid-endorsement'], ['institutional-backing', 'fake-affiliation'], ['case-study', 'fake-case-study'],
    ['value-stack', 'inflated-value-claim'], ['risk-reversal', 'false-guarantee'], ['keep-it-guarantee', 'false-guarantee'], ['objection-removal', 'false-guarantee'],
    ['transformation', 'misleading-before-after'], ['story-from-failure', 'fabricated-founder-story'], ['insider-knowledge', 'false-secret'], ['curiosity-gap', 'clickbait-information-gap'],
    ['comparative-proof', 'misleading-comparison'], ['data-proof', 'invented-statistics'], ['free-trial', 'forced-continuity'],
  ])('%s is constrained by %s', (id, antiPattern) => {
    const constrained = bank.ontology.from({ type: 'creative_mechanism', id }, ['constrainedBy']).map((e) => (e.target as { id: string }).id);
    expect(constrained).toContain(antiPattern);
    expect(bank.ontology.get('anti_pattern', antiPattern)?.kind).toBe('ethical_prohibition');
  });

  test('proof and pricing mechanisms are elevated, with preconditions and boundaries', () => {
    for (const m of [...bank.query({ category: 'proof_authority' }), ...bank.query({ category: 'pricing_offer_risk' })]) {
      expect(m.ethicalSensitivity).toBe('elevated');
      expect(m.truthfulPreconditions.length).toBeGreaterThan(0);
      expect(m.ethicalConstraints.length).toBeGreaterThan(0);
    }
    expect(errors(validateMechanism(variant('customer-testimonial', { ethicalSensitivity: 'standard' })).issues)).toContain('PROOF_NOT_ELEVATED');
    expect(errors(validateMechanism(variant('value-stack', { ethicalSensitivity: 'standard' })).issues)).toContain('PRICING_NOT_ELEVATED');
  });

  test('the added prohibitions are all ethical prohibitions with an alternative', () => {
    expect(MECHANISM_ANTI_PATTERNS.length).toBeGreaterThanOrEqual(18);
    for (const a of MECHANISM_ANTI_PATTERNS) {
      expect(a.kind).toBe('ethical_prohibition');
      expect(a.alternatives.length).toBeGreaterThan(0);
    }
  });

  test('persuasion vs deception for celebrity endorsement: fame is not assumed effective', () => {
    const m = mech('celebrity-endorsement');
    expect(m.weaknesses!.join(' ')).toMatch(/fame is not expertise/i);
    expect(m.compatibility.filter((c: any) => c.fit === 'weak').map((c: any) => c.value)).toEqual(expect.arrayContaining(['skeptical', 'price-sensitive', 'trust-deficient']));
    expect(m.riskLevel).toBe('high');
  });
});

describe('evidence, confidence and learning', () => {
  test('no mechanism asserts evidence it does not have: confidence is hypothesis, basis is not a finding', () => {
    for (const e of CORE_MECHANISM_ENTRIES) {
      expect(e.mechanism.confidence).toBe('hypothesis');
      expect(e.mechanism.evidence ?? []).toEqual([]);
      expect(['plausible_mechanism', 'heuristic']).toContain(e.mechanism.explanationBasis);
    }
  });

  test('confidence without evidence is rejected; an AI hypothesis is not evidence', () => {
    expect(errors(validateMechanism(variant('demonstration', { confidence: 'strong_evidence' })).issues)).toContain('CONFIDENCE_EXCEEDS_EVIDENCE');
    const ai = [{ id: 'ai1', type: 'ai_generated_hypothesis', summary: 'Synthetic AI-generated suggestion.', direction: 'supports', quality: 'high' }];
    expect(errors(validateMechanism(variant('demonstration', { confidence: 'moderate_evidence', evidence: ai, evidenceRefs: ['ai1'] })).issues)).toContain('CONFIDENCE_EXCEEDS_EVIDENCE');
    expect(errors(validateMechanism(variant('demonstration', { explanationBasis: 'established_finding' })).issues)).toContain('FINDING_WITHOUT_EVIDENCE');
  });

  test('real evidence supports matching confidence; ids must be listed', () => {
    const ev = [{ id: 'e1', type: 'academic_research', summary: 'Synthetic test evidence, not a real study.', direction: 'supports', quality: 'medium' }];
    expect(errors(validateMechanism(variant('demonstration', { confidence: 'moderate_evidence', evidence: ev, evidenceRefs: ['e1'], explanationBasis: 'supported_explanation' })).issues)).toEqual([]);
    expect(errors(validateMechanism(variant('demonstration', { confidence: 'moderate_evidence', evidence: ev, evidenceRefs: [] })).issues)).toContain('EVIDENCE_REFS_MISMATCH');
  });

  test('general vs contextual confidence: strong in general, unknown in a context; context cannot exceed general untested', () => {
    const ev = [{ id: 's', type: 'systematic_review', summary: 'Synthetic test evidence, not a real review.', direction: 'supports', quality: 'high' }];
    const ok = variant('demonstration', { confidence: 'strong_evidence', evidence: ev, evidenceRefs: ['s'], explanationBasis: 'supported_explanation', contextualConfidence: [{ context: 'a new unproven product category', confidence: 'unknown', rationale: 'No evidence in this category.' }] });
    expect(errors(validateMechanism(ok).issues)).toEqual([]);
    expect(errors(validateMechanism(variant('demonstration', { contextualConfidence: [{ context: 'any context', confidence: 'strong_evidence', rationale: 'Asserted without a test.' }] })).issues)).toContain('CONTEXTUAL_CONFIDENCE_EXCEEDS_GENERAL');
  });

  test('learning updates context, not the definition: Curiosity Gap works for discovery, underperforms for direct-order messages', () => {
    const learnings = [
      { outcome: 'worked', context: 'discovery and awareness content', summary: 'Held attention where the audience was not yet looking to buy.', effectOnConfidence: 'raised' },
      { outcome: 'underperformed', context: 'direct-order messages to high-intent audiences', summary: 'Clarity mattered more than intrigue for ready buyers.', effectOnConfidence: 'lowered' },
    ];
    const learned = variant('curiosity-gap', { outcomeLearnings: learnings });
    expect(errors(validateMechanism(learned).issues)).toEqual([]);
    expect((learned as { definition: string }).definition).toBe(mech('curiosity-gap').definition); // the definition is untouched
    expect(errors(validateMechanism(variant('curiosity-gap', { outcomeLearnings: [{ ...learnings[1], effectOnConfidence: 'raised' }] })).issues)).toContain('LEARNING_CONTRADICTION');
    // the authored weak-situation record already says the same thing structurally
    expect(mech('curiosity-gap').compatibility.find((c: any) => c.value === 'high-intent')?.fit).toBe('weak');
  });
});

describe('relationships and the graph', () => {
  test('mechanism, psychology and anti-pattern references all resolve; the graph has no integrity errors', () => {
    expect(bank.validate().filter((i) => i.severity === 'error')).toEqual([]);
    for (const e of CORE_MECHANISM_ENTRIES) {
      for (const l of e.links) {
        if (l.target.type === 'creative_mechanism') expect(bank.ontology.has(l.target)).toBe(true);
        if (l.target.type === 'anti_pattern') expect(bank.ontology.has(l.target)).toBe(true);
      }
    }
  });

  test('dangling mechanism references are rejected, and nothing is installed on failure', () => {
    const bad = defineMechanism({ ...(specFrom('countdown') as MechanismSpec), w: ['no-such-mechanism'] });
    const fresh = createMechanismBank({ includeCore: false });
    expect(() => fresh.installAll([bad])).toThrow(MechanismValidationError);
    expect(() => fresh.installAll([bad])).toThrow(/DANGLING_MECHANISM_REFERENCE/);
    expect(fresh.list()).toHaveLength(0);
  });

  test('unknown anti-patterns, contradictory links and self references are rejected', () => {
    const fresh = () => createMechanismBank({ includeCore: false });
    expect(() => fresh().installAll([defineMechanism({ ...(specFrom('countdown') as MechanismSpec), anti: ['made-up-pattern'], w: [], o: [], av: [] })])).toThrow(/DANGLING_ANTI_PATTERN_REFERENCE/);
    const contradictory = { ...entry('countdown'), links: [...entry('countdown').links, { relationship: 'compatibleWith' as const, target: { type: 'creative_mechanism' as const, id: 'flash-sale' } }, { relationship: 'notRecommendedWith' as const, target: { type: 'creative_mechanism' as const, id: 'flash-sale' } }] };
    expect(errors(validateMechanismLinks(contradictory))).toContain('CONTRADICTORY_LINKS');
    const selfRef = { ...entry('countdown'), links: [...entry('countdown').links, { relationship: 'compatibleWith' as const, target: { type: 'creative_mechanism' as const, id: 'countdown' } }] };
    expect(errors(validateMechanismLinks(selfRef))).toContain('SELF_REFERENCE');
    const noAnti = { ...entry('countdown'), links: entry('countdown').links.filter((l) => l.relationship !== 'constrainedBy') };
    expect(errors(validateMechanismLinks(noAnti))).toContain('MISSING_ANTI_PATTERN');
  });

  test('duplicates are detected: id, name, code and near-identical definitions', () => {
    const a = entry('countdown');
    const clone = (patch: Record<string, unknown>): MechanismBankEntry => ({ ...a, mechanism: { ...a.mechanism, ...patch } as typeof a.mechanism });
    expect(errors(reviewLibrary([a, clone({})]))).toEqual(expect.arrayContaining(['DUPLICATE_ID', 'DUPLICATE_NAME', 'DUPLICATE_CODE']));
    expect(errors(reviewLibrary([a, clone({ id: 'other-id', slug: 'other-id', name: 'Entirely Different Name', code: 'MEC-999' })]))).toContain('NEAR_DUPLICATE');
  });

  test('composition: the brief’s compatible compositions are present as graph edges', () => {
    const together = (a: string, b: string) => bank.related(a, ['compatibleWith', 'oftenCombinedWith', 'supports']).includes(b);
    // Curiosity Gap + Process Reveal + Demonstration
    expect(together('curiosity-gap', 'process-reveal')).toBe(true);
    expect(together('process-reveal', 'demonstration')).toBe(true);
    expect(together('curiosity-gap', 'demonstration')).toBe(true);
    // Local Identity + Customer POV + proof
    expect(together('local-identity', 'customer-pov')).toBe(true);
    expect(together('customer-pov', 'neighborhood-proof')).toBe(true);
    expect(together('local-identity', 'neighborhood-proof')).toBe(true);
    // Value Stack + Objection Removal + Risk Reversal
    expect(together('value-stack', 'objection-removal')).toBe(true);
    expect(together('value-stack', 'risk-reversal')).toBe(true);
    expect(together('objection-removal', 'risk-reversal')).toBe(true);
    // Objection Removal → Demonstration / Case Study
    expect(together('objection-removal', 'demonstration')).toBe(true);
    expect(together('objection-removal', 'case-study')).toBe(true);
  });

  test('a path exists through the graph: curiosity gap → process reveal → demonstration', () => {
    const path = bank.ontology.findPath({ type: 'creative_mechanism', id: 'curiosity-gap' }, { type: 'creative_mechanism', id: 'demonstration' }, { relationships: ['compatibleWith', 'oftenCombinedWith', 'supports'] });
    expect(path && path.length).toBeGreaterThan(0);
  });

  test('conflicts are contextual, never absolute: every avoidWith carries its reason', () => {
    const tensions = bank.ontology.relationships().filter((r) => r.source.type === 'creative_mechanism' && (r.relationship === 'notRecommendedWith' || r.relationship === 'conflictsWith'));
    expect(tensions.length).toBeGreaterThan(15);
    for (const t of tensions) {
      const hasReason = (t.conditions && t.conditions.length > 0) || !!t.rationale;
      expect(hasReason).toBe(true);
      if (t.relationship === 'notRecommendedWith') expect(t.conditions?.length).toBeGreaterThan(0);
    }
    expect(bank.related('curiosity-gap', ['notRecommendedWith'])).toEqual(expect.arrayContaining(['value-stack']));
  });

  test('mechanism → psychology edges use the Phase 10.2 principles that exist', () => {
    const uses = (id: string) => bank.ontology.from({ type: 'creative_mechanism', id }, ['uses']).map((e) => (e.target as { id: string }).id);
    expect(uses('choice-simplification')).toEqual(expect.arrayContaining(['choice-reduction', 'cognitive-load-reduction', 'convenience-preference', 'relief']));
    expect(uses('curiosity-gap')).toEqual(expect.arrayContaining(['curiosity', 'novelty']));
    expect(uses('volume-social-proof')).toContain('social-proof');
    expect(bank.query({ psychology: 'information-gap' }).map((m) => m.id)).toContain('curiosity-gap'); // planned concept still queryable
  });

  test('psychology references that are only planned are reported, not faked', () => {
    const coverage = bank.referenceCoverage();
    const psyCov = coverage['psychology'];
    expect(psyCov!.total).toBeGreaterThan(psyCov!.resolved);
    expect(psyCov!.resolved).toBeGreaterThan(0);
  });

  test('principles, structures and assets resolve into edges as soon as the ontology defines them', () => {
    const shared = createOntologyRegistry();
    const psy = createPsychologyBank({ ontology: shared });
    const withMech = createMechanismBank({ psychology: psy });
    const before = withMech.referenceCoverage();
    expect(before['marketing_principle']!.resolved).toBe(0);
    shared.register({
      id: 'make-decision-easier', slug: 'make-decision-easier', type: 'marketing_principle', name: 'Make Decision Easier', version: 1, status: 'active',
      definition: 'Reduce the effort required to choose between options.', semanticPurpose: 'A test principle.', scope: 'Test scope for the principle.',
      examples: ['An abstract description'], antiExamples: ['A finished creative'], compatibility: [], constraints: [],
      strategicPurpose: 'Reduce effort to choose', applicableObjectives: ['conversion'], compatibleAudienceConditions: [], incompatibleConditions: [],
    });
    const added = withMech.resolveReferenceEdges();
    expect(added).toBeGreaterThan(0);
    expect(withMech.referenceCoverage()['marketing_principle']!.resolved).toBeGreaterThan(0);
    expect(shared.from({ type: 'marketing_principle', id: 'make-decision-easier' }, ['expressedThrough']).map((e) => (e.target as { id: string }).id)).toContain('choice-simplification');
    expect(errors(withMech.validate())).toEqual([]);
    // Strict mode reports what is still unresolved.
    expect(errors(withMech.validate({ strict: true }))).toContain('UNRESOLVED_REFERENCE');
    expect(errors(bank.validate({ strict: true }))).toContain('UNRESOLVED_REFERENCE');
  });

  test('the same mechanism supports multiple structures and formats (no one-mechanism-one-structure)', () => {
    const m = mech('curiosity-gap');
    expect(m.storyStructureRefs!.length).toBeGreaterThanOrEqual(3);
    expect(m.formats!.length).toBeGreaterThanOrEqual(3);
    expect(m.hookPatternRefs!.length).toBeGreaterThanOrEqual(3);
    for (const e of CORE_MECHANISM_ENTRIES) {
      const x = e.mechanism;
      expect((x.storyStructureRefs ?? []).length + (x.visualStructureRefs ?? []).length + (x.copyStructureRefs ?? []).length + (x.hookPatternRefs ?? []).length).toBeGreaterThan(0);
    }
  });
});

describe('asset-aware selection (data only, no engine)', () => {
  test('a mechanism whose required assets are missing is infeasible and is never faked', () => {
    const none = bank.assetGaps('customer-testimonial', []);
    expect(none.feasible).toBe(false);
    expect(none.missingRequired).toEqual(expect.arrayContaining(['real-testimonial', 'customer-permission']));
    expect(bank.assetGaps('customer-testimonial', ['real-testimonial', 'customer-permission']).feasible).toBe(true);
    expect(bank.assetGaps('curiosity-gap', ['audience-insight']).missingPreferred).toEqual(['product-footage']);
  });

  test('a business with no customer evidence cannot be recommended proof-based mechanisms', () => {
    const available = ['audience-insight', 'offer-terms', 'pricing-data', 'product-footage', 'founder-story'];
    const { feasible, infeasible } = bank.partitionByAssets(available);
    const infeasibleIds = infeasible.map((i) => i.mechanism.id);
    expect(infeasibleIds).toEqual(expect.arrayContaining(['customer-testimonial', 'review-stack', 'volume-social-proof', 'case-study', 'certification', 'awards', 'countdown']));
    expect(feasible.map((m) => m.id)).toEqual(expect.arrayContaining(['curiosity-gap', 'story-from-failure', 'value-stack', 'demonstration']));
    expect(infeasible.find((i) => i.mechanism.id === 'countdown')?.missingRequired).toEqual(expect.arrayContaining(['genuine-deadline']));
    expect(feasible.length + infeasible.length).toBe(bank.list().length);
  });

  test('unlimited capacity means scarcity mechanisms are infeasible', () => {
    const available = ['offer-terms', 'pricing-data', 'audience-insight', 'cultural-reference'];
    const urgency = bank.partitionByAssets(available, bank.query({ category: 'urgency_scarcity' }));
    expect(urgency.feasible).toEqual([]);
  });
});

describe('queryability', () => {
  test('lookup by id, code, category, objective, situation, industry, product, psychology, evidence and risk', () => {
    expect(bank.get('value-stack')?.code).toBe('MEC-002');
    expect(bank.get('MEC-004')?.id).toBe('objection-removal');
    expect(bank.query({ category: 'urgency_scarcity' })).toHaveLength(17);
    expect(bank.query({ objective: 'trust' }).length).toBeGreaterThan(20);
    expect(bank.query({ audienceSituation: 'skeptical' }).map((m) => m.id)).toEqual(expect.arrayContaining(['demonstration', 'objection-removal']));
    expect(bank.query({ psychology: 'social-proof' }).map((m) => m.id)).toContain('review-stack');
    expect(bank.query({ marketingPrinciple: 'reduce-perceived-risk' }).map((m) => m.id)).toContain('risk-reversal');
    expect(bank.query({ riskLevel: 'high' }).map((m) => m.id)).toContain('celebrity-endorsement');
    expect(bank.query({ minConfidence: 'moderate_evidence' })).toEqual([]); // honest: nothing is evidenced yet
    expect(bank.query({ minConfidence: 'hypothesis' }).length).toBe(bank.list().length);
    expect(bank.query({ requiresAsset: 'genuine-deadline' }).length).toBeGreaterThan(8);
  });

  test('industry queries return industry-strong and agnostic mechanisms, never industry-exclusive ones', () => {
    const withAgnostic = bank.query({ industry: 'restaurant' });
    const strongOnly = bank.query({ industry: 'restaurant', includeAgnostic: false });
    expect(withAgnostic.length).toBeGreaterThan(strongOnly.length);
    expect(strongOnly.map((m) => m.id)).toContain('sensory-demonstration');
    // a mechanism strong in restaurants is still usable elsewhere: industries are "especially strong in", not a restriction
    expect(bank.query({ industry: 'saas' }).map((m) => m.id)).toContain('curiosity-gap');
    expect(bank.query({ industry: 'saas' }).map((m) => m.id)).toContain('demonstration');
  });

  test('compatibility and tension queries follow the graph in either direction', () => {
    expect(bank.query({ compatibleWith: 'process-reveal' }).map((m) => m.id)).toEqual(expect.arrayContaining(['curiosity-gap', 'demonstration']));
    expect(bank.query({ avoidWith: 'value-stack' }).map((m) => m.id)).toEqual(expect.arrayContaining(['curiosity-gap', 'one-thing-focus']));
  });

  test('the brief’s future query is answerable as data: restaurant + high intent + conversion, excluding weak fits', () => {
    const candidates = bank.query({ industry: 'restaurant', objective: 'conversion', excludeWeakFor: 'high-intent', format: 'reel' });
    expect(candidates.length).toBeGreaterThan(5);
    for (const m of candidates) {
      expect(m.applicableObjectives).toContain('conversion');
      expect(m.compatibility.some((c: any) => c.dimension === 'situation' && c.value === 'high-intent' && (c.fit === 'weak' || c.fit === 'avoid'))).toBe(false);
    }
    expect(candidates.map((m) => m.id)).not.toContain('curiosity-gap'); // rejected: weak for high-intent
  });

  test('the query layer only filters: there is no ranking, scoring or recommendation API', () => {
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(bank)).filter((n) => /recommend|rank|score|select|generate/i.test(n))).toEqual([]);
    const profile = bank.profile('demonstration');
    expect(JSON.stringify(profile)).not.toMatch(/"score"/);
    expect(profile).toHaveProperty('ethics');
    expect(profile).toHaveProperty('failureDocumentation');
  });
});

describe('gold-standard mechanisms', () => {
  test.each(GOLD)('%s passes the ten gold-standard questions', (id) => {
    const m = mech(id);
    const e = entry(id);
    // 1 clearly defined, 2 not psychology, 3 not a structure
    expect(m.definition.length).toBeGreaterThan(80);
    expect(errors(validateMechanism(m).issues)).toEqual([]);
    expect(codes(validateMechanism(m).issues)).not.toEqual(expect.arrayContaining(['PSYCHOLOGY_MASQUERADING', 'STRUCTURE_MASQUERADING']));
    // 4 reusable: more than one objective, not tied to one industry, abstract examples
    expect(m.applicableObjectives.length).toBeGreaterThanOrEqual(2);
    expect((m.industries ?? []).length).toBeLessThan(5);
    // 5 evidence is honest
    expect(m.confidence).toBe('hypothesis');
    expect(m.evidence ?? []).toEqual([]);
    expect(m.psychologicalBasis).toMatch(/\b(may|depends|possible)\b/i);
    // 6 limitations documented
    expect((m.weaknesses ?? []).length).toBeGreaterThanOrEqual(3);
    // 7 explicit ethical boundaries and anti-patterns
    expect(m.ethicalConstraints.length).toBeGreaterThanOrEqual(2);
    expect(e.links.filter((l) => l.relationship === 'constrainedBy').length).toBeGreaterThanOrEqual(2);
    // 8 composes with other mechanisms
    expect(e.links.filter((l) => ['compatibleWith', 'oftenCombinedWith', 'supports'].includes(l.relationship)).length).toBeGreaterThanOrEqual(3);
    // 9 can be rejected: has weak situations, tensions or required assets
    expect(m.compatibility.some((c: any) => c.fit === 'weak') || e.links.some((l) => l.relationship === 'notRecommendedWith')).toBe(true);
    expect((m.requiredAssets ?? []).length).toBeGreaterThan(0);
    // 10 learning can attach
    const learned = { ...m, outcomeLearnings: [{ outcome: 'neutral', context: 'a test context', summary: 'No clear difference was observed here.', effectOnConfidence: 'none' }] };
    expect(errors(validateMechanism(learned).issues)).toEqual([]);
  });

  test('Curiosity Gap: the specified strengths, conditions and boundaries are present', () => {
    const m = mech('curiosity-gap');
    expect(m.psychologyRefs).toEqual(expect.arrayContaining(['curiosity', 'information-gap', 'incompletion']));
    expect(m.audienceSituationRefs).toEqual(expect.arrayContaining(['unaware', 'problem-aware']));
    expect(m.compatibility.filter((c: any) => c.fit === 'weak').map((c: any) => c.value)).toEqual(expect.arrayContaining(['high-intent', 'time-pressed', 'overwhelmed']));
    expect(bank.related('curiosity-gap', ['compatibleWith'])).toEqual(expect.arrayContaining(['unexpected-truth', 'process-reveal', 'story-from-failure', 'progressive-reveal', 'demonstration']));
    expect(bank.related('curiosity-gap', ['notRecommendedWith'])).toEqual(expect.arrayContaining(['value-stack', 'concrete-specifics']));
    expect(m.ethicalConstraints.join(' ')).toMatch(/payoff must be delivered/);
    expect(m.ethicalConstraints.join(' ')).toMatch(/false secrets/);
  });

  test('Value Stack: clarifies components; does not claim the price will feel cheap or make refusal irresponsible', () => {
    const m = mech('value-stack');
    expect(m.definition).not.toMatch(/irresponsible|mathematically|always/i);
    expect(m.psychologicalBasis).not.toMatch(/always|will feel/i);
    expect(m.ethicalConstraints.join(' ')).toMatch(/realistic, defensible and transparent/);
    expect(m.ethicalConstraints.join(' ')).toMatch(/inflate/i);
    expect(m.truthfulPreconditions.join(' ')).toMatch(/real price/);
    expect(bank.ontology.from({ type: 'creative_mechanism', id: 'value-stack' }, ['constrainedBy']).map((e) => (e.target as { id: string }).id)).toContain('inflated-value-claim');
  });

  test('Story From Failure: relatability is conditional, never a guaranteed pratfall effect', () => {
    const m = mech('story-from-failure');
    expect(m.psychologicalBasis).toMatch(/may increase relatability when/i);
    expect(m.psychologicalBasis).not.toMatch(/pratfall|guarantee/i);
    expect(m.ethicalConstraints.join(' ')).toMatch(/fabricate rock bottom/);
    expect(m.requiredAssets).toContain('founder-story');
  });

  test('Objection Removal: no loss-aversion multiplier, and guarantees must be real and honoured', () => {
    const m = mech('objection-removal');
    expect(JSON.stringify(m)).not.toMatch(/exactly twice|2x|two times/i);
    expect(m.ethicalConstraints.join(' ')).toMatch(/real, financially viable, clearly explained and honoured/);
    expect(m.ethicalConstraints.join(' ')).toMatch(/hidden conditions/);
    expect(m.psychologyRefs).toEqual(expect.arrayContaining(['risk-reduction', 'loss-aversion', 'transparency']));
  });

  test('Insider Knowledge: true, relevant, defensible — not secrets the industry hides', () => {
    const m = mech('insider-knowledge');
    expect(m.definition).not.toMatch(/secret|doesn.t want you/i);
    expect(m.ethicalConstraints.join(' ')).toMatch(/true, relevant and defensible/);
    expect(m.ethicalConstraints.join(' ')).toMatch(/manufactured secret/);
    expect(m.requiredAssets).toContain('expert-participation');
  });
});

describe('taxonomy sanity', () => {
  test('every category has its purpose and the brief’s named mechanisms (or a recorded ruling)', () => {
    const ids = new Set(CORE_MECHANISM_ENTRIES.map((e) => e.mechanism.id));
    const ruled = new Set(OVERLAP_REVIEW.map((d) => d.concept));
    const named = ['story-from-failure', 'origin-story', 'customer-journey', 'david-vs-goliath', 'heros-journey', 'micro-story', 'future-pace', 'process-reveal', 'behind-the-scenes', 'teardown-audit', 'day-in-the-life', 'post-mortem', 'recipe-blueprint', 'paradox', 'transformation', 'unexpected-truth',
      'volume-social-proof', 'review-stack', 'ugc', 'case-study', 'micro-influencer', 'celebrity-endorsement', 'expert-endorsement', 'expert-interview', 'institutional-backing', 'certification', 'awards', 'third-party-validation', 'data-proof', 'comparative-proof', 'demonstration', 'live-product-demo', 'stress-test', 'unboxing', 'extreme-use-case', 'proof-of-concept', 'process-proof', 'transparent-evidence', 'results-breakdown',
      'curiosity-gap', 'pattern-interrupt', 'myth-busting', 'contrarian-take', 'taboo-topic', 'insider-knowledge', 'local-identity', 'customer-pov', 'co-creation',
      'price-anchor', 'value-stack', 'daily-cost-breakdown', 'tiered-pricing', 'decoy-pricing', 'freemium', 'pay-what-you-want', 'self-liquidating-offer', 'objection-removal', 'risk-reversal', 'free-trial', 'performance-based-billing', 'keep-it-guarantee', 'done-with-you-transition', 'feature-bundling', 'cost-of-inaction', 'total-cost-of-ownership', 'payment-framing',
      'countdown', 'flash-sale', 'launch-window', 'expiring-bonus', 'price-increase-notice', 'limited-edition', 'capacity-limits', 'waitlist', 'fast-action-bonus', 'seasonal-window', 'event-deadline', 'booking-deadline', 'availability-window', 'early-access'];
    for (const id of named) expect(ids.has(id) || ruled.has(id)).toBe(true);
    const local = ['local-identity', 'neighborhood-proof', 'customer-pov', 'community-story', 'festival-relevance', 'cultural-familiarity', 'behind-the-scenes', 'sensory-demonstration', 'customer-journey', 'availability-window'];
    for (const id of local) expect(ids.has(id)).toBe(true);
  });
});

/** Rebuild a MechanismSpec from an authored entry (inverse of defineMechanism, for negative-test construction). */
function specFrom(id: string): Partial<MechanismSpec> {
  const m = mech(id);
  return {
    c: m.code!, id: m.id, n: m.name, cat: m.mechanismCategory!, kind: m.kind, d: m.definition, p: m.purpose!, bf: [...(m.bestFor ?? [])], st: [...(m.strengths ?? [])], wk: [...(m.weaknesses ?? [])],
    psy: [...(m.psychologyRefs ?? [])], mp: [...(m.marketingPrincipleRefs ?? [])], ob: [...m.applicableObjectives], req: [...(m.requiredAssets ?? [])],
    anti: entry(id).links.filter((l) => l.relationship === 'constrainedBy').map((l) => l.target.id), eth: [...m.ethicalConstraints], pre: [...m.truthfulPreconditions],
  };
}

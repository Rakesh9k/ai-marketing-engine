import {
  createOntologyRegistry,
  type EvidenceReference,
  type OntologyRegistry,
} from '../ontology';
import {
  CORE_PSYCHOLOGY_ENTRIES,
  DARK_PATTERN_ANTI_PATTERNS,
  ETHICAL_APPLICATIONS,
  ETHICALLY_SENSITIVE_IDS,
  FUTURE_PSYCHOLOGY_CATEGORIES,
  PSYCHOLOGY_CATEGORIES,
  PSYCHOLOGY_TAXONOMY,
  PsychologyValidationError,
  compatibleMechanisms,
  confidenceCeiling,
  constrainingAntiPatterns,
  createPsychologyBank,
  definePrinciple,
  evaluatePsychologyStack,
  matchContext,
  validatePrinciple,
  type PsychologyBankEntry,
  type PsychologyPrinciple,
} from './index';

const codes = (issues: readonly { code: string }[]) => issues.map((i) => i.code);
const errors = (issues: readonly { severity: string; code: string }[]) => issues.filter((i) => i.severity === 'error').map((i) => i.code);
const entry = (id: string): PsychologyBankEntry => {
  const e = CORE_PSYCHOLOGY_ENTRIES.find((x) => x.principle.id === id);
  if (!e) throw new Error(`no core entry ${id}`);
  return e;
};
const principle = (id: string): PsychologyPrinciple => entry(id).principle;
const variant = (id: string, patch: Record<string, unknown>) => ({ ...principle(id), ...patch });

// Minimal ontology objects (test-only) standing in for the later phases that will author them.
const b = (type: string, id: string, name: string) => ({
  id, slug: id, type, name, version: 1, status: 'active',
  definition: `${name} is a synthetic ontology object used only in Psychology Bank tests.`,
  semanticPurpose: `Stands in for ${name} in tests.`, scope: `Test stand-in for ${name}.`,
  examples: [`An abstract description of ${name}`], antiExamples: [`A finished creative using ${name}`], compatibility: [], constraints: [],
});
const mechanism = (id: string) => ({ ...b('creative_mechanism', id, id.replace(/-/g, ' ')), psychologicalBasis: 'A synthetic basis that may explain the mechanism', audienceConditions: [], awarenessConditions: [], applicableObjectives: ['conversion'], risks: [], ethicalConstraints: [], truthfulPreconditions: [] });
const evidence = (over: Partial<EvidenceReference> & Pick<EvidenceReference, 'id' | 'type'>): EvidenceReference => ({
  summary: 'Synthetic test evidence, not a real study.', direction: 'supports', ...over,
});

describe('taxonomy', () => {
  test('five categories exist, each with purpose and planned concepts', () => {
    expect([...PSYCHOLOGY_CATEGORIES]).toEqual(['attention', 'desire', 'trust', 'decision', 'emotion']);
    for (const c of PSYCHOLOGY_CATEGORIES) {
      expect(PSYCHOLOGY_TAXONOMY[c].plannedConcepts.length).toBeGreaterThan(5);
      expect(PSYCHOLOGY_TAXONOMY[c].purpose.length).toBeGreaterThan(20);
    }
  });

  test('every authored principle belongs to a valid category and is a planned concept', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      expect(PSYCHOLOGY_CATEGORIES).toContain(p.category);
      expect((PSYCHOLOGY_TAXONOMY as Record<string, any>)[p.category!].plannedConcepts).toContain(p.id);
    }
  });

  test('unknown categories are rejected; planned future categories are not enabled yet', () => {
    expect(codes(validatePrinciple(variant('scarcity', { category: 'vibes' })).issues)).toEqual(['UNSUPPORTED_CATEGORY']);
    const future = validatePrinciple(variant('scarcity', { category: FUTURE_PSYCHOLOGY_CATEGORIES[0] }));
    expect(future.ok).toBe(false);
    expect(future.issues[0]?.message).toMatch(/planned but not enabled/);
    expect(codes(validatePrinciple(variant('scarcity', { additionalCategories: ['memory'] })).issues)).toEqual(['UNSUPPORTED_CATEGORY']);
  });

  test('only ontology psychology entities are accepted (no second identity system)', () => {
    expect(codes(validatePrinciple({ ...principle('scarcity'), type: 'creative_mechanism' }).issues)).toEqual(['NOT_PSYCHOLOGY']);
  });

  test('the bank stays small: reference principles only, with the rest listed as unauthored', () => {
    const bank = createPsychologyBank();
    expect(CORE_PSYCHOLOGY_ENTRIES.length).toBeLessThanOrEqual(15);
    const gaps = bank.unauthoredConcepts();
    expect(gaps.attention).toEqual(expect.arrayContaining(['surprise', 'contrast', 'salience']));
    expect(gaps.attention).not.toContain('curiosity');
    expect(gaps.emotion).toEqual(expect.arrayContaining(['joy', 'nostalgia']));
  });
});

describe('shipped principles are valid, honest and governed', () => {
  const bank = createPsychologyBank();

  test('every shipped principle validates with no errors', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) expect(errors(validatePrinciple(p).issues)).toEqual([]);
  });

  test('required fields are present on every shipped principle', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      for (const f of ['definition', 'whatItDoes', 'whyItMayWork', 'whenToUse', 'whenNotToUse', 'appropriateIntensity', 'ethicalBoundary', 'riskLevel', 'technicalDefinition', 'creativeInterpretation', 'strategicImplication', 'doesNotExplain', 'alternativeExplanations'] as const) {
        const v = p[f];
        expect(v && (Array.isArray(v) ? v.length : true)).toBeTruthy();
      }
      expect(p.risks.length).toBeGreaterThan(0);
    }
  });

  test('no principle claims certainty: no evidence is asserted, so confidence stays at hypothesis', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      expect(p.confidence).toBe('hypothesis');
      expect(p.evidence ?? []).toEqual([]);
      expect(['plausible_mechanism', 'hypothesis', 'heuristic']).toContain(p.explanationBasis);
    }
  });

  test('negative knowledge is first-class: every principle says when not to use it', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      expect(p.whenNotToUse!.length).toBeGreaterThanOrEqual(2);
      expect(p.constraints.filter((c: any) => c.kind === 'avoid_when').length).toBe(p.whenNotToUse!.length);
    }
  });

  test('semantic review passes: shipped text has no unqualified claims or behavioral myths', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      const flagged = validatePrinciple(p).issues.filter((i) => ['UNQUALIFIED_CLAIM', 'BEHAVIORAL_MYTH', 'ABSOLUTE_LANGUAGE', 'EXPLANATION_NOT_QUALIFIED'].includes(i.code));
      expect(flagged).toEqual([]);
    }
  });

  test('reusability: no finished caption, reel, design or campaign output', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      expect(codes(validatePrinciple(p).issues).filter((c) => c.startsWith('FINISHED_'))).toEqual([]);
    }
  });

  test('the bank installs into the shared ontology registry and the graph is sound', () => {
    expect(bank.ontology.list('psychology')).toHaveLength(CORE_PSYCHOLOGY_ENTRIES.length);
    expect(bank.validate().filter((i) => i.severity === 'error')).toEqual([]);
    expect(Object.values(bank.counts()).every((n) => n >= 1)).toBe(true);
  });
});

describe('ethics', () => {
  const sensitive = ['scarcity', 'social-proof', 'urgency', 'authority', 'loss-aversion', 'specificity'];

  test('sensitive principles are marked elevated and the ethical table points at real anti-patterns', () => {
    for (const id of sensitive) {
      expect(ETHICALLY_SENSITIVE_IDS.has(id)).toBe(true);
      expect(principle(id).ethicalSensitivity).toBe('elevated');
    }
    const ids = new Set(DARK_PATTERN_ANTI_PATTERNS.map((a) => a.id));
    for (const row of ETHICAL_APPLICATIONS) for (const ap of row.antiPatternIds) expect(ids.has(ap)).toBe(true);
  });

  test.each(sensitive)('%s cannot be activated without an ethical boundary', (id) => {
    const result = validatePrinciple(variant(id, { status: 'active', ethicalBoundary: undefined }));
    expect(result.ok).toBe(false);
    expect(errors(result.issues)).toEqual(expect.arrayContaining(['MISSING_REQUIRED_FIELD', 'ELEVATED_NEEDS_BOUNDARY']));
  });

  test.each(sensitive)('%s needs safe and prohibited applications and cannot be rated low risk', (id) => {
    expect(errors(validatePrinciple(variant(id, { safeApplications: [] })).issues)).toContain('ELEVATED_NEEDS_SAFE_APPLICATIONS');
    expect(errors(validatePrinciple(variant(id, { prohibitedApplications: [] })).issues)).toContain('ELEVATED_NEEDS_PROHIBITED_APPLICATIONS');
    expect(errors(validatePrinciple(variant(id, { riskLevel: 'low' })).issues)).toContain('ELEVATED_RISK_TOO_LOW');
  });

  test('a sensitive principle cannot be downgraded to standard to dodge governance', () => {
    expect(errors(validatePrinciple(variant('scarcity', { ethicalSensitivity: 'standard' })).issues)).toContain('SENSITIVE_PRINCIPLE_NOT_ELEVATED');
  });

  test('each sensitive principle is constrained by at least one anti-pattern in the graph', () => {
    const bank = createPsychologyBank();
    for (const id of sensitive) expect(constrainingAntiPatterns(bank.ontology, id).length).toBeGreaterThan(0);
    expect(constrainingAntiPatterns(bank.ontology, 'scarcity')).toEqual(expect.arrayContaining(['fake-scarcity', 'false-countdown']));
  });

  test('an elevated principle without an anti-pattern link is rejected at install', () => {
    const bare: PsychologyBankEntry = { ...entry('scarcity'), links: [] };
    expect(() => createPsychologyBank({ includeCore: false, entries: [bare] })).toThrow(/MISSING_ANTI_PATTERN_LINK/);
  });

  test('every named dark pattern is an ethical-prohibition anti-pattern, never a technique', () => {
    expect(DARK_PATTERN_ANTI_PATTERNS.length).toBeGreaterThanOrEqual(14);
    for (const name of ['fake-scarcity', 'fake-urgency', 'fake-social-proof', 'hidden-costs', 'forced-continuity', 'obstruction', 'confirmshaming', 'disguised-advertising', 'false-authority', 'false-guarantee', 'manipulative-defaults', 'intentional-confusion', 'false-countdown', 'fabricated-testimonial']) {
      expect(DARK_PATTERN_ANTI_PATTERNS.find((a) => a.id === name)?.kind).toBe('ethical_prohibition');
    }
    const registry = createPsychologyBank().ontology;
    expect(registry.list('anti_pattern').length).toBe(DARK_PATTERN_ANTI_PATTERNS.length);
  });

  test('excessive intensity can never be recommended', () => {
    const ladder = [{ level: 'excessive' as const, description: 'Pressure language implying regret for waiting.', recommended: true }];
    expect(errors(validatePrinciple(variant('scarcity', { intensityLadder: ladder })).issues)).toContain('EXCESSIVE_INTENSITY_RECOMMENDED');
  });

  test('intensity values are a closed set', () => {
    expect(validatePrinciple(variant('scarcity', { appropriateIntensity: 'extreme' })).ok).toBe(false);
  });
});

describe('evidence and confidence', () => {
  test('without evidence, or with only an AI hypothesis, the ceiling is hypothesis', () => {
    expect(confidenceCeiling([])).toBe('hypothesis');
    expect(confidenceCeiling([evidence({ id: 'e1', type: 'ai_generated_hypothesis', quality: 'high' })])).toBe('hypothesis');
    expect(confidenceCeiling([evidence({ id: 'e1', type: 'academic_research', quality: 'high', direction: 'contradicts' })])).toBe('hypothesis');
  });

  test('ceilings rise with the kind and quality of evidence, never with popularity', () => {
    expect(confidenceCeiling([evidence({ id: 'a', type: 'expert_framework' })])).toBe('weak_evidence');
    expect(confidenceCeiling([evidence({ id: 'a', type: 'academic_research', quality: 'medium' })])).toBe('moderate_evidence');
    expect(confidenceCeiling([evidence({ id: 'a', type: 'systematic_review', quality: 'high' })])).toBe('strong_evidence');
    expect(confidenceCeiling([evidence({ id: 'a', type: 'systematic_review', quality: 'high' }), evidence({ id: 'b', type: 'ab_test', quality: 'high' })])).toBe('validated');
    expect(
      confidenceCeiling([evidence({ id: 'a', type: 'systematic_review', quality: 'high' }), evidence({ id: 'b', type: 'ab_test', quality: 'high' }), evidence({ id: 'c', type: 'academic_research', direction: 'contradicts' })])
    ).toBe('moderate_evidence');
  });

  test('unsupported certainty is rejected', () => {
    expect(errors(validatePrinciple(variant('scarcity', { confidence: 'strong_evidence' })).issues)).toEqual(expect.arrayContaining(['CONFIDENCE_EXCEEDS_EVIDENCE']));
    expect(errors(validatePrinciple(variant('scarcity', { confidence: 'validated', evidence: [evidence({ id: 'ai', type: 'ai_generated_hypothesis' })], evidenceRefs: ['ai'] })).issues)).toContain('CONFIDENCE_EXCEEDS_EVIDENCE');
    expect(errors(validatePrinciple(variant('scarcity', { explanationBasis: 'established_finding' })).issues)).toContain('FINDING_WITHOUT_EVIDENCE');
  });

  test('supported confidence is accepted, and evidence ids must be listed in evidenceRefs', () => {
    const ev = [evidence({ id: 'ev1', type: 'academic_research', quality: 'medium' })];
    expect(errors(validatePrinciple(variant('scarcity', { confidence: 'moderate_evidence', evidence: ev, evidenceRefs: ['ev1'], explanationBasis: 'supported_explanation' })).issues)).toEqual([]);
    expect(errors(validatePrinciple(variant('scarcity', { confidence: 'moderate_evidence', evidence: ev, evidenceRefs: ['other'] })).issues)).toContain('EVIDENCE_REFS_MISMATCH');
  });

  test('Q2/Q3: general and contextual confidence differ (strong in general, low in this context)', () => {
    const ev = [evidence({ id: 's', type: 'systematic_review', quality: 'high' })];
    const ok = validatePrinciple(
      variant('social-proof', {
        confidence: 'strong_evidence', evidence: ev, evidenceRefs: ['s'], explanationBasis: 'supported_explanation',
        contextualConfidence: [{ context: 'new restaurant with few customers', confidence: 'unknown', rationale: 'Too little genuine volume to present as proof.' }],
      })
    );
    expect(errors(ok.issues)).toEqual([]);
    const bad = validatePrinciple(variant('social-proof', { contextualConfidence: [{ context: 'new salon', confidence: 'strong_evidence', rationale: 'Asserted without a test.' }] }));
    expect(errors(bad.issues)).toContain('CONTEXTUAL_CONFIDENCE_EXCEEDS_GENERAL');
  });

  test('Q4: worked-before-but-failed-here is representable, and a failure cannot raise confidence', () => {
    const learnings = [
      { outcome: 'worked' as const, context: 'high-intent event with genuinely limited seats', summary: 'Audience responded to a real capacity limit.', effectOnConfidence: 'raised' as const },
      { outcome: 'failed' as const, context: 'everyday offer with unlimited availability', summary: 'The audience read the message as artificial.', effectOnConfidence: 'lowered' as const },
    ];
    expect(errors(validatePrinciple(variant('scarcity', { outcomeLearnings: learnings })).issues)).toEqual([]);
    expect(errors(validatePrinciple(variant('scarcity', { outcomeLearnings: [{ ...learnings[1], effectOnConfidence: 'raised' }] })).issues)).toContain('LEARNING_CONTRADICTION');
  });
});

describe('semantic quality', () => {
  test.each([
    ['whatItDoes', 'Scarcity will make people buy immediately.'],
    ['whatItDoes', 'This forces customers to act and is proven to convert.'],
    ['whyItMayWork', 'Humans are wired to fear missing out, so it works every time.'],
    ['definition', 'Social proof is guaranteed to build trust for every business.'],
    ['whyItMayWork', 'The brain likes limited things, and this causes conversion.'],
  ])('%s: "%s" is flagged', (field, text) => {
    expect(errors(validatePrinciple(variant('scarcity', { [field]: text })).issues).some((c) => ['UNQUALIFIED_CLAIM', 'UNIVERSAL_EFFECTIVENESS_CLAIM'].includes(c))).toBe(true);
  });

  test.each([
    'The average attention span of 8 seconds means people skim.',
    'Loss aversion makes losses exactly twice as powerful as gains.',
    'Red makes people buy faster.',
    'People hate too many choices.',
  ])('behavioral myth is rejected: %s', (text) => {
    expect(errors(validatePrinciple(variant('loss-aversion', { whyItMayWork: text })).issues)).toContain('BEHAVIORAL_MYTH');
  });

  test('absolute language and unhedged explanations are flagged for review, not silently accepted', () => {
    expect(codes(validatePrinciple(variant('scarcity', { whatItDoes: 'Everyone responds to limited availability in this way.' })).issues)).toContain('ABSOLUTE_LANGUAGE');
    expect(codes(validatePrinciple(variant('scarcity', { whyItMayWork: 'Limited availability raises the price of delay.' })).issues)).toContain('EXPLANATION_NOT_QUALIFIED');
  });

  test('"never" is allowed in boundaries and prohibitions, where it belongs', () => {
    expect(codes(validatePrinciple(principle('scarcity')).issues)).not.toContain('ABSOLUTE_LANGUAGE');
  });
});

describe('required fields (non-draft) and drafts', () => {
  test.each(['whatItDoes', 'whyItMayWork', 'whenToUse', 'whenNotToUse', 'appropriateIntensity', 'ethicalBoundary', 'explanationBasis', 'confidence'])('missing %s is rejected for an active principle', (field) => {
    const v = validatePrinciple(variant('relief', { status: 'active', [field]: Array.isArray(principle('relief')[field as keyof PsychologyPrinciple]) ? [] : undefined }));
    expect(errors(v.issues)).toContain('MISSING_REQUIRED_FIELD');
  });

  test('missing definition is rejected by the ontology', () => {
    expect(validatePrinciple(variant('relief', { definition: undefined })).ok).toBe(false);
  });

  test('a draft may be incomplete, but is never allowed to hide an unsupported category', () => {
    const draft = validatePrinciple({ ...variant('relief', { status: 'draft', whatItDoes: undefined, whenNotToUse: [], ethicalBoundary: undefined }) });
    expect(errors(draft.issues)).toEqual([]);
    expect(codes(validatePrinciple(variant('relief', { status: 'draft', category: 'nope' })).issues)).toContain('UNSUPPORTED_CATEGORY');
  });

  test('reusability: finished creative inside any illustrative field is rejected', () => {
    for (const patch of [
      { examples: ['Post this with #hyderabadfoodie tonight'] },
      { antiExamples: ['The line "Only five seats left tonight" as a caption'] },
      { safeApplications: ['Run a reel at 1080x1920 priced at ₹799'] },
    ]) {
      expect(errors(validatePrinciple(variant('scarcity', patch)).issues).some((c) => c.startsWith('FINISHED_CREATIVE_'))).toBe(true);
    }
  });
});

describe('relationships and ontology integration', () => {
  test('principle links use the existing vocabulary and the matrix accepts them', () => {
    for (const e of CORE_PSYCHOLOGY_ENTRIES) {
      expect(errors(validatePrinciple(e.principle).issues)).toEqual([]);
    }
    expect(() => createPsychologyBank()).not.toThrow();
  });

  test('invalid psychology relationships are rejected (psychology cannot work with a hook)', () => {
    const bad: PsychologyBankEntry = { ...entry('relief'), links: [{ relationship: 'worksWith', target: { type: 'hook_pattern', id: 'x' } }] };
    expect(() => createPsychologyBank({ includeCore: false, entries: [bad] })).toThrow(PsychologyValidationError);
    const bad2: PsychologyBankEntry = { ...entry('relief'), links: [{ relationship: 'influences', target: { type: 'creative_recipe', id: 'x' } }] };
    expect(() => createPsychologyBank({ includeCore: false, entries: [bad2] })).toThrow(/INVALID_SOURCE_TARGET/);
  });

  test('contradictory mechanism links are rejected unless expressed as a condition', () => {
    const bad: PsychologyBankEntry = { ...entry('relief'), links: [
      { relationship: 'compatibleWith', target: { type: 'creative_mechanism', id: 'm1' } },
      { relationship: 'conflictsWith', target: { type: 'creative_mechanism', id: 'm1' } },
    ] };
    expect(() => createPsychologyBank({ includeCore: false, entries: [bad] })).toThrow(/CONTRADICTORY_LINKS/);
  });

  test('links to mechanisms not authored yet are deferred, listed, and an error in strict mode', () => {
    const bank = createPsychologyBank();
    expect(bank.deferredLinks().some((d) => d.sourceId === 'choice-reduction' && d.target.id === 'choice-simplification')).toBe(true);
    expect(bank.validate().filter((i) => i.code === 'DEFERRED_LINK').length).toBeGreaterThan(0);
    expect(errors(bank.validate()).includes('UNRESOLVED_REFERENCE')).toBe(false);
    expect(errors(bank.validate({ strict: true }))).toContain('UNRESOLVED_REFERENCE');
  });

  describe('once the later ontology layers exist', () => {
    let ontology: OntologyRegistry;
    let bank: ReturnType<typeof createPsychologyBank>;

    beforeEach(() => {
      ontology = createOntologyRegistry();
      bank = createPsychologyBank({ ontology });
      const have = new Set(bank.deferredLinks().map((d) => `${d.target.type}:${d.target.id}`));
      for (const key of have) {
        const [type, id] = key.split(':') as [string, string];
        if (type === 'creative_mechanism') ontology.register(mechanism(id));
        if (type === 'marketing_principle') ontology.register({ ...b('marketing_principle', id, id.replace(/-/g, ' ')), strategicPurpose: 'A synthetic strategic purpose', applicableObjectives: ['conversion'], compatibleAudienceConditions: [], incompatibleConditions: [] });
        if (type === 'human_motivation') ontology.register({ ...b('human_motivation', id, id), underlyingNeed: 'A synthetic underlying need', typicalTriggers: [], ethicalConsiderations: [] });
      }
    });

    test('deferred links resolve into ontology edges; strict validation then passes', () => {
      const before = bank.deferredLinks().length;
      expect(before).toBeGreaterThan(0);
      expect(bank.resolveDeferredLinks()).toBe(before);
      expect(bank.deferredLinks()).toEqual([]);
      expect(errors(bank.validate({ strict: true }))).toEqual([]);
      expect(compatibleMechanisms(ontology, 'choice-reduction')).toContain('choice-simplification');
      expect(ontology.from({ type: 'psychology', id: 'choice-reduction' }, ['conflictsWith']).map((e) => e.target.id)).toContain('open-exploration');
    });

    test('psychology → principle → mechanism → structure → format is traversable without storing a creative', () => {
      bank.resolveDeferredLinks();
      ontology.register({ ...b('story_structure', 'three-choices-then-recommendation', 'Three choices then recommendation'), category: 'ProblemSolution', beats: [{ id: 'b1', label: 'b1', description: 'desc of beat 1 10 chars', order: 1 }, { id: 'b2', label: 'b2', description: 'desc of beat 2 10 chars', order: 2 }] });
      ontology.register({ ...b('format', 'short-form-reel', 'Short form reel'), communicationContainer: 'A short vertical video in a feed', interactionModel: 'passive viewing' });
      ontology.addRelationship({ source: { type: 'marketing_principle', id: 'make-decision-easier' }, relationship: 'expressedThrough', target: { type: 'creative_mechanism', id: 'choice-simplification' } });
      ontology.addRelationship({ source: { type: 'creative_mechanism', id: 'choice-simplification' }, relationship: 'worksWith', target: { type: 'story_structure', id: 'three-choices-then-recommendation' } });
      ontology.addRelationship({ source: { type: 'story_structure', id: 'three-choices-then-recommendation' }, relationship: 'appropriateFor', target: { type: 'format', id: 'short-form-reel' } });
      const path = ontology.findPath({ type: 'psychology', id: 'cognitive-load-reduction' }, { type: 'format', id: 'short-form-reel' }, { relationships: ['supports', 'expressedThrough', 'worksWith', 'appropriateFor'] });
      expect(path?.map((e) => `${e.source.id}>${e.target.type === 'external' ? '' : e.target.id}`)).toEqual([
        'cognitive-load-reduction>make-decision-easier',
        'make-decision-easier>choice-simplification',
        'choice-simplification>three-choices-then-recommendation',
        'three-choices-then-recommendation>short-form-reel',
      ]);
    });

    test('psychology can attach to an audience situation as applicable or not recommended (Q5/Q6)', () => {
      ontology.register({ ...b('audience_situation', 'friday-dinner-decision', 'Friday dinner decision'), category: 'TIME_PRESSURE', when: 'Friday evening', who: 'busy families', where: 'home kitchen', whatIsHappening: 'deciding dinner at the end of the week', whatTheyFeel: 'tired and hungry', whatTheyWant: 'a dinner everyone accepts', decisionWindow: 'immediate', audience: 'young families', situation: 'deciding dinner', trigger: 'end of week', context: 'at home', emotionalState: 'tired', practicalNeed: 'a dinner everyone accepts', barriers: [], alternatives: [], decisionStage: 'solution_aware' });
      ontology.addRelationship({ source: { type: 'psychology', id: 'cognitive-load-reduction' }, relationship: 'appropriateFor', target: { type: 'audience_situation', id: 'friday-dinner-decision' }, rationale: 'Multi-option decision under time pressure.' });
      ontology.addRelationship({ source: { type: 'psychology', id: 'scarcity' }, relationship: 'notRecommendedFor', target: { type: 'audience_situation', id: 'friday-dinner-decision' }, rationale: 'Everyday offer with no real constraint.' });
      expect(ontology.to({ type: 'audience_situation', id: 'friday-dinner-decision' }).map((e) => `${e.source.id}:${e.relationship}`).sort()).toEqual(['cognitive-load-reduction:appropriateFor', 'scarcity:notRecommendedFor']);
    });

    test('the same principle can reach several mechanisms, structures and formats', () => {
      bank.resolveDeferredLinks();
      const mechanisms = compatibleMechanisms(ontology, 'cognitive-load-reduction');
      expect(mechanisms.length).toBeGreaterThanOrEqual(1);
      ontology.register({ ...mechanism('second-mechanism') });
      ontology.addRelationship({ source: { type: 'psychology', id: 'cognitive-load-reduction' }, relationship: 'compatibleWith', target: { type: 'creative_mechanism', id: 'second-mechanism' } });
      expect(compatibleMechanisms(ontology, 'cognitive-load-reduction').length).toBe(mechanisms.length + 1);
    });
  });
});

describe('composition: stacks, conflicts, context', () => {
  const bank = createPsychologyBank();

  test('the two-appeal guideline is a heuristic with an explicit override', () => {
    const dense = [{ id: 'convenience-preference', role: 'primary' as const }, { id: 'social-proof', role: 'secondary' as const }, { id: 'curiosity', role: 'secondary' as const }];
    expect(codes(evaluatePsychologyStack(bank.ontology, dense))).toContain('STACK_TOO_DENSE');
    expect(codes(evaluatePsychologyStack(bank.ontology, dense, { justification: 'Launch campaign with three distinct audiences' }))).not.toContain('STACK_TOO_DENSE');
    const lean = [{ id: 'convenience-preference', role: 'primary' as const }, { id: 'social-proof', role: 'secondary' as const }, { id: 'cognitive-load-reduction', role: 'supporting' as const }];
    expect(codes(evaluatePsychologyStack(bank.ontology, lean))).toEqual([]);
  });

  test('conflicts are potential, conditional and never fatal', () => {
    const issues = evaluatePsychologyStack(bank.ontology, [{ id: 'scarcity', role: 'primary' }, { id: 'convenience-preference', role: 'secondary' }]);
    const conflict = issues.find((i) => i.code === 'POTENTIAL_CONFLICT');
    expect(conflict?.severity).toBe('warning');
    expect(conflict?.message).toMatch(/calm, reassurance-led positioning/);
    expect(issues.some((i) => i.severity === 'error')).toBe(false);
  });

  test('unknown, duplicate and mis-roled stack members are errors', () => {
    expect(errors(evaluatePsychologyStack(bank.ontology, [{ id: 'nope', role: 'primary' }]))).toContain('UNKNOWN_PRINCIPLE');
    expect(errors(evaluatePsychologyStack(bank.ontology, [{ id: 'relief', role: 'primary' }, { id: 'relief', role: 'supporting' }]))).toContain('DUPLICATE_STACK_MEMBER');
    expect(errors(evaluatePsychologyStack(bank.ontology, [{ id: 'relief', role: 'lead' as never }]))).toContain('INVALID_ROLE');
  });

  test('Q5/Q6: a principle can explain why it fits and why it must not be used', () => {
    const scarcity = principle('scarcity');
    const everyday = matchContext(scarcity, [{ dimension: 'offer', value: 'unlimited_supply' }, { dimension: 'customer_intent', value: 'low_intent' }]);
    expect(everyday.supports).toEqual([]);
    expect(everyday.blockers.map((b) => b.description)).toEqual(expect.arrayContaining(['unlimited supply', 'low-intent context']));
    const event = matchContext(scarcity, [{ dimension: 'offer', value: 'genuinely_limited_capacity' }, { dimension: 'customer_intent', value: 'high_intent' }]);
    expect(event.blockers).toEqual([]);
    expect(event.supports.length).toBe(2);
  });

  test('conditions are also exposed as ontology compatibility claims (strong fit is never asserted)', () => {
    const claims = principle('scarcity').compatibility;
    expect(claims.some((c: any) => c.fit === 'avoid' && c.value === 'unlimited_supply')).toBe(true);
    expect(claims.every((c: any) => c.fit !== 'strong')).toBe(true);
  });

  test('alternative explanations and self-critique are present, so one principle is not assumed to explain everything', () => {
    for (const { principle: p } of CORE_PSYCHOLOGY_ENTRIES) {
      expect(p.alternativeExplanations!.length).toBeGreaterThan(0);
      expect(p.doesNotExplain!.length).toBeGreaterThan(0);
    }
  });
});

describe('growth and versioning', () => {
  test('a new principle is added by authoring one entry, not by editing the bank', () => {
    const bank = createPsychologyBank();
    const before = bank.list('emotion').length;
    bank.install(
      definePrinciple({
        id: 'nostalgia', name: 'Nostalgia', category: 'emotion', domain: 'emotion',
        definition: 'An emotional response to meaningful memories of the past, which can colour how something feels today.',
        technicalDefinition: 'A sentimental affective state associated with autobiographical memory.',
        creativeInterpretation: 'Connect to a memory the audience actually shares, never one invented for them.',
        strategicImplication: 'Consider when the business has a genuine heritage that the audience recognises.',
        whatItDoes: 'Can create warmth and familiarity when the audience shares the referenced memory.',
        whyItMayWork: 'A possible explanation is that shared memories signal belonging and familiarity, depending on whether the memory is genuinely shared.',
        explanationBasis: 'hypothesis', scope: 'Covers genuine shared memory. Excludes invented cultural or personal memories.',
        whenToUse: ['the heritage is genuine and recognised'], whenNotToUse: ['the memory would be fabricated', 'the audience does not share the reference'],
        intensity: 'moderate', riskLevel: 'low', risks: [['Misjudged references can feel exclusionary.', 'low']],
        ethicalBoundary: 'Do not fabricate cultural or personal memories.', sensitivity: 'standard',
        safeApplications: ['Referencing a real, shared tradition.'], prohibitedApplications: ['Inventing a shared past.'],
        doesNotExplain: ['Purchase intent.'], alternativeExplanations: ['Warmth may come from the product rather than the memory.'],
        examples: ['A genuine shared tradition'], antiExamples: ['A made-up heritage story'],
      })
    );
    expect(bank.list('emotion').length).toBe(before + 1);
    expect(bank.unauthoredConcepts().emotion).not.toContain('nostalgia');
  });

  test('a changed principle needs a higher version; the old one stays in history', () => {
    const bank = createPsychologyBank();
    const e = entry('relief');
    expect(() => bank.install(e)).toThrow(/VERSION_NOT_INCREASED/);
    bank.install({ ...e, principle: { ...e.principle, version: 2, definition: `${e.principle.definition} (revised)` } });
    expect(bank.get('relief')?.version).toBe(2);
    expect(bank.ontology.history({ type: 'psychology', id: 'relief' })).toHaveLength(1);
  });

  test('deprecated principles are hidden from default listings but stay resolvable', () => {
    const bank = createPsychologyBank();
    const e = entry('novelty');
    bank.install({ ...e, principle: { ...e.principle, version: 2, status: 'deprecated', deprecation: { reason: 'merged into surprise', deprecatedAt: '2026-10-06' } } });
    expect(bank.list('attention').map((p) => p.id)).not.toContain('novelty');
    expect(bank.list('attention', { includeDeprecated: true }).map((p) => p.id)).toContain('novelty');
    expect(bank.get('novelty')?.status).toBe('deprecated');
  });
});

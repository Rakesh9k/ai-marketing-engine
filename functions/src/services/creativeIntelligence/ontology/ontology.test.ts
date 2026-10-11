import {
  ONTOLOGY_ENTITY_TYPES,
  ONTOLOGY_RELATIONSHIP_TYPES,
  RELATIONSHIP_MATRIX,
  RELATIONSHIP_CATEGORIES,
  OntologyValidationError,
  createOntologyRegistry,
  isRelationshipAllowed,
  validateEntity,
  validateRelationship,
  type EntityRef,
  type OntologyRegistry,
} from './index';

// ---------------------------------------------------------------------------
// Synthetic, test-only fixture graph (Phase 10.1 §56). Not seed data.
// ---------------------------------------------------------------------------
const base = (type: string, id: string, name: string) => ({
  id,
  slug: id,
  type,
  name,
  version: 1,
  status: 'active',
  definition: `${name} is a reusable piece of creative intelligence used in tests only.`,
  semanticPurpose: `Illustrates the ${type} object for ontology tests.`,
  scope: `Covers ${name} as a concept, not any execution of it.`,
  examples: [`An abstract description of ${name}`],
  antiExamples: [`A finished creative that happens to use ${name}`],
  compatibility: [],
  constraints: [],
});

const FIXTURES: Record<string, unknown>[] = [
  { ...base('psychology', 'cognitive-load-reduction', 'Cognitive Load Reduction'), psychologicalDomain: 'judgment_and_decision', relevantConditions: ['many comparable options'], possibleEffects: ['can lower perceived decision effort when options are structured'], risks: ['over-simplifying a genuinely complex choice'], ethicalConsiderations: ['simplify without hiding material information'] },
  { ...base('human_motivation', 'convenience', 'Convenience'), underlyingNeed: 'Get a good outcome with less effort', typicalTriggers: ['limited time'], ethicalConsiderations: [] },
  { ...base('marketing_principle', 'make-decision-easier', 'Make The Decision Easier'), strategicPurpose: 'Reduce the effort needed to choose', applicableObjectives: ['conversion'], compatibleAudienceConditions: [], incompatibleConditions: ['audience already knows exactly what it wants'] },
  { ...base('audience_situation', 'friday-dinner-decision', 'Friday Evening Dinner Decision'), category: 'TIME_PRESSURE', when: 'Friday evening', who: 'busy families', where: 'home kitchen', whatIsHappening: 'deciding dinner at the end of the work week', whatTheyFeel: 'tired and hungry', whatTheyWant: 'one dinner everybody accepts', decisionWindow: 'immediate', audience: 'young families', situation: 'deciding dinner at the end of the week', trigger: 'end of the work week', context: 'at home, little planning time', emotionalState: 'tired', practicalNeed: 'one dinner everybody accepts', barriers: ['too many choices'], alternatives: ['cooking at home'], decisionStage: 'solution_aware', culturalContexts: [{ dimension: 'city', value: 'Hyderabad' }, { dimension: 'family_structure', value: 'young nuclear family' }] },
  { ...base('insight_pattern', 'choice-harder-than-purchase', 'Choosing Is Harder Than Buying'), insight: 'The barrier is the effort of choosing, not the price of the meal', audienceConditions: ['households deciding together'], situationConditions: ['several acceptable options'], underlyingMotivation: 'effort reduction', tension: 'wanting variety versus wanting it settled', barrier: 'decision effort', implication: 'Lead with an easy recommendation instead of more options', confidence: 'hypothesis', assumptions: ['the audience experiences decision fatigue at dinner time'] },
  { ...base('creative_mechanism', 'choice-simplification', 'Choice Simplification'), psychologicalBasis: 'Structuring options may lower the effort of choosing', audienceConditions: ['faces several comparable options'], awarenessConditions: ['solution_aware', 'product_aware'], applicableObjectives: ['conversion'], risks: ['feels patronising to expert buyers'], ethicalConstraints: ['do not hide relevant options to steer the choice'], truthfulPreconditions: [], constraints: [{ kind: 'avoid_when', description: 'the audience already knows exactly what it wants' }, { kind: 'avoid_when', description: 'the purchase is identity-driven rather than choice-driven' }], compatibility: [{ dimension: 'decision_complexity', value: 'high', fit: 'strong' }, { dimension: 'customer_intent', value: 'already_decided', fit: 'weak' }] },
  { ...base('creative_mechanism', 'urgency', 'Urgency'), psychologicalBasis: 'A real deadline may raise the cost of delay', audienceConditions: [], awarenessConditions: ['product_aware'], applicableObjectives: ['conversion'], risks: ['erodes trust if repeated'], ethicalConstraints: ['only with a genuine deadline'], truthfulPreconditions: ['the deadline or limit is real and verified'] },
  { ...base('creative_mechanism', 'luxury-status-signaling', 'Luxury Status Signaling'), psychologicalBasis: 'Association with status may attract identity-driven buyers', audienceConditions: [], awarenessConditions: [], applicableObjectives: ['awareness'], risks: ['clashes with discount positioning'], ethicalConstraints: [], truthfulPreconditions: [] },
  { ...base('hook_pattern', 'situation-recognition', 'Situation Recognition'), category: 'SITUATION', formula: 'If you are [AUDIENCE] facing [SITUATION]...', risks: [] },
  { ...base('story_structure', 'three-choice-recommendation', 'Three Choices To Recommendation'), category: 'ProblemSolution', beats: [{ id: 'beat-1', label: 'Beat 1', description: 'Present a few options for the audience 10 chars', order: 1 }, { id: 'beat-2', label: 'Beat 2', description: 'Present recommendation for the audience 10 chars', order: 2 }] },
  { ...base('copy_structure', 'option-benefit-recommendation', 'Option Benefit Recommendation'), category: 'ProblemSolution', purpose: 'Presents option benefit and recommendation', sequence: [{ order: 1, name: 'Headline Beat', function: 'Capture attention', required: true, informationRole: 'attention', outputRequirement: 'Headline text' }], tone: { primary: 'warm', conversationalDistance: 'peer', authorityLevel: 'moderate', warmth: 'high' }, sentenceLength: { dominant: 'medium', rhythm: 'flowing' }, specificity: { level: 'moderate' }, emotionalIntensity: { level: 'moderate', startingIntensity: 'low', endingIntensity: 'moderate' }, proofRequirement: { level: 'optional', requiredForClaims: false }, ctaStyle: { type: 'direct', friction: 'low', imperativeLevel: 'moderate' } },
  { ...base('visual_structure', 'three-option-comparison', 'Three Option Comparison'), category: 'hero', visualIdea: 'Three sequential panels comparing options', composition: { layoutType: 'grid', primaryZone: 'center' }, cameraBehavior: { framing: 'wide', movement: 'static' }, subjectHierarchy: { primarySubject: 'product' }, motion: { entry: 'none', emphasis: 'none', exit: 'none' }, textPlacement: { placement: 'center' }, imageRequirements: { required: true, imageTypes: ['product'], minimumAssets: 1 }, videoRequirements: { required: false, minimumClips: 0 }, assetRequirements: [], informationDensity: 'medium', visualPacing: { pace: 'moderate' } },
  { ...base('cta_structure', 'order-or-ask-which-fits', 'Order Or Ask Which Fits'), actionLogic: 'Provide immediate choice to order directly or inquire', frictionLevel: 'low', readinessConditions: ['ready_to_act'], suitableDecisionStages: ['ready_to_act'] },
  { ...base('style_system', 'warm', 'Warm'), expressiveQualities: ['approachable', 'friendly'], risks: ['can feel overly informal for high-end B2B'] },
  { ...base('format', 'short-form-reel', 'Short Form Reel'), communicationContainer: 'A short vertical video consumed in a feed', interactionModel: 'passive viewing with quick reactions' },
  { ...base('format', 'carousel', 'Carousel'), communicationContainer: 'A swipeable sequence of panels', interactionModel: 'active swiping through steps' },
  { ...base('platform', 'short-video-feed', 'Short Video Feed'), attentionEnvironment: 'fast scrolling with little tolerance for delay', interactionModel: 'vertical feed', contentExpectations: ['quick payoff'], ctaCapabilities: ['message'], audienceContext: ['mobile'] },
  { ...base('asset_requirement', 'clear-options', 'Clear Options'), assetType: 'text', substitutionOptions: ['a shortlist drawn from the catalogue'], qualityRequirements: ['options are real and available'], privacyRequirements: [] },
  { ...base('offer_mechanism', 'bundle', 'Bundle'), businessConditions: ['items can be sold together'], customerConditions: [], risks: ['hides the real per-item price'], ethicalConstraints: ['state what is included'], truthfulPreconditions: ['the bundle exists as described'] },
  { ...base('anti_pattern', 'fake-scarcity', 'Fake Scarcity'), kind: 'ethical_prohibition', whatItIs: 'Claiming limited supply or time that does not exist', whyProblematic: 'Creates a false belief to force a decision', whenProblematic: ['whenever supply or deadline is not genuinely limited'], alternatives: ['state a real deadline or real stock level'], ethicalConsiderations: ['deceptive'] },
  { ...base('combination_rule', 'simplification-with-three-choices', 'Simplification With Three Choices'), relation: 'supports', when: [{ kind: 'entity', ref: { type: 'creative_mechanism', id: 'choice-simplification' } }, { kind: 'entity', ref: { type: 'human_motivation', id: 'convenience' } }, { kind: 'context', dimension: 'decision_complexity', operator: 'is', values: ['high'] }], outcome: 'recommend_target', targets: [{ type: 'story_structure', id: 'three-choice-recommendation' }], because: 'Structuring options reduces the effort that the audience tension is about.' },
  { ...base('combination_rule', 'luxury-versus-deep-discount', 'Luxury Versus Deep Discount'), relation: 'conflictsWith', when: [{ kind: 'entity', ref: { type: 'creative_mechanism', id: 'luxury-status-signaling' } }, { kind: 'context', dimension: 'brand_positioning', operator: 'is', values: ['deep_discount'] }], outcome: 'potential_conflict', targets: [{ type: 'creative_mechanism', id: 'luxury-status-signaling' }], because: 'Status signalling and heavy discounting send opposite messages about value.' },
  { ...base('creative_recipe', 'easy-dinner-decision', 'Easy Dinner Decision'), purpose: 'Reason from a dinner-decision situation to a structured recommendation', audienceSituationIds: ['friday-dinner-decision'], insightPatternIds: ['choice-harder-than-purchase'], objectiveConditions: ['conversion'], psychologyIds: ['cognitive-load-reduction'], motivationIds: ['convenience'], principleIds: ['make-decision-easier'], mechanismIds: ['choice-simplification'], offerMechanismIds: ['bundle'], hookPatternIds: ['situation-recognition'], storyStructureIds: ['three-choice-recommendation'], copyStructureIds: ['option-benefit-recommendation'], visualStructureIds: ['three-option-comparison'], ctaStructureIds: ['order-or-ask-which-fits'], styleSystemIds: ['warm'], formatIds: ['short-form-reel', 'carousel'], platformIds: ['short-video-feed'], assetRequirementIds: ['clear-options'], combinationRuleIds: ['simplification-with-three-choices'], antiPatternIds: ['fake-scarcity'] },
  {
    ...base('offer_structure', 'value-stack', 'Value Stack'),
    category: 'valueStack',
    strategicPurpose: 'Communicates total stacked value',
    primaryLever: 'valueCommunication',
    secondaryLevers: ['valueCreation'],
    valueMechanism: 'Itemized component presentation',
    customerProblemSolved: 'Uncertainty about total value',
    perceivedValueEffect: 'Increases perceived total value',
    economicEffect: 'Protects gross margins',
    marginImpact: { reducesPrice: false, confidence: 'hypothesis' },
    bestFor: [],
    bestObjectives: [],
    bestIndustries: [],
    bestSituations: [],
    compatibleMechanisms: [],
    compatibleCopyGrammars: [],
    compatibleStoryStructures: [],
    compatibleVisualStructures: [],
    prerequisites: [],
    requiredEvidence: [],
    strengths: ['high value perception'],
    weaknesses: ['can look cluttered if too many items'],
    risks: ['skepticism if items are inflated'],
    worksWith: ['carousel'],
    avoidWith: ['minimalist_single_image'],
    antiPatterns: [],
    ethicalBoundaries: ['do not fabricate item prices'],
    assumptions: ['customer values add-on components'],
    evidence: [],
    confidence: 'hypothesis',
    status: 'known',
    relationships: [],
  },
];

const ref = (type: string, id: string): EntityRef => ({ type: type as EntityRef['type'], id });
const rel = (s: [string, string], relationship: string, t: [string, string], extra: Record<string, unknown> = {}) => ({
  source: ref(...s),
  relationship,
  target: ref(...t),
  ...extra,
});

const EDGES = [
  rel(['psychology', 'cognitive-load-reduction'], 'supports', ['marketing_principle', 'make-decision-easier'], { strength: 'strong', rationale: 'Lower effort is what the principle asks for', confidence: 'hypothesis' }),
  rel(['psychology', 'cognitive-load-reduction'], 'influences', ['human_motivation', 'convenience']),
  rel(['audience_situation', 'friday-dinner-decision'], 'reveals', ['insight_pattern', 'choice-harder-than-purchase']),
  rel(['insight_pattern', 'choice-harder-than-purchase'], 'supports', ['human_motivation', 'convenience']),
  rel(['insight_pattern', 'choice-harder-than-purchase'], 'supports', ['marketing_principle', 'make-decision-easier']),
  rel(['marketing_principle', 'make-decision-easier'], 'expressedThrough', ['creative_mechanism', 'choice-simplification']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['story_structure', 'three-choice-recommendation'], { strength: 'strong', conditions: ['decision involves several comparable options'], rationale: 'The structure reduces perceived decision complexity', confidence: 'moderate_evidence', evidenceRefs: ['ext-evidence-placeholder'] }),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['hook_pattern', 'situation-recognition']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['visual_structure', 'three-option-comparison']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['copy_structure', 'option-benefit-recommendation']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['cta_structure', 'order-or-ask-which-fits']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['style_system', 'warm']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['format', 'short-form-reel']),
  rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['format', 'carousel']),
  rel(['creative_mechanism', 'choice-simplification'], 'requires', ['asset_requirement', 'clear-options']),
  rel(['creative_mechanism', 'choice-simplification'], 'appropriateFor', ['audience_situation', 'friday-dinner-decision']),
  rel(['creative_mechanism', 'choice-simplification'], 'conflictsWith', ['creative_mechanism', 'luxury-status-signaling'], { rationale: 'Simplifying choice pulls against exclusivity cues' }),
  rel(['creative_mechanism', 'urgency'], 'constrainedBy', ['anti_pattern', 'fake-scarcity']),
  rel(['story_structure', 'three-choice-recommendation'], 'appropriateFor', ['format', 'short-form-reel']),
  rel(['story_structure', 'three-choice-recommendation'], 'appropriateFor', ['format', 'carousel']),
  rel(['format', 'short-form-reel'], 'constrainedBy', ['platform', 'short-video-feed']),
  rel(['offer_mechanism', 'bundle'], 'worksWith', ['cta_structure', 'order-or-ask-which-fits']),
  rel(['anti_pattern', 'fake-scarcity'], 'constrains', ['offer_mechanism', 'bundle']),
  rel(['creative_recipe', 'easy-dinner-decision'], 'composedOf', ['creative_mechanism', 'choice-simplification']),
];

function loadedRegistry(): OntologyRegistry {
  const reg = createOntologyRegistry();
  FIXTURES.forEach((f) => reg.register(f));
  EDGES.forEach((e) => reg.addRelationship(e));
  return reg;
}

const codes = (issues: readonly { code: string }[]) => issues.map((i) => i.code);

// ===========================================================================
describe('ontology entities', () => {
  test('all ontology types exist and each has a valid fixture', () => {
    const present = new Set(FIXTURES.map((f) => (f as Record<string, unknown>)['type']));
    for (const t of ONTOLOGY_ENTITY_TYPES) expect(present.has(t as any)).toBe(true);
    for (const f of FIXTURES) expect(validateEntity(f)).toMatchObject({ ok: true });
  });

  test('unknown type is rejected', () => {
    expect(codes(validateEntity({ ...FIXTURES[0], type: 'invoice' }).issues)).toContain('UNKNOWN_ENTITY_TYPE');
    expect(codes(validateEntity(null).issues)).toContain('UNKNOWN_ENTITY_TYPE');
  });

  test('missing required fields are rejected, per type', () => {
    for (const f of FIXTURES) {
      const { definition: _d, ...withoutDefinition } = f as Record<string, unknown>;
      expect(validateEntity(withoutDefinition).ok).toBe(false);
      const { examples: _e, ...withoutExamples } = f as Record<string, unknown>;
      expect(validateEntity(withoutExamples).ok).toBe(false);
      const { antiExamples: _a, ...withoutAnti } = f as Record<string, unknown>;
      expect(validateEntity(withoutAnti).ok).toBe(false);
    }
  });

  test('unknown extra fields are rejected (strict)', () => {
    expect(validateEntity({ ...FIXTURES[0], guaranteedConversionRate: 0.9 }).ok).toBe(false);
  });

  test('an observation is not an insight', () => {
    const observation = { ...FIXTURES[4], tension: undefined, implication: undefined };
    expect(validateEntity(observation).ok).toBe(false);
  });

  test('deprecated entities must say why; active entities must not carry deprecation', () => {
    expect(codes(validateEntity({ ...FIXTURES[0], status: 'deprecated' }).issues)).toContain('DEPRECATION_REQUIRED');
    expect(validateEntity({ ...FIXTURES[0], status: 'deprecated', deprecation: { reason: 'superseded', deprecatedAt: '2026-10-06' } }).ok).toBe(true);
    expect(codes(validateEntity({ ...FIXTURES[0], deprecation: { reason: 'x', deprecatedAt: 'y' } }).issues)).toContain('DEPRECATION_ON_ACTIVE');
  });

  test('confidence above hypothesis needs evidence', () => {
    expect(codes(validateEntity({ ...FIXTURES[0], confidence: 'validated' }).issues)).toContain('CONFIDENCE_WITHOUT_EVIDENCE');
    expect(validateEntity({ ...FIXTURES[0], confidence: 'validated', evidenceRefs: ['exp-1'] }).ok).toBe(true);
    expect(validateEntity({ ...FIXTURES[0], confidence: 'hypothesis' }).ok).toBe(true);
  });

  test('a combination rule must explain why and reference the ontology', () => {
    const rule = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'simplification-with-three-choices') as Record<string, unknown>;
    expect(validateEntity({ ...rule, because: '' }).ok).toBe(false);
    expect(codes(validateEntity({ ...rule, when: [{ kind: 'context', dimension: 'objective', operator: 'is', values: ['conversion'] }] }).issues)).toContain('RULE_NEEDS_ENTITY_CONDITION');
    expect(codes(validateEntity({ ...rule, targets: [] }).issues)).toContain('RULE_NEEDS_TARGET');
  });
});

// ===========================================================================
describe('reusability: finished outputs are not ontology objects', () => {
  const mechanism = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'choice-simplification') as Record<string, unknown>;

  test.each([
    ['5 Instagram Reel Ideas'],
    ['10 Restaurant Hooks'],
    ['Viral Post'],
    ['Trending Audio'],
    ['Canva Template'],
    ['Best Caption'],
    ['Bad Creative'],
  ])('rejects the name "%s"', (name) => {
    expect(codes(validateEntity({ ...mechanism, name }).issues)).toContain('FINISHED_OUTPUT_NAME');
  });

  test.each([
    ['PRICE_OR_OFFER_FIGURE', 'Works for a ₹299 biryani offer in the weekend'],
    ['HASHTAG_OR_HANDLE', 'Add #hyderabadfoodie to the post for reach'],
    ['QUOTED_COPY', 'Use the line "Stop scrolling if you love biryani" here'],
    ['PIXEL_DIMENSIONS', 'Render at 1080x1350 for the feed placement'],
    ['COLOR_VALUE', 'Use an orange #ff6600 background for energy'],
    ['URL', 'See https://example.com/campaign for the full piece'],
    ['PERSONAL_DATA', 'Reach the owner at owner@example.com about this'],
  ])('flags %s in a definition', (code, definition) => {
    expect(codes(validateEntity({ ...mechanism, definition }).issues)).toContain(code);
  });

  test('illustrative examples fields are not scanned, definitions are', () => {
    expect(validateEntity({ ...mechanism, examples: ['Three options then one clear recommendation'] }).ok).toBe(true);
  });

  test('universal effectiveness claims are rejected', () => {
    expect(codes(validateEntity({ ...mechanism, definition: 'Choice simplification always increases conversions for restaurants.' }).issues)).toContain('UNIVERSAL_EFFECTIVENESS_CLAIM');
    const psych = FIXTURES[0] as Record<string, unknown>;
    expect(codes(validateEntity({ ...psych, possibleEffects: ['Guaranteed conversion uplift'] }).issues)).toContain('UNIVERSAL_EFFECTIVENESS_CLAIM');
  });

  test('style and visual structures carry no brand-design specifics', () => {
    const style = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'warm') as Record<string, unknown>;
    expect(codes(validateEntity({ ...style, definition: 'Warm style uses a serif font in a black and gold palette.' }).issues)).toContain('DESIGN_SPECIFICS');
    const visual = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'three-option-comparison') as Record<string, unknown>;
    expect(codes(validateEntity({ ...visual, definition: 'Place the logo at 40px from the left edge, recommended option bigger' }).issues)).toEqual(expect.arrayContaining(['PIXEL_DIMENSIONS']));
  });

  test('audience situations carry no personal data', () => {
    const situation = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'friday-dinner-decision') as Record<string, unknown>;
    expect(codes(validateEntity({ ...situation, context: 'Call Ravi on 9876543210 for this one' }).issues)).toContain('PERSONAL_DATA');
  });

  test('every fixture is free of output leakage', () => {
    for (const f of FIXTURES) expect(validateEntity(f).issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

// ===========================================================================
describe('relationships', () => {
  test('vocabulary is controlled and categorised', () => {
    const all = Object.values(RELATIONSHIP_CATEGORIES).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const required of ['influences', 'supports', 'expressedThrough', 'worksWith', 'requires', 'conflictsWith', 'constrainedBy', 'appropriateFor', 'validatedBy', 'invalidatedBy', 'learnedFrom', 'measuredBy', 'oftenCombinedWith', 'alternativeTo', 'conditionalOn', 'notRecommendedFor', 'avoids', 'composedOf', 'constrains', 'guides', 'reveals']) {
      expect(ONTOLOGY_RELATIONSHIP_TYPES).toContain(required);
    }
  });

  test('the matrix is machine-readable and covers the brief’s table', () => {
    const must: [string, string, string][] = [
      ['psychology', 'influences', 'marketing_principle'],
      ['psychology', 'supports', 'creative_mechanism'],
      ['marketing_principle', 'guides', 'creative_mechanism'],
      ['audience_situation', 'reveals', 'insight_pattern'],
      ['insight_pattern', 'supports', 'marketing_principle'],
      ['creative_mechanism', 'worksWith', 'hook_pattern'],
      ['creative_mechanism', 'worksWith', 'story_structure'],
      ['creative_mechanism', 'worksWith', 'copy_structure'],
      ['creative_mechanism', 'worksWith', 'visual_structure'],
      ['creative_mechanism', 'worksWith', 'cta_structure'],
      ['creative_mechanism', 'worksWith', 'style_system'],
      ['creative_mechanism', 'requires', 'asset_requirement'],
      ['creative_mechanism', 'conflictsWith', 'creative_mechanism'],
      ['offer_mechanism', 'worksWith', 'cta_structure'],
      ['format', 'constrainedBy', 'platform'],
      ['creative_recipe', 'composedOf', 'creative_mechanism'],
      ['anti_pattern', 'constrains', 'creative_mechanism'],
    ];
    for (const [s, r, t] of must) {
      expect(isRelationshipAllowed(s as never, r as never, t as never)).toBe(true);
    }
    expect(RELATIONSHIP_MATRIX.length).toBeGreaterThan(100);
  });

  test('valid relationships are accepted', () => {
    for (const e of EDGES) expect(validateRelationship(e).ok).toBe(true);
  });

  test('unknown relationship types are rejected', () => {
    expect(codes(validateRelationship(rel(['psychology', 'a'], 'magicallyBoosts', ['marketing_principle', 'b'])).issues)).toContain('UNKNOWN_RELATIONSHIP_TYPE');
  });

  test('invalid source/target combinations are rejected', () => {
    expect(codes(validateRelationship(rel(['psychology', 'a'], 'worksWith', ['hook_pattern', 'b'])).issues)).toContain('INVALID_SOURCE_TARGET');
    expect(codes(validateRelationship(rel(['hook_pattern', 'a'], 'influences', ['psychology', 'b'])).issues)).toContain('INVALID_SOURCE_TARGET');
    expect(codes(validateRelationship(rel(['psychology', 'a'], 'worksWith', ['invoice', 'b'])).issues)).toContain('UNKNOWN_ENTITY_TYPE');
  });

  test('direction matters', () => {
    expect(isRelationshipAllowed('psychology', 'influences', 'marketing_principle')).toBe(true);
    expect(isRelationshipAllowed('marketing_principle', 'influences', 'psychology')).toBe(false);
  });

  test('self relationships are rejected', () => {
    expect(codes(validateRelationship(rel(['creative_mechanism', 'x'], 'conflictsWith', ['creative_mechanism', 'x'])).issues)).toContain('SELF_RELATIONSHIP');
  });

  test('relatedTo is only a flagged fallback', () => {
    const r = validateRelationship(rel(['psychology', 'a'], 'relatedTo', ['hook_pattern', 'b']));
    expect(r.ok).toBe(true);
    expect(codes(r.issues)).toContain('GENERIC_RELATIONSHIP');
  });

  test('learning relationships target external evidence, never ontology entities', () => {
    const ok = validateRelationship({ source: ref('creative_mechanism', 'a'), relationship: 'validatedBy', target: { type: 'external', refType: 'experiment', id: 'exp-1' } });
    expect(ok.ok).toBe(true);
    expect(codes(validateRelationship(rel(['creative_mechanism', 'a'], 'validatedBy', ['creative_mechanism', 'b'])).issues)).toContain('LEARNING_TARGET_MUST_BE_EXTERNAL');
    expect(codes(validateRelationship({ source: ref('creative_mechanism', 'a'), relationship: 'worksWith', target: { type: 'external', refType: 'evidence', id: 'e' } }).issues)).toContain('EXTERNAL_TARGET_NOT_ALLOWED');
  });

  test('uncertainty is honest: strong confidence needs evidence', () => {
    expect(codes(validateRelationship(rel(['creative_mechanism', 'a'], 'worksWith', ['story_structure', 'b'], { confidence: 'strong_evidence' })).issues)).toContain('CONFIDENCE_WITHOUT_EVIDENCE');
    expect(validateRelationship(rel(['creative_mechanism', 'a'], 'worksWith', ['story_structure', 'b'], { confidence: 'hypothesis' })).ok).toBe(true);
    expect(validateRelationship(rel(['creative_mechanism', 'a'], 'worksWith', ['story_structure', 'b'])).ok).toBe(true);
  });
});

// ===========================================================================
describe('registry and graph integrity', () => {
  test('loads the representative graph with no integrity errors', () => {
    const reg = loadedRegistry();
    expect(reg.validateGraph().filter((i) => i.severity === 'error')).toEqual([]);
    expect(Object.values(reg.counts()).every((n) => n >= 1)).toBe(true);
  });

  test('dangling references are prevented', () => {
    const reg = loadedRegistry();
    expect(() => reg.addRelationship(rel(['creative_mechanism', 'choice-simplification'], 'worksWith', ['hook_pattern', 'does-not-exist']))).toThrow(OntologyValidationError);
    expect(() => reg.addRelationship(rel(['creative_mechanism', 'ghost'], 'worksWith', ['hook_pattern', 'situation-recognition']))).toThrow(/DANGLING_REFERENCE/);
  });

  test('duplicate ids need a higher version; history is kept', () => {
    const reg = loadedRegistry();
    const m = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'choice-simplification') as Record<string, unknown>;
    expect(() => reg.register(m)).toThrow(/VERSION_NOT_INCREASED/);
    reg.register({ ...m, version: 2, definition: 'A refined definition of choice simplification for tests only.' });
    expect(reg.get('creative_mechanism', 'choice-simplification')?.version).toBe(2);
    expect(reg.history(ref('creative_mechanism', 'choice-simplification'))).toHaveLength(1);
    expect(reg.validateGraph().filter((i) => i.severity === 'error')).toEqual([]); // edges survive the new version
  });

  test('deprecated entities stay resolvable, are hidden from default listings and warn on new references', () => {
    const reg = loadedRegistry();
    const hook = FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'situation-recognition') as Record<string, unknown>;
    reg.register({ ...hook, version: 2, status: 'deprecated', deprecation: { reason: 'merged', deprecatedAt: '2026-10-06' } });
    expect(reg.get('hook_pattern', 'situation-recognition')?.status).toBe('deprecated');
    expect(reg.list('hook_pattern').map((h) => h.id)).not.toContain('situation-recognition');
    expect(reg.list('hook_pattern', { includeDeprecated: true }).map((h) => h.id)).toContain('situation-recognition');
    expect(reg.from(ref('creative_mechanism', 'choice-simplification'), ['worksWith']).some((e) => e.target.type === 'hook_pattern')).toBe(true);
    const graph = reg.validateGraph();
    expect(graph.filter((i) => i.severity === 'error')).toEqual([]);
    expect(codes(graph)).toContain('DEPRECATED_REFERENCE');
    expect(reg.addRelationship(rel(['creative_mechanism', 'urgency'], 'worksWith', ['hook_pattern', 'situation-recognition'])).warnings.map((w) => w.code)).toContain('DEPRECATED_REFERENCE');
  });

  test('legitimate graph cycles are allowed; dependency cycles are not', () => {
    const reg = loadedRegistry();
    // peer relationship cycle: allowed
    reg.addRelationship(rel(['creative_mechanism', 'luxury-status-signaling'], 'conflictsWith', ['creative_mechanism', 'choice-simplification']));
    // dependency cycle: rejected
    reg.addRelationship(rel(['creative_mechanism', 'urgency'], 'dependsOn', ['creative_mechanism', 'choice-simplification']));
    expect(() => reg.addRelationship(rel(['creative_mechanism', 'choice-simplification'], 'dependsOn', ['creative_mechanism', 'urgency']))).toThrow(/CIRCULAR_DEPENDENCY/);
  });

  test('re-adding an identical edge is idempotent', () => {
    const reg = loadedRegistry();
    const before = reg.relationships().length;
    reg.addRelationship(EDGES[0]);
    expect(reg.relationships().length).toBe(before);
  });

  test('registering an invalid entity throws with every issue', () => {
    const reg = createOntologyRegistry();
    expect(() => reg.register({ type: 'creative_mechanism', id: 'Bad ID' })).toThrow(OntologyValidationError);
  });
});

// ===========================================================================
describe('composition: recipes reference, never duplicate', () => {
  test('a recipe references many ontology objects by id', () => {
    const reg = loadedRegistry();
    const recipe = reg.get('creative_recipe', 'easy-dinner-decision');
    expect(recipe?.mechanismIds).toEqual(['choice-simplification']);
    expect(recipe?.formatIds).toHaveLength(2);
    expect(reg.validateGraph().filter((i) => i.code.startsWith('RECIPE'))).toEqual([]);
  });

  test('embedded objects are rejected (strict id lists)', () => {
    const recipe = FIXTURES.find((f) => (f as Record<string, unknown>)['type'] === 'creative_recipe') as Record<string, unknown>;
    expect(validateEntity({ ...recipe, mechanismIds: [{ name: 'Choice Simplification' }] }).ok).toBe(false);
    expect(validateEntity({ ...recipe, mechanism: { name: 'Choice Simplification' } }).ok).toBe(false);
  });

  test('a recipe needs a principle and a mechanism', () => {
    const recipe = FIXTURES.find((f) => (f as Record<string, unknown>)['type'] === 'creative_recipe') as Record<string, unknown>;
    expect(validateEntity({ ...recipe, mechanismIds: [] }).ok).toBe(false);
    expect(validateEntity({ ...recipe, principleIds: [] }).ok).toBe(false);
  });

  test('dangling recipe references are detected by graph validation', () => {
    const reg = loadedRegistry();
    const recipe = FIXTURES.find((f) => (f as Record<string, unknown>)['type'] === 'creative_recipe') as Record<string, unknown>;
    reg.register({ ...recipe, version: 2, hookPatternIds: ['no-such-hook'] });
    expect(codes(reg.validateGraph())).toContain('RECIPE_DANGLING_REFERENCE');
  });

  test('a recipe cannot hide a wrongly typed id: ids resolve within the field’s own type', () => {
    const reg = loadedRegistry();
    const recipe = FIXTURES.find((f) => (f as Record<string, unknown>)['type'] === 'creative_recipe') as Record<string, unknown>;
    // "warm" exists, but as a style_system, not a hook_pattern
    reg.register({ ...recipe, version: 2, hookPatternIds: ['warm'] });
    expect(codes(reg.validateGraph())).toContain('RECIPE_DANGLING_REFERENCE');
  });
});

// ===========================================================================
describe('the five critical tests (Phase 10.1 §61–65)', () => {
  const reg = loadedRegistry();

  test('1. psychology → final creative reasoning chain, without storing the creative', () => {
    const path = reg.findPath(ref('psychology', 'cognitive-load-reduction'), ref('format', 'short-form-reel'), {
      relationships: ['supports', 'expressedThrough', 'worksWith', 'appropriateFor'],
    });
    expect(path).toBeDefined();
    expect((path ?? []).map((e) => `${e.source.id} -${e.relationship}-> ${e.target.type === 'external' ? '' : e.target.id}`)).toEqual([
      'cognitive-load-reduction -supports-> make-decision-easier',
      'make-decision-easier -expressedThrough-> choice-simplification',
      'choice-simplification -worksWith-> short-form-reel',
    ]);
    // …and through the structure, as in the brief's example
    const viaStructure = reg.findPath(ref('psychology', 'cognitive-load-reduction'), ref('story_structure', 'three-choice-recommendation'), {
      relationships: ['supports', 'expressedThrough', 'worksWith'],
    });
    expect(viaStructure).toHaveLength(3);
    // nothing in the registry is a finished creative
    for (const type of ONTOLOGY_ENTITY_TYPES) for (const e of reg.list(type)) expect(validateEntity(e).ok).toBe(true);
  });

  test('2. the same intelligence yields different executions (format changes, mechanism does not)', () => {
    const formats = reg.from(ref('creative_mechanism', 'choice-simplification'), ['worksWith']).filter((e) => e.target.type === 'format');
    expect(formats.map((e) => (e.target.type === 'external' ? '' : e.target.id)).sort()).toEqual(['carousel', 'short-form-reel']);
  });

  test('3. it can say when NOT to use a mechanism', () => {
    const m = reg.get('creative_mechanism', 'choice-simplification');
    expect(m?.constraints.filter((c: any) => c.kind === 'avoid_when').map((c: any) => c.description)).toEqual([
      'the audience already knows exactly what it wants',
      'the purchase is identity-driven rather than choice-driven',
    ]);
    expect(m?.compatibility.some((c: any) => c.fit === 'weak' && c.value === 'already_decided')).toBe(true);
  });

  test('4. it represents combinations and conflicts, with reasons', () => {
    const good = reg.get('combination_rule', 'simplification-with-three-choices');
    const bad = reg.get('combination_rule', 'luxury-versus-deep-discount');
    expect(good).toMatchObject({ outcome: 'recommend_target', relation: 'supports' });
    expect(bad).toMatchObject({ outcome: 'potential_conflict', relation: 'conflictsWith' });
    expect(good?.because.length).toBeGreaterThan(15);
    expect(bad?.because.length).toBeGreaterThan(15);
    expect(reg.from(ref('creative_mechanism', 'choice-simplification'), ['conflictsWith'])).toHaveLength(1);
  });

  test('5. growth is objects + relationships + compatibility + constraints, not lists', () => {
    const r2 = loadedRegistry();
    const before = r2.counts().creative_mechanism;
    const mech = { ...(FIXTURES.find((f) => (f as Record<string, unknown>)['id'] === 'urgency') as Record<string, unknown>), id: 'risk-reversal', slug: 'risk-reversal', name: 'Risk Reversal' };
    r2.register(mech);
    r2.addRelationship(rel(['creative_mechanism', 'risk-reversal'], 'worksWith', ['copy_structure', 'option-benefit-recommendation']));
    r2.addRelationship(rel(['creative_mechanism', 'risk-reversal'], 'conflictsWith', ['creative_mechanism', 'urgency']));
    expect(r2.counts().creative_mechanism).toBe(before + 1);
    expect(r2.validateGraph().filter((i) => i.severity === 'error')).toEqual([]);
  });

  test('anti-patterns constrain ordinary objects (persuasion vs deception)', () => {
    const constraining = reg.to(ref('anti_pattern', 'fake-scarcity'));
    expect(constraining.map((e) => `${e.source.id}:${e.relationship}`)).toContain('urgency:constrainedBy');
    expect(reg.get('anti_pattern', 'fake-scarcity')?.kind).toBe('ethical_prohibition');
    // an anti-pattern can never be the target of a positive relationship
    expect(isRelationshipAllowed('creative_mechanism', 'worksWith', 'anti_pattern')).toBe(false);
    expect(isRelationshipAllowed('creative_recipe', 'composedOf', 'anti_pattern')).toBe(true);
  });
});

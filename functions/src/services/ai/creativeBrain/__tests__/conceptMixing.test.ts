/**
 * PHASE 15 — Concept Mixing Engine Unit & Integration Tests
 * Validates component selection, dependency analysis, compatibility checks,
 * conflict resolution, tenant isolation, truth/brand gate precedence, and Creative Blueprint synthesis.
 */

import { ConceptMixingService } from '../mixing/conceptMixingService';
import type { ConceptMixSelection } from '../mixing/mixing.types';
import type { CreativeConcept, ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type { BusinessContextContract, CampaignIntentContract } from '../types/creativeArchitecture.types';

describe('PHASE 15 — Concept Mixing Engine Test Suite', () => {
  let mixingService: ConceptMixingService;

  const mockBusinessBrain: BusinessContextContract = {
    businessId: 'biz_kondapur_dining',
    tenantId: 'tenant_123',
    name: 'Royal Spice Family Restaurant',
    industry: 'restaurant',
    subVertical: 'fine_dining',
    positioning: 'Authentic regional family dining with zero compromise on freshness',
    brandVoice: {
      tone: 'Warm, hospitable, authentic',
      formality: 'CASUAL',
      languagePreference: 'English',
      forbiddenWords: ['cheap'],
      allowedClaims: ['Family Combos'],
    },
    verifiedEvidence: {
      hasTestimonials: true,
      hasReviewCount: true,
      reviewRating: 4.8,
      hasStatedExpiry: false,
      hasInventoryLimit: false,
      verifiedClaims: ['4.8 Star Rated'],
    },
  };

  const mockCampaignIntent: CampaignIntentContract = {
    intentId: 'intent_weekend_lunch',
    campaignObjective: 'ACQUISITION',
    decisionStage: 'CONSIDERATION',
    targetAudience: 'Young families in Kondapur',
    audienceSituation: 'Deciding where to have weekend family lunch without food argument',
    product: 'Weekend Family Feast Combo',
    offerDetails: {
      hasOffer: true,
      offerTitle: 'Family Feast Combo ₹699',
      offerPrice: 699,
      hasStatedExpiry: false,
      hasInventoryLimit: false,
    },
  };

  const mockOpportunity: any = {
    id: 'opp_weekend_family_relief',
    opportunityId: 'opp_weekend_family_relief',
    coreInsight: 'Weekend dining should feel relaxing, but choosing something everyone agrees on creates decision fatigue for parents.',
    strategicProblem: 'Parents are exhausted managing competing food preferences on weekends.',
    desiredAudienceShift: 'Shift from decision fatigue to instant ordering relief with one complete family combo.',
    recommendedAngle: 'Position the Family Combo as the single zero-debate solution that satisfies everyone.',
    customerTension: 'Parents want family togetherness without food choice arguments.',
    productOrService: 'Weekend Family Feast Combo',
    offer: 'Family Feast Combo ₹699',
  };

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_weekend_001',
    businessBrain: mockBusinessBrain,
    campaignIntent: mockCampaignIntent,
    creativeOpportunity: mockOpportunity,
  };

  const concept1: CreativeConcept = {
    id: 'c1',
    name: 'The Family Table',
    oneLineIdea: 'Bring everyone back to the same table without compromising preferences.',
    humanInsight: 'Families value meals because they create shared time.',
    whyThisBusiness: 'Royal Spice family combo accommodates everyone.',
    whyThisAudience: 'Young families value togetherness.',
    emotionalResponse: { primary: 'Warmth', secondary: 'Belonging' },
    hook: 'Different choices. One table.',
    creativeMechanism: { name: 'Emotional Storytelling', explanation: 'Shared family moments.' },
    visualDirection: 'Steaming family combo at the center of a happy family table.',
    storyDirection: 'Family arrives -> Food served -> Everyone smiles.',
    offerIntegration: 'Family Feast Combo ₹699 provides the practical reason to gather.',
    cta: 'Bring everyone to the table this weekend.',
    recommendedFormat: { primary: 'Static Hero Creative' },
    recommendedPlatform: { primary: 'Instagram' },
    requiredAssets: { required: ['Product photo', 'Logo'], recommended: ['Family photo'], optional: [] },
    whyMitraRecommendsIt: 'Warmth territory.',
    score: { total: 88, strategicRelevance: 18, audienceRelevance: 14, businessFit: 14, humanInsight: 14, creativeDistinctiveness: 13, emotionalStrength: 8, executionFeasibility: 4, offerIntegration: 3 },
    evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
    creativeBankReferences: [],
    status: 'recommended',
  };

  const concept2: CreativeConcept = {
    id: 'c2',
    name: '₹699 Shock',
    oneLineIdea: 'Challenge assumptions about family meal prices with a surprising ₹699 price reveal.',
    humanInsight: 'People assume a complete family meal costs much more.',
    whyThisBusiness: 'Royal Spice delivers premium food at an accessible price.',
    whyThisAudience: 'Families love unexpected value discovery.',
    emotionalResponse: { primary: 'Surprise', secondary: 'Excitement' },
    hook: 'A family meal for ₹699?!',
    creativeMechanism: { name: 'Price Contrast', explanation: '50% discount price shock visual.' },
    visualDirection: 'Extreme price shock graphic overlay on rich food photography.',
    storyDirection: 'High price expectation -> Shocking ₹699 reveal -> Order now.',
    offerIntegration: '50% OFF discount price shock.',
    cta: 'Claim ₹699 offer now.',
    recommendedFormat: { primary: 'Offer Card' },
    recommendedPlatform: { primary: 'Facebook' },
    requiredAssets: { required: ['Product photo', 'Offer badge'], recommended: [], optional: [] },
    whyMitraRecommendsIt: 'Surprise territory.',
    score: { total: 84, strategicRelevance: 16, audienceRelevance: 13, businessFit: 13, humanInsight: 12, creativeDistinctiveness: 14, emotionalStrength: 7, executionFeasibility: 4, offerIntegration: 5 },
    evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
    creativeBankReferences: [],
    status: 'recommended',
  };

  const concept3: CreativeConcept = {
    id: 'c3',
    name: 'Everyone\'s Sorted',
    oneLineIdea: 'Turn the exhausting "what should we eat?" conversation into zero-debate relief.',
    humanInsight: 'Parents dislike spending weekends negotiating toddler food requests.',
    whyThisBusiness: 'Royal Spice combo satisfies all tastes.',
    whyThisAudience: 'Parents want relief from daily food arguments.',
    emotionalResponse: { primary: 'Relief', secondary: 'Amusement' },
    hook: 'For once, the family group chat agrees.',
    creativeMechanism: { name: 'Decision Elimination', explanation: 'Relatable decision fatigue reversal.' },
    visualDirection: 'Humorous cuts of family food debates ending in relief.',
    storyDirection: 'Debate -> Chaos -> Combo arrives -> Silence & enjoyment.',
    offerIntegration: '₹699 serves as the decision-solved moment.',
    cta: 'Order your family combo this weekend.',
    recommendedFormat: { primary: 'Short Reel' },
    recommendedPlatform: { primary: 'Instagram Reels' },
    requiredAssets: { required: ['Product photo', 'Reaction clip'], recommended: [], optional: [] },
    whyMitraRecommendsIt: 'Relief territory.',
    score: { total: 86, strategicRelevance: 17, audienceRelevance: 14, businessFit: 13, humanInsight: 13, creativeDistinctiveness: 14, emotionalStrength: 8, executionFeasibility: 4, offerIntegration: 3 },
    evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
    creativeBankReferences: [],
    status: 'recommended',
  };

  const availableConcepts = [concept1, concept2, concept3];

  beforeEach(() => {
    mixingService = new ConceptMixingService();
  });

  // -------------------------------------------------------------
  // TEST 1 — BASIC MIXING (Golden Scenario)
  // -------------------------------------------------------------
  test('Test 1 — Basic Mixing: Combines Core Idea (C1), Visual (C2), Hook (C3), and Tone (C3) into a coherent Blueprint', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'tenant_123',
      primaryConceptId: 'c1',
      selections: [
        { component: 'coreIdea', conceptId: 'c1' },
        { component: 'visualDirection', conceptId: 'c2' },
        { component: 'hook', conceptId: 'c3' },
        { component: 'tone', conceptId: 'c3' },
      ],
    };

    const result = mixingService.mixConcepts(selectionInput, validInput, availableConcepts);

    expect(result.blueprint.blueprintId).toBeDefined();
    expect(result.blueprint.title).toContain('The Family Table');
    expect(result.blueprint.hook).toBe('For once, the family group chat agrees.');
    expect(result.blueprint.provenance.sourceConcepts).toContain('c1');
    expect(result.blueprint.provenance.sourceConcepts).toContain('c2');
    expect(result.blueprint.provenance.sourceConcepts).toContain('c3');
    expect(result.blueprint.blueprintScore.total).toBeGreaterThanOrEqual(70);
  });

  // -------------------------------------------------------------
  // TEST 2 — PARTIAL MIXING
  // -------------------------------------------------------------
  test('Test 2 — Partial Mixing: Intelligently fills missing fields when only Core Idea & Hook are selected', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'tenant_123',
      selections: [
        { component: 'coreIdea', conceptId: 'c1' },
        { component: 'hook', conceptId: 'c3' },
      ],
    };

    const result = mixingService.mixConcepts(selectionInput, validInput, availableConcepts);

    expect(result.blueprint.visualDirection).toBeDefined();
    expect(result.blueprint.cta).toBeDefined();
    expect(result.blueprint.recommendedFormat.primary).toBeDefined();
  });

  // -------------------------------------------------------------
  // TEST 3 — CONFLICT RESOLUTION (Warmth vs Price Shock Visual)
  // -------------------------------------------------------------
  test('Test 3 — Conflicting Mix: Adapts price shock visual when paired with warmth emotional core', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'tenant_123',
      primaryConceptId: 'c1',
      selections: [
        { component: 'coreIdea', conceptId: 'c1' },
        { component: 'emotionalTerritory', conceptId: 'c1' },
        { component: 'visualDirection', conceptId: 'c2' },
      ],
    };

    const result = mixingService.mixConcepts(selectionInput, validInput, availableConcepts);

    expect(result.mixedConcept.conflictsResolved.length).toBeGreaterThan(0);
    expect(result.mixedConcept.adaptations.some((a) => a.component === 'visualDirection')).toBe(true);
    expect(result.explanation.adaptationsExplained.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------
  // TEST 4 — UNSUPPORTED OFFER PRECEDENCE
  // -------------------------------------------------------------
  test('Test 4 — Truth & Business Brain Precedence: Overrides unsupported 50% discount claim with official offer', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'tenant_123',
      selections: [
        { component: 'offerIntegration', conceptId: 'c2' }, // C2 mentions 50% discount
      ],
    };

    const result = mixingService.mixConcepts(selectionInput, validInput, availableConcepts);

    expect(result.blueprint.offer).toBe('Family Feast Combo ₹699');
    expect(result.mixedConcept.adaptations.some((a) => a.component === 'offerIntegration')).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 5 — TENANT ISOLATION SECURITY CHECK
  // -------------------------------------------------------------
  test('Test 5 — Security Error: Throws error on cross-tenant concept mixing attempt', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'unauthorized_hacker_tenant',
      selections: [{ component: 'coreIdea', conceptId: 'c1' }],
    };

    expect(() => mixingService.mixConcepts(selectionInput, validInput, availableConcepts)).toThrow(
      'Cross-tenant concept mixing access denied'
    );
  });

  // -------------------------------------------------------------
  // TEST 6 — UNKNOWN CONCEPT ID CHECK
  // -------------------------------------------------------------
  test('Test 6 — Authorization Error: Throws error when referencing an unknown concept ID', () => {
    const selectionInput: ConceptMixSelection = {
      campaignId: 'camp_weekend_001',
      tenantId: 'tenant_123',
      selections: [{ component: 'coreIdea', conceptId: 'non_existent_concept_999' }],
    };

    expect(() => mixingService.mixConcepts(selectionInput, validInput, availableConcepts)).toThrow(
      'Invalid or unauthorized concept ID'
    );
  });
});

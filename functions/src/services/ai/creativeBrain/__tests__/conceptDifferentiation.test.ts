/**
 * PHASE 14 — Strategic Concept Differentiation Unit & Integration Tests
 * Validates strategic fingerprinting, similarity calculations, collision detection,
 * territory discovery, fake variety rejection, and golden test cases across verticals.
 */

import { ConceptDifferentiationService } from '../differentiation/conceptDifferentiationService';
import { ConceptSimilarityService, CONCEPT_SIMILARITY_THRESHOLD } from '../differentiation/conceptSimilarityService';
import { StrategicFingerprintService } from '../differentiation/strategicFingerprintService';
import type { CreativeConcept, ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type { BusinessContextContract, CampaignIntentContract } from '../types/creativeArchitecture.types';

describe('PHASE 14 — Strategic Concept Differentiation Engine Test Suite', () => {
  let diffService: ConceptDifferentiationService;

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

  const createBaseConcept = (id: string, name: string): CreativeConcept => ({
    id,
    name,
    oneLineIdea: 'Turn decision stress into family dinner relief.',
    humanInsight: 'Parents want effortless family dinner decisions.',
    whyThisBusiness: 'Royal Spice combo satisfies all preferences.',
    whyThisAudience: 'Kondapur families value convenience.',
    emotionalResponse: { primary: 'Relief' },
    hook: 'Everyone wants something different.',
    creativeMechanism: { name: 'Decision Elimination', explanation: 'Eliminates meal choice negotiations.' },
    visualDirection: 'Family around dining table.',
    storyDirection: 'Order -> Eat.',
    offerIntegration: 'Family Combo ₹699',
    cta: 'Order now',
    recommendedFormat: { primary: 'Reel' },
    recommendedPlatform: { primary: 'Instagram' },
    requiredAssets: { required: ['Photo'], recommended: [], optional: [] },
    whyMitraRecommendsIt: 'Relief territory.',
    score: { total: 85, strategicRelevance: 17, audienceRelevance: 13, businessFit: 13, humanInsight: 13, creativeDistinctiveness: 14, emotionalStrength: 8, executionFeasibility: 4, offerIntegration: 3 },
    evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
    creativeBankReferences: [],
    status: 'recommended',
  });

  beforeEach(() => {
    diffService = new ConceptDifferentiationService();
  });

  // -------------------------------------------------------------
  // TEST 1 — FAKE HEADLINE VARIETY REJECTION
  // -------------------------------------------------------------
  test('Test 1 — Rejects fake headline variety (4 price-led concepts with identical strategy)', () => {
    const concept1 = { ...createBaseConcept('c1', 'Enjoy ₹699 Deal'), hook: 'Enjoy our ₹699 family meal today!' };
    const concept2 = { ...createBaseConcept('c2', 'Don\'t Miss ₹699 Deal'), hook: 'Don\'t miss our ₹699 family meal offer!' };
    const concept3 = { ...createBaseConcept('c3', 'Grab ₹699 Deal'), hook: 'Grab your ₹699 family meal now!' };
    const concept4 = { ...createBaseConcept('c4', '₹699 Meal Order Today'), hook: '₹699 family meal - order today!' };

    const result = diffService.differentiateConcepts([concept1, concept2, concept3, concept4], validInput);

    expect(result.rejectedDuplicates.length).toBeGreaterThanOrEqual(2);
    expect(result.differentiatedConcepts.length).toBeLessThan(4);
  });

  // -------------------------------------------------------------
  // TEST 2 — GENUINE EMOTIONAL DIVERSITY
  // -------------------------------------------------------------
  test('Test 2 — Retains genuine emotional diversity (Warmth, Surprise, Relief, Belonging)', () => {
    const cWarmth: CreativeConcept = {
      ...createBaseConcept('c_warmth', 'The Family Table'),
      emotionalResponse: { primary: 'Warmth' },
      creativeMechanism: { name: 'Emotional Storytelling', explanation: 'Focuses on shared memories.' },
      humanInsight: 'Families value meals because they create shared time.',
    };

    const cSurprise: CreativeConcept = {
      ...createBaseConcept('c_surprise', '₹699 Value Shock'),
      emotionalResponse: { primary: 'Surprise' },
      creativeMechanism: { name: 'Price Contrast', explanation: 'Unbelievable premium value for price.' },
      humanInsight: 'People assume a meal for the whole family will cost much more.',
    };

    const cRelief: CreativeConcept = {
      ...createBaseConcept('c_relief', 'Everyone Sorted'),
      emotionalResponse: { primary: 'Relief' },
      creativeMechanism: { name: 'Decision Elimination', explanation: 'Removes decision friction.' },
      humanInsight: 'Parents dislike spending weekends negotiating what to eat.',
    };

    const cBelonging: CreativeConcept = {
      ...createBaseConcept('c_belonging', 'Hyderabad Weekend Ritual'),
      emotionalResponse: { primary: 'Belonging' },
      creativeMechanism: { name: 'Local Identity Framing', explanation: 'Rooted local tradition.' },
      humanInsight: 'Weekend eating is part of experiencing neighborhood culture.',
    };

    const result = diffService.differentiateConcepts([cWarmth, cSurprise, cRelief, cBelonging], validInput);

    expect(result.differentiatedConcepts.length).toBe(4);
    expect(result.rejectedDuplicates.length).toBe(0);
    expect(result.differentiationScoreAverage).toBeGreaterThanOrEqual(70);
  });

  // -------------------------------------------------------------
  // TEST 3 — SAME EMOTION, DIFFERENT INSIGHT
  // -------------------------------------------------------------
  test('Test 3 — Identifies distinct concepts sharing the same primary emotion when insights differ', () => {
    const c1: CreativeConcept = {
      ...createBaseConcept('cA', 'Family Connection'),
      emotionalResponse: { primary: 'Relief' },
      humanInsight: 'Families want simple connection during mealtime.',
      creativeMechanism: { name: 'Connection Framing', explanation: 'Focuses on connection.' },
    };

    const c2: CreativeConcept = {
      ...createBaseConcept('cB', 'Decision Fatigue Reversal'),
      emotionalResponse: { primary: 'Relief' },
      humanInsight: 'Parents spend disproportionate mental energy managing competing toddler food choices.',
      creativeMechanism: { name: 'Problem Reversal', explanation: 'Focuses on decision stress.' },
    };

    const similarity = ConceptSimilarityService.calculateStrategicSimilarity(c1, c2);
    expect(similarity).toBeLessThan(CONCEPT_SIMILARITY_THRESHOLD);
  });

  // -------------------------------------------------------------
  // TEST 4 — DIFFERENT WORDING, SAME STRATEGY
  // -------------------------------------------------------------
  test('Test 4 — Detects strategic collision for concepts with different wording but identical strategy', () => {
    const c1 = { ...createBaseConcept('cw1', 'Save Money Today'), hook: 'Save money on your family dinner.' };
    const c2 = { ...createBaseConcept('cw2', 'Get More For Less'), hook: 'Get more food for less price.' };

    const similarity = ConceptSimilarityService.calculateStrategicSimilarity(c1, c2);
    expect(similarity).toBeGreaterThanOrEqual(CONCEPT_SIMILARITY_THRESHOLD);
  });

  // -------------------------------------------------------------
  // TEST 5 & 6 — FORMAT AND PLATFORM ARE NOT DIFFERENTIATION
  // -------------------------------------------------------------
  test('Test 5 & 6 — Format or Platform differences alone do NOT make concepts distinct', () => {
    const cReel = createBaseConcept('c_reel', 'Reel Version');
    cReel.recommendedFormat = { primary: 'Short Reel' };
    cReel.recommendedPlatform = { primary: 'Instagram Reels' };

    const cStatic = createBaseConcept('c_static', 'Static Version');
    cStatic.recommendedFormat = { primary: 'Static Poster' };
    cStatic.recommendedPlatform = { primary: 'Facebook' };

    const similarity = ConceptSimilarityService.calculateStrategicSimilarity(cReel, cStatic);
    expect(similarity).toBeGreaterThanOrEqual(CONCEPT_SIMILARITY_THRESHOLD);
  });

  // -------------------------------------------------------------
  // TEST 7 — STRATEGIC FINGERPRINT EXTRACTION
  // -------------------------------------------------------------
  test('Test 7 — Extracts complete strategic fingerprint & maps territory', () => {
    const concept = createBaseConcept('c_fp', 'Everyone Sorted');
    const fingerprint = StrategicFingerprintService.extractFingerprint(concept);
    const territory = StrategicFingerprintService.deriveTerritory(concept);

    expect(fingerprint.coreInsight).toBe(concept.humanInsight);
    expect(fingerprint.emotionalTerritory).toContain('Relief');
    expect(territory.name).toBe('Decision Relief');
  });
});

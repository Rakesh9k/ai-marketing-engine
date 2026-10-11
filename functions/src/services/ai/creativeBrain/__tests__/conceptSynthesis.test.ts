/**
 * PHASE 13 — Concept Synthesis Engine Unit & Integration Tests
 * Validates candidate generation, scoring rubrics, hard gates, diversity pass,
 * evidence traceability, asset awareness, and golden test scenarios across verticals.
 */

import { ConceptSynthesisService } from '../synthesis/conceptSynthesisService';
import { ConceptScoringService, MIN_CONCEPT_SCORE } from '../synthesis/conceptScoringService';
import { ConceptDiversityService } from '../synthesis/conceptDiversityService';
import type { ConceptSynthesisInput, CreativeConcept } from '../synthesis/synthesis.types';
import type { BusinessContextContract, CampaignIntentContract } from '../types/creativeArchitecture.types';

describe('PHASE 13 — Concept Synthesis Engine Test Suite', () => {
  let synthesisService: ConceptSynthesisService;

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
      forbiddenWords: ['cheap', 'discount-bin', 'low-grade'],
      allowedClaims: ['Family Combos', 'Fresh Ingredients Daily', 'Authentic Recipes'],
    },
    verifiedEvidence: {
      hasTestimonials: true,
      hasReviewCount: true,
      reviewRating: 4.8,
      hasStatedExpiry: false,
      hasInventoryLimit: false,
      verifiedClaims: ['4.8 Star Rated', 'Serving Kondapur since 2018'],
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
    name: 'Weekend Family Relief',
    definition: 'Relieving family decision fatigue with a complete combo',
    strategicPurpose: 'Eliminate decision stress during weekend lunch',
    coreInsight: 'Weekend dining should feel relaxing, but choosing something everyone agrees on creates decision fatigue for parents.',
    strategicProblem: 'Parents are exhausted managing competing food preferences on weekends.',
    desiredAudienceShift: 'Shift from decision fatigue to instant ordering relief with one complete family combo.',
    recommendedAngle: 'Position the Family Combo as the single zero-debate solution that satisfies everyone.',
    customerTension: 'Parents want family togetherness without food choice arguments.',
    productOrService: 'Weekend Family Feast Combo',
    offer: 'Family Feast Combo ₹699',
    audienceSituationIds: [],
    insightIds: [],
    objectiveTypes: [],
    psychologyIds: [],
    mechanismIds: [],
    strengths: [],
    weaknesses: [],
    risks: [],
    evidence: [],
    assumptions: [],
    confidence: 'HIGH',
    status: 'ACTIVE',
  };

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_weekend_001',
    businessBrain: mockBusinessBrain,
    campaignIntent: mockCampaignIntent,
    creativeOpportunity: mockOpportunity,
    creativeBrainAnswers: {
      product: 'Weekend Family Feast Combo',
      audience: 'Young families in Kondapur',
      problem: 'Decision fatigue during weekend lunch',
      desire: 'Zero debate family meal',
      emotionalTerritory: 'Relief + Togetherness',
      offer: 'Family Feast Combo ₹699',
    },
  };

  beforeEach(() => {
    synthesisService = new ConceptSynthesisService();
  });

  // -------------------------------------------------------------
  // 1. INPUT VALIDATION TESTS
  // -------------------------------------------------------------
  describe('1. Input Validation', () => {
    test('Throws error if Business Brain is missing', async () => {
      const invalidInput = { ...validInput, businessBrain: undefined as any };
      await expect(synthesisService.synthesizeConcepts(invalidInput)).rejects.toThrow(
        'Business Brain is required'
      );
    });

    test('Throws error if Creative Opportunity is missing', async () => {
      const invalidInput = { ...validInput, creativeOpportunity: undefined as any };
      await expect(synthesisService.synthesizeConcepts(invalidInput)).rejects.toThrow(
        'Creative Opportunity is required'
      );
    });
  });

  // -------------------------------------------------------------
  // 2. CONCEPT GENERATION & QUANTITY TESTS
  // -------------------------------------------------------------
  describe('2. Concept Generation Targets', () => {
    test('Generates default target of 3 concepts for standard valid input', async () => {
      const result = await synthesisService.synthesizeConcepts(validInput);
      expect(result.concepts.length).toBeGreaterThanOrEqual(2);
      expect(result.concepts.length).toBeLessThanOrEqual(5);
      expect(result.synthesisMetadata.acceptedCount).toEqual(result.concepts.length);
      expect(result.synthesisMetadata.diversityChecked).toBe(true);
    });

    test('Each returned concept contains all required Phase 13 fields', async () => {
      const result = await synthesisService.synthesizeConcepts(validInput);
      for (const concept of result.concepts) {
        expect(concept.id).toBeDefined();
        expect(concept.name).toBeTruthy();
        expect(concept.oneLineIdea).toBeTruthy();
        expect(concept.humanInsight).toBeTruthy();
        expect(concept.whyThisBusiness).toBeTruthy();
        expect(concept.whyThisAudience).toBeTruthy();
        expect(concept.emotionalResponse.primary).toBeTruthy();
        expect(concept.hook).toBeTruthy();
        expect(concept.creativeMechanism.name).toBeTruthy();
        expect(concept.visualDirection).toBeTruthy();
        expect(concept.storyDirection).toBeTruthy();
        expect(concept.offerIntegration).toBeTruthy();
        expect(concept.cta).toBeTruthy();
        expect(concept.recommendedFormat.primary).toBeTruthy();
        expect(concept.recommendedPlatform.primary).toBeTruthy();
        expect(concept.requiredAssets.required.length).toBeGreaterThan(0);
        expect(concept.whyMitraRecommendsIt).toBeTruthy();
        expect(concept.score.total).toBeGreaterThanOrEqual(MIN_CONCEPT_SCORE);
      }
    });
  });

  // -------------------------------------------------------------
  // 3. SCORING & HARD GATES TESTS
  // -------------------------------------------------------------
  describe('3. Scoring Rubric & Hard Gates', () => {
    test('Rejects concept containing forbidden brand words', () => {
      const candidate: CreativeConcept = {
        id: 'c_test_1',
        name: 'Cheap Discount-Bin Feast',
        oneLineIdea: 'Get cheap discount-bin food for the family.',
        humanInsight: 'Parents want cheap options.',
        whyThisBusiness: 'We offer low prices.',
        whyThisAudience: 'Budget seekers.',
        emotionalResponse: { primary: 'Relief' },
        hook: 'Cheap discount-bin food today!',
        creativeMechanism: { name: 'Price Cut', explanation: 'Slashing prices.' },
        visualDirection: 'Show food.',
        storyDirection: 'Show food -> Buy.',
        offerIntegration: 'Cheap price',
        cta: 'Order now',
        recommendedFormat: { primary: 'Poster' },
        recommendedPlatform: { primary: 'Instagram' },
        requiredAssets: { required: ['Photo'], recommended: [], optional: [] },
        whyMitraRecommendsIt: 'Budget deal.',
        score: { total: 0, strategicRelevance: 0, audienceRelevance: 0, businessFit: 0, humanInsight: 0, creativeDistinctiveness: 0, emotionalStrength: 0, executionFeasibility: 0, offerIntegration: 0 },
        evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
        creativeBankReferences: [],
        status: 'recommended',
      };

      const evalResult = ConceptScoringService.evaluateConcept(candidate, validInput);
      expect(evalResult.passedHardGates).toBe(false);
      expect(evalResult.hardFailures).toContain('Contains forbidden brand word: "cheap"');
      expect(evalResult.meetsThreshold).toBe(false);
    });

    test('Rejects concept with invented unverified claims when verified evidence is absent', () => {
      const noProofBusiness = {
        ...mockBusinessBrain,
        verifiedEvidence: { ...mockBusinessBrain.verifiedEvidence, hasTestimonials: false },
      };

      const candidate: CreativeConcept = {
        id: 'c_test_2',
        name: 'Guaranteed #1 Best in World Biryani',
        oneLineIdea: 'Our food is 100% guaranteed #1 best in world.',
        humanInsight: 'People want the best food.',
        whyThisBusiness: 'We are #1.',
        whyThisAudience: 'Foodies.',
        emotionalResponse: { primary: 'Excitement' },
        hook: '100% guaranteed #1 best in world biryani!',
        creativeMechanism: { name: 'Hyperbole', explanation: 'Making claims.' },
        visualDirection: 'Show food.',
        storyDirection: 'Show food.',
        offerIntegration: 'Free offer',
        cta: 'Order now',
        recommendedFormat: { primary: 'Poster' },
        recommendedPlatform: { primary: 'Instagram' },
        requiredAssets: { required: ['Photo'], recommended: [], optional: [] },
        whyMitraRecommendsIt: 'Top claims.',
        score: { total: 0, strategicRelevance: 0, audienceRelevance: 0, businessFit: 0, humanInsight: 0, creativeDistinctiveness: 0, emotionalStrength: 0, executionFeasibility: 0, offerIntegration: 0 },
        evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
        creativeBankReferences: [],
        status: 'recommended',
      };

      const evalResult = ConceptScoringService.evaluateConcept(candidate, {
        ...validInput,
        businessBrain: noProofBusiness,
      });

      expect(evalResult.passedHardGates).toBe(false);
      expect(evalResult.hardFailures.some((f) => f.includes('unverified claim'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 4. DIVERSITY CHECK TESTS
  // -------------------------------------------------------------
  describe('4. Concept Diversity Pass', () => {
    test('Eliminates near-duplicate concepts and keeps the higher-scoring variant', () => {
      const conceptA: CreativeConcept = {
        id: 'ca',
        name: 'Everyone Sorted',
        oneLineIdea: 'Turn the decision stress into relief with one meal.',
        humanInsight: 'Parents want simple family meal decisions.',
        whyThisBusiness: 'Royal Spice combo.',
        whyThisAudience: 'Kondapur families.',
        emotionalResponse: { primary: 'Relief' },
        hook: 'Everyone wants something different. This is why they all say yes.',
        creativeMechanism: { id: 'm1', name: 'Decision Elimination', explanation: 'Eliminate decision stress.' },
        visualDirection: 'Family table.',
        storyDirection: 'Order -> Eat.',
        offerIntegration: 'Family Combo ₹699',
        cta: 'Order now',
        recommendedFormat: { primary: 'Reel' },
        recommendedPlatform: { primary: 'Instagram' },
        requiredAssets: { required: ['Photo'], recommended: [], optional: [] },
        whyMitraRecommendsIt: 'High score.',
        score: { total: 88, strategicRelevance: 18, audienceRelevance: 14, businessFit: 14, humanInsight: 14, creativeDistinctiveness: 13, emotionalStrength: 8, executionFeasibility: 4, offerIntegration: 3 },
        evidence: { businessBrain: [], creativeBrain: [], creativeOpportunity: [], creativeBank: [] },
        creativeBankReferences: [],
        status: 'recommended',
      };

      const conceptB: CreativeConcept = { ...conceptA, id: 'cb', name: 'Everyone Sorted Duplicate', score: { ...conceptA.score, total: 72 } };

      const filtered = ConceptDiversityService.filterDiverseConcepts([conceptA, conceptB]);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('ca');
    });
  });

  // -------------------------------------------------------------
  // 5. EVIDENCE TRACEABILITY & ASSET AWARENESS TESTS
  // -------------------------------------------------------------
  describe('5. Evidence Traceability & Asset Awareness', () => {
    test('Populates complete evidence structure for every synthesized concept', async () => {
      const result = await synthesisService.synthesizeConcepts(validInput);
      for (const concept of result.concepts) {
        expect(concept.evidence.businessBrain.length).toBeGreaterThan(0);
        expect(concept.evidence.creativeBrain.length).toBeGreaterThan(0);
        expect(concept.evidence.creativeOpportunity.length).toBeGreaterThan(0);
        expect(concept.evidence.creativeBank.length).toBeGreaterThan(0);
      }
    });

    test('Classifies required, recommended, and optional assets appropriately', async () => {
      const result = await synthesisService.synthesizeConcepts(validInput);
      for (const concept of result.concepts) {
        expect(Array.isArray(concept.requiredAssets.required)).toBe(true);
        expect(Array.isArray(concept.requiredAssets.recommended)).toBe(true);
        expect(Array.isArray(concept.requiredAssets.optional)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------
  // 6. GOLDEN TEST CASES ACROSS VERTICALS
  // -------------------------------------------------------------
  describe('6. Golden Test Cases Across Verticals', () => {
    test('Golden Scenario: Salon Hair & Skin Transformation', async () => {
      const salonInput: ConceptSynthesisInput = {
        campaignId: 'camp_salon_001',
        businessBrain: {
          ...mockBusinessBrain,
          businessId: 'biz_salon_001',
          name: 'Glow & Grace Unisex Salon',
          industry: 'salon',
          subVertical: 'hair_skin_care',
          positioning: 'Premium skin diagnostic & hair transformation specialists',
        },
        campaignIntent: {
          ...mockCampaignIntent,
          product: 'Hydra-Glow Facial & Hair Spa Combo',
          offerDetails: { hasOffer: true, offerTitle: 'Express Glow Trial ₹999', offerPrice: 999 },
        },
        creativeOpportunity: {
          id: 'opp_salon_trial',
          opportunityId: 'opp_salon_trial',
          coreInsight: 'Clients fear overpaying for skin treatments that do not suit their skin type.',
          strategicProblem: 'Uncertainty about treatment effectiveness and price transparency.',
          desiredAudienceShift: 'Shift from hesitation to booking a risk-free 15-minute skin diagnostic.',
          recommendedAngle: 'Lead with complimentary skin analysis before treatment commitment.',
        },
      };

      const result = await synthesisService.synthesizeConcepts(salonInput);
      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.concepts[0].whyThisBusiness).toContain('Glow & Grace Unisex Salon');
    });

    test('Golden Scenario: Real Estate Townships', async () => {
      const realEstateInput: ConceptSynthesisInput = {
        campaignId: 'camp_re_001',
        businessBrain: {
          ...mockBusinessBrain,
          businessId: 'biz_re_001',
          name: 'Greenfield Gated Townships',
          industry: 'real_estate',
          subVertical: 'residential_township',
          positioning: 'Clear title 2BHK & 3BHK luxury apartments with 15-minute tech park connectivity',
        },
        campaignIntent: {
          ...mockCampaignIntent,
          product: '2BHK Luxury Smart Home',
          offerDetails: { hasOffer: true, offerTitle: 'Zero Registration Fee Month', offerPrice: 0 },
        },
        creativeOpportunity: {
          id: 'opp_re_commute',
          opportunityId: 'opp_re_commute',
          coreInsight: 'First-time home buyers fear long daily commute times and hidden legal issues.',
          strategicProblem: 'Commute uncertainty and legal paperwork hesitation.',
          desiredAudienceShift: 'Shift from commuting anxiety to experiencing peak-hour transit live.',
          recommendedAngle: 'Offer a VIP commute trial and clear title inspection site tour.',
        },
      };

      const result = await synthesisService.synthesizeConcepts(realEstateInput);
      expect(result.concepts.length).toBeGreaterThan(0);
      expect(result.concepts[0].whyThisBusiness).toContain('Greenfield Gated Townships');
    });
  });
});

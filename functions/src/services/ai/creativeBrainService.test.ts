import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CreativeBrainService } from './creativeBrainService';
import { CREATIVE_BRAIN_CONFIG, CreativeBlueprintSchema, type CreativeBrainInput } from './creativeBrain.types';
import * as aiIndex from './index';

// Mock generateStructuredText from aiIndex
jest.mock('./index', () => {
  const actual = jest.requireActual('./index') as any;
  return {
    ...actual,
    generateStructuredText: jest.fn(),
  };
});

describe('CreativeBrainService — Gate 2A Unit Tests', () => {
  let service: CreativeBrainService;

  const mockRestaurantInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Hyderabadi Spice House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi Biryani and Mughlai dishes',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
        contact: { phone: '+919876543210', whatsapp: '+919876543210' },
        industry: 'restaurant_food',
        subcategory: 'biryani',
      },
      products: [
        {
          productId: 'prod-1',
          name: 'Special Mutton Biryani',
          description: 'Aromatic basmati rice cooked with tender mutton',
          price: 399,
          category: 'main',
          tags: ['biryani', 'spicy'],
          attributes: { veg: false, spiceLevel: 'spicy' },
        },
      ],
      brand: {
        tone: 'friendly',
        personality: 'Authentic and traditional',
        visualPreferences: 'Rich warm colors with traditional copper handi',
        colors: { primary: '#E84D1A', secondary: '#FFD700', accent: '#8B0000' },
        fonts: { heading: 'Playfair', body: 'Inter' },
      },
      audience: {
        targetCustomer: 'IT Professionals and Biryani lovers in Hitec City',
        ageRange: { min: 22, max: 45 },
        localities: ['Hitec City', 'Madhapur', 'Gachibowli'],
        preferences: 'Prefers quick lunch and authentic taste',
      },
      localization: {
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        regionalStyle: 'hyderabadi',
        slangIntensity: 'moderate',
        languageMixing: 'natural',
      },
      businessRules: {
        openingHours: { mon: { open: '11:00', close: '23:00' } },
        deliveryRadiusKm: 7,
        minimumOrder: 200,
        offerValidityRules: 'Valid on weekends',
        pricingRules: 'Fixed prices',
      },
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    },
    vertical: 'restaurant',
    intent: {
      businessId: 'biz-restaurant-1',
      objective: 'weekend_offer',
      offer: {
        headline: 'Weekend Biryani Feast - 20% OFF',
        price: 399,
        originalPrice: 499,
        type: 'percentage',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-12T23:59:59Z',
      },
      duration: { start: '2026-10-10T00:00:00Z', end: '2026-10-12T23:59:59Z' },
      audience: { localities: ['Hitec City', 'Madhapur'] },
      cta: 'order_whatsapp',
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Hitec City',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'moderate',
        audienceDescription: 'IT professionals seeking weekend biryani feast',
        brandTone: 'friendly',
        campaignStyle: 'funny',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: {
      businessSummary: 'Popular Hyderabadi biryani restaurant located in Hitec City.',
      businessFacts: [
        { category: 'identity', fact: 'Hyderabadi Spice House', source: 'brain', criticality: 'high' },
        { category: 'pricing', fact: 'Biryani ₹399', source: 'brain', criticality: 'high' },
      ],
      missingInformation: [],
      constraints: [],
      verticalContext: {},
    },
    productUnderstanding: {
      productSummary: 'Special Mutton Biryani',
      productFacts: [{ fact: 'Made with authentic spices', source: 'metadata', criticality: 'high' }],
      visualAttributes: {
        dishName: 'Special Mutton Biryani',
        platingStyle: 'Copper Handi',
        colorPalette: ['#E84D1A', '#FFD700'],
        ambianceCues: ['Warm lighting', 'Traditional spices'],
        keyVisualElements: ['Garnished biryani in handi', 'Saffron rice'],
        suggestedCompositions: ['Hero top-down shot'],
      },
      missingInformation: [],
      marketingAngles: ['Authentic taste', 'Weekend special', 'Family feast', 'Quick delivery', 'IT lunch favorite'],
    },
    memory: {
      preferences: [],
      feedback: [],
    },
    conflictConstraints: {
      nonNegotiableRules: {},
      directives: [],
      detectedConflictsCount: 0,
    },
  };

  const mockSalonInput: CreativeBrainInput = {
    ...mockRestaurantInput,
    vertical: 'salon',
    businessBrain: {
      ...mockRestaurantInput.businessBrain,
      identity: {
        ...mockRestaurantInput.businessBrain.identity,
        name: 'Glow Beauty Lounge',
        category: 'salon',
        industry: 'salon_beauty',
      },
    },
    intent: {
      ...mockRestaurantInput.intent,
      businessId: 'biz-salon-1',
      objective: 'appointment_promotion',
      cta: 'book_appointment',
      offer: {
        headline: 'Bridal Glow Facial - 30% OFF',
        price: 1499,
        originalPrice: 1999,
        type: 'fixed',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-20T23:59:59Z',
      },
    },
  };

  const mockRealEstateInput: CreativeBrainInput = {
    ...mockRestaurantInput,
    vertical: 'real_estate',
    businessBrain: {
      ...mockRestaurantInput.businessBrain,
      identity: {
        ...mockRestaurantInput.businessBrain.identity,
        name: 'Skyline Heights Realty',
        category: 'real_estate',
        industry: 'real_estate',
      },
    },
    intent: {
      ...mockRestaurantInput.intent,
      businessId: 'biz-re-1',
      objective: 'new_listing',
      cta: 'call_now',
      offer: {
        headline: 'Luxury 3BHK Apartment - Open House This Sunday',
        price: 8500000,
        type: 'fixed',
        validityStart: '2026-10-10T00:00:00Z',
        validityEnd: '2026-10-15T23:59:59Z',
      },
    },
  };

  const mockLLMOpportunity = {
    opportunityId: 'opp-100',
    vertical: 'restaurant',
    problem: 'Weekend diners face long waiting times at biryani spots',
    tension: 'Craving authentic biryani vs reluctance to stand in long queues',
    motivation: 'Convenient weekend dining at home or reserved tables',
    occasion: 'Sunday Family Feast',
    audienceInsight: 'IT workers in Hitec City want premium biryani without hassle',
    opportunityStatement: 'Leverage 20% weekend discount and instant WhatsApp ordering for biryani lovers.',
    desiredBusinessOutcome: 'Drive 35% more WhatsApp delivery orders on weekends',
    desiredAudienceResponse: 'Eagerness to order biryani for family lunch immediately',
    supportingSignals: ['High weekend demand', 'Verified ₹399 price'],
    constraints: {
      maxTextDensity: 'medium' as const,
      toneBoundary: 'friendly and authentic',
      factualLimits: ['Price: ₹399'],
    },
    confidence: 88,
    rationale: 'Strong alignment between customer craving and WhatsApp delivery convenience.',
  };

  const mockLLMConcepts = {
    concepts: [
      {
        conceptId: 'concept-1',
        title: 'Skip the Queue, Enjoy the Feast',
        angle: 'Convenience and Speed',
        coreIdea: 'Highlight instant WhatsApp ordering for weekend biryani',
        hookDirection: 'Craving authentic mutton biryani this Sunday?',
        emotionalDriver: 'friendly' as const,
        audienceFraming: 'Busy IT professionals and families',
        message: 'Order Special Mutton Biryani at ₹399 with instant WhatsApp delivery.',
        offerFraming: '20% OFF Weekend Special (₹399 instead of ₹499)',
        ctaDirection: 'Order on WhatsApp now',
        visualPremise: {
          emphasis: 'product-led' as const,
          composition: 'hero-product' as const,
          mood: 'warm and appetizing',
          compositionHints: ['Steaming biryani handi close-up'],
        },
        differentiation: 'Authentic Hyderabadi taste delivered in 30 mins',
        expectedResponse: 'Customer orders immediately via WhatsApp',
        templateId: 'festival-offer-v1',
      },
      {
        conceptId: 'concept-2',
        title: 'Authentic Sunday Family Celebration',
        angle: 'Emotional & Family Gathering',
        coreIdea: 'Bring authentic Hyderabadi dining home for Sunday lunch',
        hookDirection: 'Make Sunday lunch unforgettable with family',
        emotionalDriver: 'premium' as const,
        audienceFraming: 'Families in Hitec City',
        message: 'Share rich Mutton Biryani with your loved ones.',
        offerFraming: 'Special Weekend Price ₹399',
        ctaDirection: 'Order for Family Lunch',
        visualPremise: {
          emphasis: 'image-led' as const,
          composition: 'editorial' as const,
          mood: 'festive and joyful',
          compositionHints: ['Family gathered around dining table with biryani'],
        },
        differentiation: 'Traditional copper handi presentation',
        expectedResponse: 'Plan family weekend lunch order',
        templateId: 'local-story-v1',
      },
      {
        conceptId: 'concept-3',
        title: 'Unbeatable Weekend Value Deal',
        angle: 'Direct Price Value',
        coreIdea: 'Focus directly on ₹399 price point and 20% savings',
        hookDirection: 'Special Mutton Biryani at just ₹399!',
        emotionalDriver: 'bold' as const,
        audienceFraming: 'Value-conscious foodies',
        message: 'Save ₹100 on every Mutton Biryani order this weekend.',
        offerFraming: '₹399 (Was ₹499)',
        ctaDirection: 'Claim Offer',
        visualPremise: {
          emphasis: 'offer-led' as const,
          composition: 'split-composition' as const,
          mood: 'high-energy promotional',
          compositionHints: ['Large ₹399 price tag next to biryani bowl'],
        },
        differentiation: 'Highest quality mutton at unbeatable price',
        expectedResponse: 'Click CTA to claim deal',
        templateId: 'value-promo-v1',
      },
    ],
  };

  beforeEach(() => {
    service = new CreativeBrainService();
    jest.mocked(aiIndex.generateStructuredText).mockReset();
  });

  // Test 1: Valid Restaurant Input
  it('Test 1: should successfully process valid restaurant input and return CreativeBrainResult', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(false);
    expect(result.blueprint.businessId).toBe(mockRestaurantInput.intent.businessId);
    expect(result.blueprint.winningConcept.conceptId).toBe('concept-1');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('order_whatsapp');
  });

  // Test 2: Valid Salon Input
  it('Test 2: should successfully process valid salon input', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce({ ...mockLLMOpportunity, vertical: 'salon' } as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockSalonInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.opportunity.vertical).toBe('salon');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('book_appointment');
  });

  // Test 3: Valid Real Estate Input
  it('Test 3: should successfully process valid real estate input', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce({ ...mockLLMOpportunity, vertical: 'real_estate' } as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockRealEstateInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.opportunity.vertical).toBe('real_estate');
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('call_now');
  });

  // Test 4: Conversion Campaign
  it('Test 4: should handle conversion campaign intent', async () => {
    const input: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: { ...mockRestaurantInput.intent, objective: 'appointment_promotion', cta: 'book_table' },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(input);
    expect(result.success).toBe(true);
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('book_table');
  });

  // Test 5: Awareness Campaign
  it('Test 5: should handle awareness campaign intent', async () => {
    const input: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: { ...mockRestaurantInput.intent, objective: 'brand_awareness', cta: 'view_menu' },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(input);
    expect(result.success).toBe(true);
    expect(result.blueprint.strategyDirectives.ctaPrimary).toBe('view_menu');
  });

  // Test 6: Promotional Campaign
  it('Test 6: should handle promotional campaign intent', async () => {
    const input: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: { ...mockRestaurantInput.intent, objective: 'discount' },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(input);
    expect(result.success).toBe(true);
    expect(result.blueprint.strategyDirectives.angle).toBeDefined();
  });

  // Test 7: Missing Optional Offer Description/Original Price
  it('Test 7: should handle missing optional offer fields gracefully', async () => {
    const input: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: {
        ...mockRestaurantInput.intent,
        offer: {
          headline: 'Special Lunch Pack',
          price: 249,
          type: 'fixed',
          validityStart: '2026-10-10T00:00:00Z',
          validityEnd: '2026-10-12T23:59:59Z',
        },
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(input);
    expect(result.success).toBe(true);
    expect(result.blueprint.visualDirectives.textOverlayRules.showOriginalPriceStrikethrough).toBe(false);
  });

  // Test 8: Conflicting Historical Preferences
  it('Test 8: should apply penalties for avoided templates and bonuses for preferred templates', async () => {
    const inputWithPreferences: CreativeBrainInput = {
      ...mockRestaurantInput,
      memory: {
        preferences: [
          {
            preferenceId: 'p1',
            businessId: 'biz-1',
            templateId: 'festival-offer-v1',
            preference: 'avoided',
            confidence: 90,
            evidenceCount: 5,
            positiveEvidenceCount: 0,
            negativeEvidenceCount: 5,
            source: 'explicit_user',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
          {
            preferenceId: 'p2',
            businessId: 'biz-1',
            templateId: 'value-promo-v1',
            preference: 'preferred',
            confidence: 95,
            evidenceCount: 8,
            positiveEvidenceCount: 8,
            negativeEvidenceCount: 0,
            source: 'explicit_user',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
        feedback: [],
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(inputWithPreferences);
    expect(result.success).toBe(true);
    // Concept 3 (template 'value-promo-v1') should win over Concept 1 ('festival-offer-v1') because concept 1 is avoided!
    expect(result.blueprint.winningConcept.templateId).toBe('value-promo-v1');
  });

  // Test 9: Malformed LLM Output
  it('Test 9: should trigger fallback blueprint on malformed LLM response', async () => {
    jest.mocked(aiIndex.generateStructuredText).mockRejectedValueOnce(new Error('JSON validation error: missing problem'));

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.blueprint.winningConcept.conceptId).toBe('concept-fallback');
  });

  // Test 10: LLM Timeout
  it('Test 10: should trigger fallback blueprint on LLM timeout', async () => {
    jest.mocked(aiIndex.generateStructuredText).mockRejectedValueOnce(new Error('Operation timed out after 90000ms'));

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.error?.message).toContain('timed out');
  });

  // Test 11: Provider Failure
  it('Test 11: should trigger fallback blueprint on API provider failure', async () => {
    jest.mocked(aiIndex.generateStructuredText).mockRejectedValueOnce(new Error('Gemini API 503 Service Unavailable'));

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(true);
  });

  // Test 12: Low Scoring Concepts (< 70 Pts)
  it('Test 12: should trigger fallback when all generated concepts score below 70 Pts', async () => {
    const lowScoringConcepts = {
      concepts: [
        {
          ...mockLLMConcepts.concepts[0],
          offerFraming: 'Free Special Biryani Feast', // Truth violation: Claiming Free when price is ₹399 -> totalScore 0
          templateId: 'unknown-invalid-template-xyz',
          emotionalDriver: 'serious' as const,
        },
      ],
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(lowScoringConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);
    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(true);
  });

  // Test 13: Factual Violation (Hard Gating)
  it('Test 13: should hard-gate concept to 0 score when invalid CTA is forced in concept', async () => {
    const invalidCtaInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: {
        ...mockRestaurantInput.intent,
        cta: 'invalid_cta_enum' as any, // Mismatch with allowed vertical CTAs
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(invalidCtaInput);

    expect(result.success).toBe(true);
    expect(result.fallbackTriggered).toBe(true); // Hard gate forces 0 score -> fallback
  });

  // Test 14: Missing Product Context
  it('Test 14: should generate blueprint even when productContext is undefined', async () => {
    const noProductInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      productContext: undefined,
      productUnderstanding: undefined,
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(noProductInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.strategyDirectives.keyMessages.length).toBe(5);
  });

  // Test 15: Missing Audience Details
  it('Test 15: should populate safe audience defaults when audience details are minimal', async () => {
    const minimalAudienceInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: {
        ...mockRestaurantInput.intent,
        audience: { localities: ['Hyderabad'] },
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(minimalAudienceInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.opportunity.audienceInsight).toBeDefined();
  });

  // Test 16: Fallback Blueprint Structure
  it('Test 16: buildFallbackBlueprint should return valid non-null blueprint matching schema', () => {
    const fallback = service.buildFallbackBlueprint(mockRestaurantInput, 'Test Fallback Trigger');

    expect(fallback.blueprintId).toContain('bp-fallback');
    expect(fallback.winningConcept.conceptId).toBe('concept-fallback');
    expect(fallback.strategyDirectives.angle).toBe(mockRestaurantInput.intent.offer.headline);
    expect(fallback.strategyDirectives.keyMessages).toHaveLength(5);

    const parseResult = CreativeBlueprintSchema.safeParse(fallback);
    expect(parseResult.success).toBe(true);
  });

  // Test 17: Blueprint Schema Validation
  it('Test 17: should produce a CreativeBlueprint that strictly passes CreativeBlueprintSchema validation', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.success).toBe(true);
    const parseResult = CreativeBlueprintSchema.safeParse(result.blueprint);
    expect(parseResult.success).toBe(true);
  });

  // Test 18: Concept Diversity
  it('Test 18: should require generated concepts to have diverse narrative angles and visual emphasis', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const rawCandidates = await service.generateConceptCandidates(mockLLMOpportunity as any, mockRestaurantInput);

    const angles = new Set(rawCandidates.map((c) => c.angle));
    const emphases = new Set(rawCandidates.map((c) => c.visualPremise.emphasis));

    expect(angles.size).toBeGreaterThanOrEqual(2);
    expect(emphases.size).toBeGreaterThanOrEqual(2);
  });

  // Test 19: Deterministic Scoring Weights & Hard Gating
  it('Test 19: should deterministically score concepts according to configured weights', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const scored = await service.scoreConcepts(mockLLMConcepts.concepts as any, mockRestaurantInput);

    expect(scored[0]!.score.totalScore).toBeGreaterThanOrEqual(70);
    expect(scored[0]!.score.breakdown.truthAlignment).toBe(CREATIVE_BRAIN_CONFIG.SCORING_WEIGHTS.TRUTH_ALIGNMENT_MAX);
    expect(scored[0]!.score.breakdown.brandFit).toBeGreaterThan(0);
    expect(scored[0]!.score.breakdown.audienceRelevance).toBeGreaterThan(0);
  });

  // Test 20: Structured Trace Generation
  it('Test 20: should include complete structured trace metadata in blueprint without raw chain-of-thought', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const result = await service.evaluateAndFormBlueprint(mockRestaurantInput);

    expect(result.blueprint.trace).toBeDefined();
    expect(result.blueprint.trace.evaluatedConceptsCount).toBe(3);
    expect(result.blueprint.trace.winningConceptId).toBe('concept-1');
    expect(result.blueprint.trace.winningScore).toBeGreaterThanOrEqual(70);
    expect(result.blueprint.trace.reasoningSummary).toBeDefined();
    // Verify trace is structured metadata and does NOT expose chain of thought
    expect(result.blueprint.trace.reasoningSummary).not.toContain('think');
  });
});

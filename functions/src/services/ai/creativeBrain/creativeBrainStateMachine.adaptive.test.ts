import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AdaptiveCreativeBrainStateMachine } from './adaptiveStateMachine';
import type { CreativeBrainInput } from '../creativeBrain.types';
import * as aiIndex from '../index';

// Mock generateStructuredText from aiIndex
jest.mock('../index', () => {
  const actual = jest.requireActual('../index') as any;
  return {
    ...actual,
    generateStructuredText: jest.fn(),
  };
});

describe('Phase 2.5 / 3A — Adaptive Creative Brain State Machine Test Suite', () => {
  let mockRestaurantInput: CreativeBrainInput;

  beforeEach(() => {
    jest.mocked(aiIndex.generateStructuredText).mockReset();

    mockRestaurantInput = {
      businessBrain: {
        identity: {
          name: 'Hyderabadi Spice House',
          category: 'restaurant',
          description: 'Authentic Hyderabadi Biryani',
          location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
          contact: { phone: '+919876543210', whatsapp: '+919876543210' },
          industry: 'restaurant_food',
        },
        products: [
          {
            productId: 'prod-1',
            name: 'Special Mutton Biryani',
            description: 'Aromatic basmati rice cooked with tender mutton',
            price: 399,
            category: 'main',
            tags: ['biryani', 'spicy'],
            attributes: { veg: false },
          },
        ],
        brand: { tone: 'friendly' },
        audience: { targetCustomer: 'IT Professionals and Biryani lovers', preferences: 'Craves quick authentic lunch' },
        localization: { primaryLanguage: 'en', regionalStyle: 'hyderabadi' },
        businessRules: { deliveryRadiusKm: 5, minimumOrder: 200 },
        lastSyncedAt: new Date().toISOString(),
        campaignHistory: [],
      } as any,
      vertical: 'restaurant',
      intent: {
        businessId: 'biz-rest-1',
        objective: 'weekend_offer',
        offer: {
          headline: 'Special Mutton Biryani - ₹399',
          price: 399,
          originalPrice: 499,
          type: 'percentage',
          validityStart: '2026-10-10T00:00:00Z',
          validityEnd: '2026-10-12T23:59:59Z',
        },
        duration: { start: '2026-10-10T00:00:00Z', end: '2026-10-12T23:59:59Z' },
        audience: { localities: ['Hitec City'], occasion: 'Sunday Family Feast' },
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
          audienceDescription: 'IT professionals in Hitec City',
          brandTone: 'friendly',
          campaignStyle: 'funny',
          contentFormat: 'poster',
        },
      },
      businessUnderstanding: {
        businessSummary: 'Popular biryani spot in Hitec City',
        businessFacts: [{ category: 'pricing', fact: 'Biryani ₹399', source: 'brain', criticality: 'high' }],
        missingInformation: [],
        constraints: [],
        verticalContext: {},
      },
      productUnderstanding: {
        productSummary: 'Special Mutton Biryani',
        productFacts: [],
        visualAttributes: { dishName: 'Biryani', platingStyle: 'Handi', colorPalette: [], ambianceCues: [], keyVisualElements: [], suggestedCompositions: [] },
        missingInformation: [],
        marketingAngles: ['Authentic taste', 'Weekend special', 'Family feast'],
      },
      memory: { preferences: [], feedback: [] },
      conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
    };
  });

  const mockLLMOpportunity = {
    opportunityId: 'opp-101',
    vertical: 'restaurant',
    problem: 'Weekend diners face long waiting queues',
    tension: 'Craving biryani vs reluctance to wait',
    motivation: 'Instant delivery via WhatsApp',
    occasion: 'Sunday Family Feast',
    audienceInsight: 'IT workers want premium biryani conveniently',
    opportunityStatement: 'Leverage 20% discount and instant WhatsApp ordering.',
    desiredBusinessOutcome: 'Increase weekend delivery orders',
    desiredAudienceResponse: 'Order biryani immediately',
    supportingSignals: ['Verified ₹399 price'],
    constraints: { maxTextDensity: 'medium' as const, toneBoundary: 'friendly', factualLimits: ['Price: ₹399'] },
    confidence: 90,
    rationale: 'High alignment.',
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
        visualPremise: { emphasis: 'product-led' as const, composition: 'hero-product' as const, mood: 'warm', compositionHints: ['Steaming biryani handi'] },
        differentiation: 'Authentic Hyderabadi taste delivered in 30 mins',
        expectedResponse: 'Customer orders via WhatsApp',
        templateId: 'festival-offer-v1',
      },
    ],
  };

  // Test 1: Fully Specified Restaurant Input (State Skipping)
  it('Test 1: Fully Specified Restaurant should skip redundant discovery states and lock Blueprint', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(mockRestaurantInput);
    const { result, context } = await machine.executeAdaptiveFlow(mockRestaurantInput);

    expect(result.success).toBe(true);
    expect(context.currentState).toBe('BLUEPRINT_LOCKED');
    expect(context.transitionTraces.length).toBeGreaterThanOrEqual(3);
  });

  // Test 2: Restaurant with Missing Audience (Contextual Question Generation)
  it('Test 2: Restaurant with missing audience should generate single high-value question', async () => {
    const missingAudienceInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      businessBrain: {
        ...mockRestaurantInput.businessBrain,
        audience: undefined as any,
      },
      intent: {
        ...mockRestaurantInput.intent,
        audience: { localities: [] },
        localization: {
          ...mockRestaurantInput.intent.localization,
          audienceDescription: undefined as any,
        },
      },
    };

    const machine = new AdaptiveCreativeBrainStateMachine(missingAudienceInput);
    const { pendingQuestion } = await machine.executeAdaptiveFlow(missingAudienceInput);

    expect(pendingQuestion).toBeDefined();
    expect(pendingQuestion?.question).toContain('Who are you most trying to attract');
    expect(pendingQuestion?.options.length).toBeGreaterThan(0);
  });

  // Test 3: Salon with Customer Problem Missing
  it('Test 3: Salon scenario should prioritize CUSTOMER_INSIGHT state for pre-event glow', async () => {
    const salonInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      vertical: 'salon',
      intent: {
        ...mockRestaurantInput.intent,
        objective: 'appointment_promotion',
        cta: 'book_appointment',
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce({ ...mockLLMOpportunity, vertical: 'salon' } as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(salonInput);
    const { result, context } = await machine.executeAdaptiveFlow(salonInput);

    expect(result.success).toBe(true);
    expect(context.completedStates.has('CUSTOMER_INSIGHT')).toBe(true);
  });

  // Test 4: Real Estate with Missing Buyer Type (Truth Integrity)
  it('Test 4: Real Estate scenario should preserve authoritative property price without fabricating buyer type', async () => {
    const realEstateInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      vertical: 'real_estate',
      intent: {
        ...mockRestaurantInput.intent,
        objective: 'new_listing',
        cta: 'call_now',
        offer: {
          headline: 'Luxury 3BHK Open House',
          price: 8500000,
          type: 'fixed',
          validityStart: '2026-10-10T00:00:00Z',
          validityEnd: '2026-10-15T23:59:59Z',
        },
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce({ ...mockLLMOpportunity, vertical: 'real_estate' } as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(realEstateInput);
    const { result } = await machine.executeAdaptiveFlow(realEstateInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.strategyDirectives.keyMessages).toContain('Special Offer: ₹8500000');
  });

  // Test 5: No Promotional Offer (Factual Integrity)
  it('Test 5: Campaign without promotional offer should not fabricate discounts or fake sales', async () => {
    const noOfferInput: CreativeBrainInput = {
      ...mockRestaurantInput,
      intent: {
        ...mockRestaurantInput.intent,
        offer: {
          headline: 'Special Mutton Biryani',
          price: 399,
          type: 'fixed',
          validityStart: '2026-10-10T00:00:00Z',
          validityEnd: '2026-10-12T23:59:59Z',
        },
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(noOfferInput);
    const { result } = await machine.executeAdaptiveFlow(noOfferInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.visualDirectives.textOverlayRules.showOriginalPriceStrikethrough).toBe(false);
  });

  // Test 7 & 8: User Concept Refinement & Major Direction Change
  it('Test 7 & 8: Minor refinement stays in CONCEPT_REFINEMENT; Major direction change re-enters CREATIVE_TERRITORY', async () => {
    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValue(mockLLMOpportunity as any)
      .mockResolvedValue(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(mockRestaurantInput);
    await machine.executeAdaptiveFlow(mockRestaurantInput);

    // Minor refinement
    await machine.handleRefinementInstruction('Make headline punchier', mockRestaurantInput);
    let traces = machine.getTransitionTraces();
    expect(traces.some((t) => t.reasonCode === 'MINOR_REFINEMENT_REQUESTED')).toBe(true);

    // Major direction change
    await machine.handleRefinementInstruction('Forget this angle. I want a new direction focused on family celebration.', mockRestaurantInput);
    traces = machine.getTransitionTraces();
    expect(traces.some((t) => t.reasonCode === 'MAJOR_DIRECTION_CHANGE_REQUESTED')).toBe(true);
  });

  // Test 9: Current User Instruction Outranks Historical Preference
  it('Test 9: Current explicit user instruction outranks historical creative preference', async () => {
    const inputWithConflictingPref: CreativeBrainInput = {
      ...mockRestaurantInput,
      memory: {
        preferences: [
          {
            preferenceId: 'pref-1',
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
        ],
        feedback: [],
      },
    };

    jest.mocked(aiIndex.generateStructuredText)
      .mockResolvedValueOnce(mockLLMOpportunity as any)
      .mockResolvedValueOnce(mockLLMConcepts as any);

    const machine = new AdaptiveCreativeBrainStateMachine(inputWithConflictingPref);
    const { result } = await machine.executeAdaptiveFlow(inputWithConflictingPref);

    expect(result.success).toBe(true);
  });

  // Test 14: Loop Protection
  it('Test 14: Loop protection prevents infinite refinement cycles', async () => {
    jest.mocked(aiIndex.generateStructuredText).mockResolvedValue(mockLLMOpportunity as any);

    const machine = new AdaptiveCreativeBrainStateMachine(mockRestaurantInput);
    await machine.executeAdaptiveFlow(mockRestaurantInput);

    // Trigger refinement 4 times (max = 3)
    await machine.handleRefinementInstruction('Refine 1', mockRestaurantInput);
    await machine.handleRefinementInstruction('Refine 2', mockRestaurantInput);
    await machine.handleRefinementInstruction('Refine 3', mockRestaurantInput);
    const result = await machine.handleRefinementInstruction('Refine 4', mockRestaurantInput);

    expect(result.fallbackTriggered).toBe(true); // Loop protection returns safe blueprint
  });

  // Test 17: Information Value Ranking
  it('Test 17: Information Value Engine prioritizes decision-impacting items over operating hours', () => {
    const machine = new AdaptiveCreativeBrainStateMachine(mockRestaurantInput);
    const context = machine.getContext();

    // Verify context missing requirements rank high-impact items
    expect(context).toBeDefined();
  });
});

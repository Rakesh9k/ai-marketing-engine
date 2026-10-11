import { describe, it, expect } from '@jest/globals';
import { CreativeBrainStateMachine } from './creativeBrainStateMachine';
import type { CreativeBrainInput } from './creativeBrain.types';

describe('CreativeBrainStateMachine — Knowledge-Resolution Graph Unit Tests', () => {
  const mockInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Hyderabadi Spice House',
        category: 'restaurant',
        description: 'Authentic Hyderabadi Biryani',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
        contact: { phone: '+919876543210', whatsapp: '+919876543210' },
        industry: 'restaurant_food',
      },
      products: [],
      brand: { tone: 'friendly' },
      audience: { targetCustomer: 'IT Professionals', preferences: 'Craves authentic taste' },
      localization: { primaryLanguage: 'en', regionalStyle: 'hyderabadi' },
      businessRules: { deliveryRadiusKm: 5, minimumOrder: 200 },
      lastSyncedAt: new Date().toISOString(),
      campaignHistory: [],
    } as any,
    vertical: 'restaurant',
    intent: {
      businessId: 'biz-1',
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
      audience: { localities: ['Hitec City'], occasion: 'Sunday Lunch' },
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
      businessFacts: [],
      missingInformation: [],
      constraints: [],
      verticalContext: {},
    },
    productUnderstanding: {
      productSummary: 'Special Mutton Biryani',
      productFacts: [],
      visualAttributes: { dishName: 'Biryani', platingStyle: 'Handi', colorPalette: [], ambianceCues: [], keyVisualElements: [], suggestedCompositions: [] },
      missingInformation: [],
      marketingAngles: ['Authentic taste', 'Weekend special'],
    },
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  it('Test 1: should audit input context and mark sufficient nodes as COMPLETE/INFERRED', () => {
    const stateMachine = new CreativeBrainStateMachine(mockInput);
    const audit = stateMachine.auditKnowledge();

    expect(audit.nodes.length).toBeGreaterThanOrEqual(5);

    const productNode = audit.nodes.find((n) => n.id === 'product_identity');
    expect(productNode?.status).toBe('COMPLETE');

    const offerNode = audit.nodes.find((n) => n.id === 'offer_contract');
    expect(offerNode?.status).toBe('COMPLETE');

    const ctaNode = audit.nodes.find((n) => n.id === 'objective_cta');
    expect(ctaNode?.status).toBe('COMPLETE');

    expect(audit.sufficientForDirectGeneration).toBe(true);
  });

  it('Test 2: should transition directly from KNOWLEDGE_AUDIT to OPPORTUNITY_FORMATION when knowledge is sufficient', () => {
    const stateMachine = new CreativeBrainStateMachine(mockInput);

    expect(stateMachine.getCurrentState()).toBe('INITIAL');

    const audit = stateMachine.auditKnowledge();
    stateMachine.determineNextState(audit); // INITIAL -> KNOWLEDGE_AUDIT
    expect(stateMachine.getCurrentState()).toBe('KNOWLEDGE_AUDIT');

    stateMachine.determineNextState(audit); // KNOWLEDGE_AUDIT -> OPPORTUNITY_FORMATION (skips redundant questions)
    expect(stateMachine.getCurrentState()).toBe('OPPORTUNITY_FORMATION');

    stateMachine.determineNextState(audit); // OPPORTUNITY_FORMATION -> CONCEPT_GENERATION
    expect(stateMachine.getCurrentState()).toBe('CONCEPT_GENERATION');

    stateMachine.determineNextState(audit); // CONCEPT_GENERATION -> CONCEPT_EVALUATION
    expect(stateMachine.getCurrentState()).toBe('CONCEPT_EVALUATION');

    stateMachine.determineNextState(audit); // CONCEPT_EVALUATION -> BLUEPRINT_EMISSION
    expect(stateMachine.getCurrentState()).toBe('BLUEPRINT_EMISSION');

    const logs = stateMachine.getTransitionLogs();
    expect(logs.length).toBe(5);
  });

  it('Test 3: should assign highest materiality score to invalid CTA violation', () => {
    const invalidInput: CreativeBrainInput = {
      ...mockInput,
      intent: {
        ...mockInput.intent,
        cta: 'invalid_cta' as any,
      },
    };

    const stateMachine = new CreativeBrainStateMachine(invalidInput);
    const audit = stateMachine.auditKnowledge();

    const ctaNode = audit.nodes.find((n) => n.id === 'objective_cta');
    expect(ctaNode?.status).toBe('INSUFFICIENT');
    expect(ctaNode?.materialityScore).toBe(100);
    expect(audit.sufficientForDirectGeneration).toBe(false);
  });

  it('Test 4: should adapt scoring weights using VerticalConfig instead of separate vertical subclasses', () => {
    const restaurantMachine = new CreativeBrainStateMachine({ ...mockInput, vertical: 'restaurant' });
    const salonMachine = new CreativeBrainStateMachine({ ...mockInput, vertical: 'salon' });

    expect(restaurantMachine.getVerticalConfig().allowedCTAs).toContain('order_whatsapp');
    expect(salonMachine.getVerticalConfig().allowedCTAs).toContain('book_appointment');
  });
});

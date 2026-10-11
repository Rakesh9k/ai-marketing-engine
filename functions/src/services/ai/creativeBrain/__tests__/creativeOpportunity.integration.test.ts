import { creativeBrainService } from '../../creativeBrainService';
import { AdaptiveCreativeBrainStateMachine } from '../adaptiveStateMachine';
import { creativeBrainSessionService } from '../session/creativeBrainSession.service';
import type { CreativeBrainInput } from '../../creativeBrain.types';

describe('Phase 8 — Creative Opportunity Integration & Session Persistence', () => {
  jest.setTimeout(60000);

  beforeEach(() => {
    creativeBrainSessionService.clearStore();
  });

  const sampleInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Paradise Biryani',
        category: 'restaurant',
        description: 'Authentic dum biryani',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
        contact: { phone: '+919876543210' },
      },
      brand: { tone: 'friendly' },
      audience: { targetCustomer: 'Biryani enthusiasts', preferences: 'Authentic Hyderabadi spice' },
      products: [{ id: 'prod_01', name: 'Hyderabadi Chicken Biryani', price: 399 }],
    } as any,
    vertical: 'restaurant',
    productContext: { name: 'Hyderabadi Chicken Biryani', price: 399, images: [] },
    intent: {
      businessId: 'biz_restaurant_001',
      objective: 'weekend_offer' as const,
      offer: { headline: 'Special Biryani Combo at ₹399', price: 399, type: 'combo' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Banjara Hills'], occasion: 'Weekend family feast' },
      cta: 'order_whatsapp' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Banjara Hills',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'light',
        audienceDescription: 'Biryani lovers in Hyderabad',
        brandTone: 'friendly',
        campaignStyle: 'emotional',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: { businessSummary: 'Famous biryani restaurant' } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  test('1. discoverOpportunity returns normalized and validated CreativeOpportunity', async () => {
    const opportunity = await creativeBrainService.discoverOpportunity(sampleInput);

    expect(opportunity.opportunityId).toBeDefined();
    expect(opportunity.opportunityStatement).toBeDefined();
    expect(opportunity.customerTension).toBeDefined();
    expect(opportunity.strategicRecommendation).toBeDefined();
    expect(opportunity.thingsToAvoid).toBeDefined();
    expect(opportunity.confidence).toBeGreaterThanOrEqual(50);
  });

  test('2. Creative Opportunity persists to CreativeBrainSession and survives resumption', async () => {
    const session = await creativeBrainSessionService.createSession({
      businessId: 'biz_restaurant_001',
      industry: 'restaurant',
      initialIntent: {
        objective: 'weekend_offer',
        offerHeadline: 'Special Biryani Combo at ₹399',
        price: 399,
        cta: 'order_whatsapp',
        localization: sampleInput.intent.localization,
      },
    });

    const opportunity = await creativeBrainService.discoverOpportunity(sampleInput);
    const sessionWithOpp = await creativeBrainSessionService.saveOpportunity(session.sessionId, opportunity);

    expect(sessionWithOpp.creativeOpportunity).toBeDefined();
    expect(sessionWithOpp.creativeOpportunity?.opportunityId).toBe(opportunity.opportunityId);

    const resumeResult = await creativeBrainSessionService.resumeSession(session.sessionId);
    expect(resumeResult.session.creativeOpportunity?.opportunityStatement).toBe(opportunity.opportunityStatement);
  });

  test('3. Adaptive State Machine transitions through OPPORTUNITY state before blueprint locking', async () => {
    const stateMachine = new AdaptiveCreativeBrainStateMachine(sampleInput);
    const flowResult = await stateMachine.executeAdaptiveFlow(sampleInput);

    expect(flowResult.result.success).toBe(true);
    expect(flowResult.result.blueprint).toBeDefined();

    const traces = stateMachine.getTransitionTraces();
    const opportunityTrace = traces.find((t) => t.toState === 'OPPORTUNITY');
    expect(opportunityTrace).toBeDefined();
    expect(opportunityTrace?.reasonCode).toBe('TERRITORY_SELECTED');
  });

  test('4. Winning Concept expresses the locked Creative Opportunity', async () => {
    const result = await creativeBrainService.evaluateAndFormBlueprint(sampleInput);

    expect(result.success).toBe(true);
    expect(result.blueprint.opportunity).toBeDefined();
    expect(result.blueprint.winningConcept.opportunityId).toBe(result.blueprint.opportunity.opportunityId);
  });
});

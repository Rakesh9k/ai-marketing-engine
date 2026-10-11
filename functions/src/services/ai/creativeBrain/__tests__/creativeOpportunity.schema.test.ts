import { CreativeOpportunitySchema } from '../../creativeBrain.types';
import { OpportunityEngine } from '../opportunityEngine';

describe('Phase 8 — Creative Opportunity Schema & Normalization', () => {
  const sampleOpportunity = {
    opportunityId: 'opp_test_101',
    vertical: 'restaurant' as const,
    problem: 'Families want a satisfying weekend meal',
    tension: 'Deciding what to order for the family creates friction and cost concerns',
    motivation: 'Relief & Togetherness',
    audienceInsight: 'Young families in Hyderabad',
    opportunityStatement: 'Position Mutton Biryani as the simple "Everyone Is Sorted" weekend solution',
    desiredBusinessOutcome: 'Increase weekend orders',
    desiredAudienceResponse: 'Immediate order via WhatsApp',
    supportingSignals: ['Verified price ₹399', 'Active location Banjara Hills'],
    constraints: {
      maxTextDensity: 'medium' as const,
      toneBoundary: 'friendly',
      factualLimits: ['Price ₹399'],
    },
    confidence: 90,
    rationale: 'Strong alignment with family weekend dining habits',
  };

  const sampleInput = {
    businessBrain: {
      identity: {
        name: 'Paradise Biryani',
        category: 'restaurant' as const,
        description: 'Authentic dum biryani',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
        contact: { phone: '+919876543210' },
      },
      brand: { tone: 'friendly' as const },
      audience: { targetCustomer: 'Biryani lovers' },
      products: [{ id: 'p1', name: 'Mutton Biryani', price: 399 }],
    } as any,
    vertical: 'restaurant' as const,
    intent: {
      businessId: 'biz_01',
      objective: 'weekend_offer' as const,
      offer: { headline: 'Special Biryani Combo at ₹399', price: 399, type: 'combo' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Banjara Hills'] },
      cta: 'order_whatsapp' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Banjara Hills',
        primaryLanguage: 'en' as const,
        secondaryLanguage: 'te' as const,
        languageMixing: 'natural' as const,
        regionalStyle: 'hyderabadi' as const,
        slangPreference: 'light' as const,
        audienceDescription: 'Biryani lovers in Hyderabad',
        brandTone: 'friendly' as const,
        campaignStyle: 'emotional' as const,
        contentFormat: 'poster' as const,
      },
    },
    businessUnderstanding: { businessSummary: 'Top biryani spot' } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  test('1. Validates base CreativeOpportunitySchema successfully', () => {
    const parseResult = CreativeOpportunitySchema.safeParse(sampleOpportunity);
    expect(parseResult.success).toBe(true);
  });

  test('2. Normalizes opportunity to populate all Phase 8 explicit strategic fields', () => {
    const normalized = OpportunityEngine.normalizeOpportunity(sampleOpportunity, sampleInput);

    expect(normalized.audience).toBe('Young families in Hyderabad');
    expect(normalized.problemOrDesire).toBe('Families want a satisfying weekend meal');
    expect(normalized.marketingObjective).toBe('Increase weekend orders');
    expect(normalized.productOrService).toBe('Special Biryani Combo at ₹399');
    expect(normalized.offer).toContain('399');
    expect(normalized.customerTension).toContain('Deciding what to order');
    expect(normalized.businessDifferentiator).toBe('Paradise Biryani');
    expect(normalized.relevantProof).toHaveLength(2);
    expect(normalized.emotionalTerritory).toBe('Relief & Togetherness');
    expect(normalized.creativeOpportunity).toContain('Everyone Is Sorted');
    expect(normalized.strategicRecommendation).toContain('family weekend dining habits');
    expect(normalized.thingsToAvoid?.length).toBeGreaterThan(0);

    // Zod schema parses normalized object
    expect(() => CreativeOpportunitySchema.parse(normalized)).not.toThrow();
  });
});

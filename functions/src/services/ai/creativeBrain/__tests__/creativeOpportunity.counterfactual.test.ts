import { OpportunityEngine } from '../opportunityEngine';
import type { CreativeBrainInput, CreativeOpportunity } from '../../creativeBrain.types';

describe('Phase 8 — Creative Opportunity Counterfactual Validation', () => {
  const baseInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Hyderabadi Spice House',
        category: 'restaurant',
        description: 'Authentic Dum Biryani Specialist',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kondapur' },
        contact: { phone: '+919988776655' },
      },
      brand: { tone: 'friendly' },
      audience: { targetCustomer: 'Biryani lovers in Kondapur' },
      products: [{ id: 'p1', name: 'Special Chicken Dum Biryani', price: 399 }],
    } as any,
    vertical: 'restaurant',
    intent: {
      businessId: 'biz_rest_01',
      objective: 'weekend_offer' as const,
      offer: { headline: '20% OFF Biryani Combo', price: 399, type: 'percentage' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Kondapur'] },
      cta: 'order_whatsapp' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Kondapur',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'light',
        audienceDescription: 'Kondapur residents',
        brandTone: 'friendly',
        campaignStyle: 'emotional',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: { businessSummary: 'Top biryani restaurant' } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  test('1. Counterfactual Test A vs B — Convenience vs Experience Motivation', () => {
    // Opportunity A: Convenience Motivation
    const oppA: CreativeOpportunity = OpportunityEngine.normalizeOpportunity(
      {
        opportunityId: 'opp_conv',
        vertical: 'restaurant',
        problem: 'Figuring out weekend dinner takes too much time and discussion',
        tension: 'Busy parents want a fast, decision-free dinner solution that satisfies everyone',
        motivation: 'Convenience & Effort Reduction',
        audienceInsight: 'Families in Kondapur after a long work week',
        opportunityStatement: 'Position the Biryani Combo as the instant "Weekend Dinner Sorted" solution',
        desiredBusinessOutcome: 'Drive immediate WhatsApp orders',
        desiredAudienceResponse: 'Order immediately to save time',
        supportingSignals: ['Verified 20% offer', '₹399 price'],
        constraints: { maxTextDensity: 'low', toneBoundary: 'friendly', factualLimits: [] },
        confidence: 90,
        rationale: 'Frictionless ordering angle',
        customerTension: 'Decision fatigue vs desire for effortless family dinner',
        emotionalTerritory: 'Relief & Convenience',
        strategicRecommendation: 'Focus on zero-effort family meal decision',
      },
      baseInput
    );

    // Opportunity B: Experience / Fine Dining Motivation
    const oppB: CreativeOpportunity = OpportunityEngine.normalizeOpportunity(
      {
        opportunityId: 'opp_exp',
        vertical: 'restaurant',
        problem: 'Standard takeaways lack authentic royal dum flavor and special occasion feel',
        tension: 'Diners crave genuine slow-cooked heritage dum biryani for weekend celebrations',
        motivation: 'Culinary Heritage & Indulgence',
        audienceInsight: 'Food enthusiasts seeking authentic Hyderabadi dum cooking',
        opportunityStatement: 'Position as 50-year-old royal dum recipe cooked in traditional clay handi',
        desiredBusinessOutcome: 'Build premium brand positioning',
        desiredAudienceResponse: 'Savor authentic royal flavor',
        supportingSignals: ['Clay handi dum process'],
        constraints: { maxTextDensity: 'medium', toneBoundary: 'premium', factualLimits: [] },
        confidence: 90,
        rationale: 'Heritage culinary experience angle',
        customerTension: 'Commercial fast biryani vs authentic slow-cooked dum recipe',
        emotionalTerritory: 'Culinary Indulgence & Pride',
        strategicRecommendation: 'Focus on traditional royal dum handi preparation and aroma',
      },
      baseInput
    );

    expect(oppA.customerTension).not.toEqual(oppB.customerTension);
    expect(oppA.emotionalTerritory).toBe('Relief & Convenience');
    expect(oppB.emotionalTerritory).toBe('Culinary Indulgence & Pride');
    expect(oppA.creativeOpportunity).toContain('Weekend Dinner Sorted');
    expect(oppB.creativeOpportunity).toContain('royal dum recipe');
  });

  test('2. Counterfactual Test C vs D — Family vs College Audience', () => {
    // Family Audience
    const oppFamily = OpportunityEngine.normalizeOpportunity(
      {
        opportunityId: 'opp_family',
        vertical: 'restaurant',
        problem: 'Feeding 4 family members with varied tastes',
        tension: 'Multiple individual orders are expensive and complicated',
        motivation: 'Family Harmony',
        audienceInsight: 'Families in Kondapur',
        opportunityStatement: 'Position as generous family feast combo with something for everyone',
        desiredBusinessOutcome: 'Increase basket size',
        desiredAudienceResponse: 'Order family meal',
        supportingSignals: [],
        constraints: { maxTextDensity: 'low', toneBoundary: 'friendly', factualLimits: [] },
        confidence: 85,
        rationale: 'Family sharing meal focus',
      },
      baseInput
    );

    // College Student Audience
    const oppStudent = OpportunityEngine.normalizeOpportunity(
      {
        opportunityId: 'opp_student',
        vertical: 'restaurant',
        problem: 'Hostel students craving biryani late at night on a tight pocket-money budget',
        tension: 'Want rich biryani but have strict budget limits',
        motivation: 'Affordability & Late Night Cravings',
        audienceInsight: 'College students and young bachelors',
        opportunityStatement: 'Position as pocket-friendly late-night squad biryani deal',
        desiredBusinessOutcome: 'Drive student orders',
        desiredAudienceResponse: 'Split combo with roommates',
        supportingSignals: [],
        constraints: { maxTextDensity: 'low', toneBoundary: 'casual', factualLimits: [] },
        confidence: 85,
        rationale: 'Student budget sharing focus',
      },
      baseInput
    );

    expect(oppFamily.audience).toBe('Families in Kondapur');
    expect(oppStudent.audience).toBe('College students and young bachelors');
    expect(oppFamily.creativeOpportunity).toContain('family feast combo');
    expect(oppStudent.creativeOpportunity).toContain('squad biryani deal');
  });
});

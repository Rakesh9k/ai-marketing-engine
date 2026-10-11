import { OpportunityEngine } from '../opportunityEngine';
import type { CreativeBrainInput, CreativeOpportunity } from '../../creativeBrain.types';

describe('Phase 8 — Creative Opportunity Quality Rubric & Hard Gates', () => {
  const sampleInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Royal Crown Salon',
        category: 'salon',
        description: 'Luxury hair and skin studio',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Jubilee Hills' },
        contact: { phone: '+919988776655' },
      },
      brand: { tone: 'premium' },
      audience: { targetCustomer: 'Brides and bridal party' },
      products: [{ id: 's1', name: 'Bridal Glow Facial', price: 1499 }],
    } as any,
    vertical: 'salon',
    intent: {
      businessId: 'biz_salon_01',
      objective: 'appointment_promotion' as const,
      offer: { headline: 'Bridal Glow Package at ₹1,499', price: 1499, type: 'fixed' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Jubilee Hills'] },
      cta: 'book_appointment' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Jubilee Hills',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'none',
        audienceDescription: 'Brides seeking pre-wedding glow',
        brandTone: 'premium',
        campaignStyle: 'emotional',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: { businessSummary: 'Premium salon' } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  test('1. High-quality specific opportunity scores high on Quality Rubric and passes ACCEPT recommendation', () => {
    const strongOpp: CreativeOpportunity = {
      opportunityId: 'opp_salon_01',
      vertical: 'salon',
      problem: 'Brides want radiant skin for pre-wedding functions without risking harsh chemical reactions',
      tension: 'Wedding events are fast approaching, but trying new skincare treatments creates anxiety about breakouts',
      motivation: 'Confidence & Glamour',
      audienceInsight: 'Brides in Jubilee Hills preparing for wedding week',
      opportunityStatement: 'Position the Bridal Glow Package as the dermatologist-approved, zero-downtime glow solution before wedding events',
      desiredBusinessOutcome: 'Drive bridal appointment bookings',
      desiredAudienceResponse: 'Book facial consultation immediately',
      supportingSignals: ['Verified price ₹1,499', 'Active salon in Jubilee Hills'],
      constraints: {
        maxTextDensity: 'low',
        toneBoundary: 'premium',
        factualLimits: ['Price ₹1,499'],
      },
      confidence: 90,
      rationale: 'Addresses pre-wedding skin anxiety with safe verified package pricing',
      audience: 'Brides in Jubilee Hills preparing for wedding week',
      problemOrDesire: 'Radiant skin for pre-wedding functions without skin irritation',
      marketingObjective: 'appointment_promotion',
      productOrService: 'Bridal Glow Package',
      offer: '₹1,499 Package Deal',
      customerTension: 'Desire for flawless skin vs fear of last-minute skin breakouts',
      businessDifferentiator: 'Royal Crown Salon',
      relevantProof: ['Verified price ₹1,499'],
      emotionalTerritory: 'Pre-wedding Confidence',
      creativeOpportunity: 'Position as zero-downtime gentle bridal glow before events',
      strategicRecommendation: 'Lead with wedding-day confidence and reassure zero downtime',
      thingsToAvoid: ['Do not make unverified medical claims'],
    };

    const evalResult = OpportunityEngine.evaluateOpportunity(strongOpp, sampleInput);

    expect(evalResult.isViable).toBe(true);
    expect(evalResult.totalScore).toBeGreaterThanOrEqual(70);
    expect(evalResult.recommendation).toBe('ACCEPT');
    expect(evalResult.hardFailures).toHaveLength(0);
  });

  test('2. Generic marketing clichés penalize strategic specificity score', () => {
    const genericOpp: CreativeOpportunity = {
      opportunityId: 'opp_generic_01',
      vertical: 'salon',
      problem: 'Promote salon',
      tension: 'Customers like good service',
      motivation: 'Looking good',
      audienceInsight: 'Everyone in Hyderabad',
      opportunityStatement: 'Create engaging content to promote the product and highlight food and value for best in class experience',
      desiredBusinessOutcome: 'Get customers',
      desiredAudienceResponse: 'Visit salon',
      supportingSignals: [],
      constraints: {
        maxTextDensity: 'medium',
        toneBoundary: 'neutral',
        factualLimits: [],
      },
      confidence: 50,
      rationale: 'Generic promotional push',
    };

    const evalResult = OpportunityEngine.evaluateOpportunity(genericOpp, sampleInput);

    expect(evalResult.breakdown.strategicSpecificity).toBeLessThanOrEqual(5);
    expect(evalResult.notes).toContain('SPECIFICITY: Opportunity contains generic marketing clichés.');
  });

  test('3. Factuality hard gate rejects fake discount or free claims on paid products', () => {
    const fakeDiscountOpp: CreativeOpportunity = {
      opportunityId: 'opp_fake_discount',
      vertical: 'salon',
      problem: 'Promote facial',
      tension: 'Cost concern',
      motivation: 'Free offer',
      audienceInsight: 'Local brides',
      opportunityStatement: 'Get a completely FREE Bridal Glow Facial at Royal Crown Salon',
      desiredBusinessOutcome: 'Drive bookings',
      desiredAudienceResponse: 'Claim free offer',
      supportingSignals: [],
      constraints: {
        maxTextDensity: 'low',
        toneBoundary: 'friendly',
        factualLimits: [],
      },
      confidence: 80,
      rationale: 'Promote free facial claim',
    };

    const evalResult = OpportunityEngine.evaluateOpportunity(fakeDiscountOpp, sampleInput);

    expect(evalResult.isViable).toBe(false);
    expect(evalResult.totalScore).toBe(0);
    expect(evalResult.recommendation).toBe('REJECT');
    expect(evalResult.hardFailures[0]).toContain('TRUTH VIOLATION');
  });
});

import { OpportunityEngine } from '../opportunityEngine';
import type { CreativeBrainInput, CreativeOpportunity } from '../../creativeBrain.types';

describe('Phase 8 — Creative Opportunity Authority & Factuality Hard Gates', () => {
  const sampleInput: CreativeBrainInput = {
    businessBrain: {
      identity: {
        name: 'Aarti Real Estate',
        category: 'real_estate',
        description: 'Residential property consultants',
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli' },
        contact: { phone: '+919876500000' },
      },
      brand: { tone: 'professional' },
      audience: { targetCustomer: 'IT professionals seeking 3BHK' },
      products: [{ id: 'prop_01', name: '3BHK Gated Apartment in Gachibowli', price: 12500000 }],
    } as any,
    vertical: 'real_estate',
    productContext: { name: '3BHK Gated Apartment in Gachibowli', price: 12500000, images: [] },
    intent: {
      businessId: 'biz_re_01',
      objective: 'property_promotion' as const,
      offer: { headline: '3BHK Luxury Flat at ₹1.25 Cr', price: 12500000, type: 'fixed' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Gachibowli'] },
      cta: 'call_now' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Gachibowli',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'hyderabadi',
        slangPreference: 'none',
        audienceDescription: 'IT professionals seeking 3BHK flats',
        brandTone: 'professional',
        campaignStyle: 'educational',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: { businessSummary: 'Real estate consultants' } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  };

  test('1. Rejects unverified claim "10,000" customers when not in Business Brain', () => {
    const oppWithFakeClaim: CreativeOpportunity = {
      opportunityId: 'opp_fake_claim_01',
      vertical: 'real_estate',
      problem: 'Find trusted 3BHK flat',
      tension: 'Worry about builder delays',
      motivation: 'Trust & Quality',
      audienceInsight: 'IT buyers in Gachibowli',
      opportunityStatement: 'Trusted by 10,000 happy families for 3BHK buying',
      desiredBusinessOutcome: 'Drive calls',
      desiredAudienceResponse: 'Call agent',
      supportingSignals: ['10,000 happy families'],
      constraints: { maxTextDensity: 'medium', toneBoundary: 'professional', factualLimits: [] },
      confidence: 85,
      rationale: 'Position as market leader with 10,000 happy families',
    };

    const evalResult = OpportunityEngine.evaluateOpportunity(oppWithFakeClaim, sampleInput);

    expect(evalResult.isViable).toBe(false);
    expect(evalResult.hardFailures).toContain("TRUTH VIOLATION: Opportunity contains unverified claim '10,000'.");
  });

  test('2. Rejects unverified "30 min" delivery claim for real estate', () => {
    const oppWithDeliveryClaim: CreativeOpportunity = {
      opportunityId: 'opp_delivery_claim',
      vertical: 'real_estate',
      problem: 'Fast site visit',
      tension: 'Time restriction',
      motivation: 'Speed',
      audienceInsight: 'Busy IT executives',
      opportunityStatement: 'Guaranteed 30 min site visit pickup anywhere in Hyderabad',
      desiredBusinessOutcome: 'Book site visits',
      desiredAudienceResponse: 'Request pickup',
      supportingSignals: ['Guaranteed 30 min delivery'],
      constraints: { maxTextDensity: 'medium', toneBoundary: 'professional', factualLimits: [] },
      confidence: 80,
      rationale: 'Highlight instant pickup speed',
    };

    const evalResult = OpportunityEngine.evaluateOpportunity(oppWithDeliveryClaim, sampleInput);

    expect(evalResult.isViable).toBe(false);
    expect(evalResult.hardFailures[0]).toContain("TRUTH VIOLATION: Opportunity contains unverified claim 'guaranteed 30 min'.");
  });

  test('3. Deterministic Fallback Opportunity strictly adheres to Level 0 facts', () => {
    const fallbackOpp = OpportunityEngine.buildDeterministicFallbackOpportunity(
      sampleInput,
      'Unverified claim rejected by factuality gate'
    );

    const evalResult = OpportunityEngine.evaluateOpportunity(fallbackOpp, sampleInput);

    expect(evalResult.isViable).toBe(true);
    expect(evalResult.hardFailures).toHaveLength(0);
    expect(fallbackOpp.productOrService).toBe('3BHK Gated Apartment in Gachibowli');
    expect(fallbackOpp.offer).toContain('12500000');
  });
});

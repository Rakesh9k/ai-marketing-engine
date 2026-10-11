import { OpportunityEngine } from '../opportunityEngine';
import type { CreativeBrainInput } from '../../creativeBrain.types';

describe('Phase 8 — Creative Opportunity Cross-Vertical Operation', () => {
  const buildInput = (vertical: 'restaurant' | 'salon' | 'real_estate' | 'general'): CreativeBrainInput => ({
    businessBrain: {
      identity: {
        name: `Test Business for ${vertical}`,
        category: vertical,
        description: `Description for ${vertical}`,
        location: { city: 'Hyderabad', state: 'Telangana', locality: 'Banjara Hills' },
        contact: { phone: '+919900112233' },
      },
      brand: { tone: 'friendly' },
      audience: { targetCustomer: `Customers for ${vertical}` },
      products: [{ id: 'prod_1', name: `Key Product ${vertical}`, price: 499 }],
    } as any,
    vertical,
    productContext: { name: `Key Product ${vertical}`, price: 499, images: [] },
    intent: {
      businessId: `biz_${vertical}`,
      objective: 'product_promotion' as const,
      offer: { headline: `Special Offer ${vertical}`, price: 499, type: 'fixed' as const },
      duration: { start: '2026-10-01', end: '2026-10-31' },
      audience: { localities: ['Banjara Hills'] },
      cta: 'call_now' as const,
      localization: {
        country: 'IN',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Banjara Hills',
        primaryLanguage: 'en',
        secondaryLanguage: 'te',
        languageMixing: 'natural',
        regionalStyle: 'neutral',
        slangPreference: 'none',
        audienceDescription: `Audience for ${vertical}`,
        brandTone: 'friendly',
        campaignStyle: 'emotional',
        contentFormat: 'poster',
      },
    },
    businessUnderstanding: { businessSummary: `Summary for ${vertical}` } as any,
    memory: { preferences: [], feedback: [] },
    conflictConstraints: { nonNegotiableRules: {}, directives: [], detectedConflictsCount: 0 },
  });

  test('1. Generates valid opportunities for Restaurant, Salon, Real Estate, and Generic Business', () => {
    const verticals: ('restaurant' | 'salon' | 'real_estate' | 'general')[] = [
      'restaurant',
      'salon',
      'real_estate',
      'general',
    ];

    for (const vert of verticals) {
      const input = buildInput(vert);
      const fallbackOpp = OpportunityEngine.buildDeterministicFallbackOpportunity(input, `Test for ${vert}`);
      const evalResult = OpportunityEngine.evaluateOpportunity(fallbackOpp, input);

      expect(evalResult.isViable).toBe(true);
      expect(evalResult.hardFailures).toHaveLength(0);
      expect(fallbackOpp.vertical).toBe(vert);
      expect(fallbackOpp.productOrService).toBe(`Key Product ${vert}`);
    }
  });

  test('2. Audit: Zero hardcoded industry branches in OpportunityEngine implementation file', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const engineFilePath = path.join(__dirname, '../opportunityEngine.ts');
    const fileContent = fs.readFileSync(engineFilePath, 'utf-8');

    expect(fileContent).not.toMatch(/if\s*\(\s*(vertical|industry)\s*==/);
    expect(fileContent).not.toMatch(/switch\s*\(\s*(vertical|industry)\s*\)/);
  });
});

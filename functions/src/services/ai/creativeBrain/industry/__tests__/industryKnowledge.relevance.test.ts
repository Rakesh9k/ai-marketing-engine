import { describe, it, expect } from '@jest/globals';
import { IndustryKnowledgeResolver } from '../industryKnowledge.resolver';
import { IndustryContextHelper } from '../industryKnowledge.context';

describe('Phase 3 — Industry Relevance & Dimension Filtering Test Suite', () => {
  it('should prioritize high impact customer dimensions using IndustryContextHelper', () => {
    const context = IndustryKnowledgeResolver.resolve({ vertical: 'restaurant' });
    const highImpact = IndustryContextHelper.getHighImpactCustomerDimensions(context, 85);

    expect(highImpact.length).toBeGreaterThan(0);
    for (const dim of highImpact) {
      expect(dim.decisionImpact).toBeGreaterThanOrEqual(85);
    }
  });

  it('should filter matching creative territories by family', () => {
    const context = IndustryKnowledgeResolver.resolve({ vertical: 'salon' });
    const transformationTerritories = IndustryContextHelper.getMatchingTerritories(context, 'visual_radiance');

    expect(transformationTerritories.length).toBeGreaterThan(0);
    for (const terr of transformationTerritories) {
      expect(terr.family).toBe('visual_radiance');
    }
  });

  it('should merge subtype dimensions correctly boosting relevant decision impact', () => {
    const contextWithBiryani = IndustryKnowledgeResolver.resolve({
      vertical: 'restaurant',
      campaignIntent: { offer: { headline: 'Special Mutton Biryani' } } as any,
    });

    const cravingDim = contextWithBiryani.activeCustomerDimensions.find((d) => d.id === 'craving');
    expect(cravingDim).toBeDefined();
    expect(cravingDim?.decisionImpact).toBeGreaterThanOrEqual(95);
  });
});

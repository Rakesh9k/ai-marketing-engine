import { describe, it, expect } from '@jest/globals';
import { IndustryKnowledgeResolver } from '../industryKnowledge.resolver';
import { QuestionResolver } from '../../questionResolver';
import type { CreativeBrainRequirement } from '../../stateMachineTypes';

describe('Phase 3 — Industry Question System & Architecture Compliance Test Suite', () => {
  const reqAudience: CreativeBrainRequirement = {
    key: 'target_audience',
    label: 'Target Audience',
    category: 'audience',
    isCritical: true,
    decisionImpact: 85,
    uncertainty: 90,
    creativeRelevance: 90,
    userEffort: 20,
    informationValue: 57,
  };

  it('should resolve different contextual questions for restaurant vs salon vs real estate from IndustryContext without state machine branching', () => {
    const restaurantContext = IndustryKnowledgeResolver.resolve({ vertical: 'restaurant' });
    const salonContext = IndustryKnowledgeResolver.resolve({ vertical: 'salon' });
    const realEstateContext = IndustryKnowledgeResolver.resolve({ vertical: 'real_estate' });
    const genericContext = IndustryKnowledgeResolver.resolve({ vertical: 'unknown_vertical' });

    const qRestaurant = QuestionResolver.resolveHighestValueQuestion(reqAudience, restaurantContext, 'Special Mutton Biryani');
    const qSalon = QuestionResolver.resolveHighestValueQuestion(reqAudience, salonContext, 'Bridal Glow Facial');
    const qRealEstate = QuestionResolver.resolveHighestValueQuestion(reqAudience, realEstateContext, 'Luxury 3BHK Open House');
    const qGeneric = QuestionResolver.resolveHighestValueQuestion(reqAudience, genericContext, 'Special Package');

    expect(qRestaurant.question).toContain('Special Mutton Biryani');
    expect(qRestaurant.options).toContain('Families & Weekend Diners');

    expect(qSalon.question).toContain('Bridal Glow Facial');
    expect(qSalon.options).toContain('Brides & Wedding Guests');

    expect(qRealEstate.question).toContain('Luxury 3BHK Open House');
    expect(qRealEstate.options).toContain('First-Time Homebuyers');

    expect(qGeneric.question).toContain('Special Package');
    expect(qGeneric.options).toContain('Local Neighborhood Residents');
  });

  it('ARCHITECTURAL CHECK: QuestionResolver source code must contain ZERO industry-specific branches (0 `if (vertical === ...)` or `switch (vertical)`)', () => {
    const fs = require('fs');
    const path = require('path');
    const resolverPath = path.join(__dirname, '../../questionResolver.ts');
    const sourceCode = fs.readFileSync(resolverPath, 'utf8');

    expect(sourceCode).not.toMatch(/if\s*\(\s*vertical\s*===/i);
    expect(sourceCode).not.toMatch(/if\s*\(\s*industry\s*===/i);
    expect(sourceCode).not.toMatch(/switch\s*\(\s*(vertical|industry)\s*\)/i);
    expect(sourceCode).not.toMatch(/'restaurant'|'salon'|'real_estate'/);
  });
});

import { describe, it, expect } from '@jest/globals';
import { DynamicQuestionEngine } from '../creativeQuestion.engine';
import { InformationGainCalculator } from '../informationGain.calculator';
import { InformationGainEngine } from '../informationGain.engine';
import type { BusinessBrain } from '../../../../../types';
import type { CreativeQuestion, KnownContextMap } from '../creativeQuestion.types';

describe('Phase 5 — Information Gain Engine Behavioral Test Suite', () => {
  const mockRestaurantBrain: BusinessBrain = {
    identity: {
      name: 'Royal Biryani House',
      industry: 'restaurant',
      category: 'restaurant',
      description: 'Authentic dum biryani cooked with traditional spices.',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
    },
    products: [
      {
        productId: 'p1',
        name: 'Hyderabadi Chicken Biryani',
        description: 'Slow-cooked aromatic dum biryani',
        price: 350,
        category: 'Biryani',
        tags: ['biryani'],
      },
    ],
    audience: { targetCustomer: 'Biryani lovers & families' },
  } as any;

  const mockSalonBrain: BusinessBrain = {
    identity: {
      name: 'Glow Beauty Lounge',
      industry: 'salon',
      category: 'salon',
      description: 'Bridal makeover and skin clinic.',
      location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    },
    products: [
      {
        productId: 'p2',
        name: 'Bridal Facial Package',
        description: 'Luxury glowing skin treatment',
        price: 4999,
        category: 'Bridal',
        tags: ['facial'],
      },
    ],
    audience: { targetCustomer: 'Brides & wedding guests' },
  } as any;

  const mockRealEstateBrain: BusinessBrain = {
    identity: {
      name: 'Skyline Heights Realty',
      industry: 'real_estate',
      category: 'real_estate',
      description: 'Luxury 3BHK high-rise apartments.',
      location: { city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield' },
    },
    products: [
      {
        productId: 'p3',
        name: 'Luxury 3BHK Apartment',
        description: 'Spacious 1800 sq ft home',
        price: 8500000,
        category: 'Residential',
        tags: ['apartment'],
      },
    ],
    audience: { targetCustomer: 'First-time homebuyers' },
  } as any;

  it('Test 1 — Zero Gain: skips business registration question because no creative decision changes', () => {
    const question: CreativeQuestion = {
      id: 'q_registration_name',
      dimension: 'business_registration_number',
      question: 'What is your legal registration name?',
      purpose: 'Administrative record',
      inputType: 'short_text',
      required: false,
      priority: 100,
      userEffort: 20,
      decisionImpact: 0,
      creativeRelevance: 0,
      affectsStates: [],
      affectsDecisions: [],
      answerImpact: {
        decisionImpact: 0,
        creativeRelevance: 0,
        affectedDimensions: [],
        affectedStates: [],
      },
    };

    const res = InformationGainCalculator.calculateGain(question, {});
    expect(res.informationGain).toBe(0);
    expect(res.recommendation).toBe('SKIP');
  });

  it('Test 2 — High Gain: asks customer motivation question when options yield divergent strategic positioning', () => {
    const question: CreativeQuestion = {
      id: 'q_motivation_high_gain',
      dimension: 'customer_motivation',
      question: 'Are customers mainly buying for convenience or experience?',
      purpose: 'Drives positioning and creative territory',
      inputType: 'single_select',
      options: [
        { id: 'o1', label: 'Convenience', value: 'convenience', source: 'SYSTEM' },
        { id: 'o2', label: 'Experience', value: 'experience', source: 'SYSTEM' },
      ],
      required: false,
      priority: 80,
      userEffort: 5,
      decisionImpact: 85,
      creativeRelevance: 90,
      affectsStates: ['AUDIENCE_REASONING'],
      affectsDecisions: ['POSITIONING', 'CREATIVE_TERRITORY', 'COPY_DIRECTION'],
      answerImpact: {
        decisionImpact: 85,
        creativeRelevance: 90,
        affectedDimensions: ['customer_motivation'],
        affectedStates: ['AUDIENCE_REASONING'],
      },
    };

    const res = InformationGainCalculator.calculateGain(question, {}, 80);
    expect(res.informationGain).toBeGreaterThan(30);
    expect(res.recommendation).toBe('ASK');
  });

  it('Test 3 — Same Outcome: skips question if all candidate answers produce identical creative decisions', () => {
    const question: CreativeQuestion = {
      id: 'q_same_outcome',
      dimension: 'packaging_color_preference',
      question: 'Do you prefer blue or navy packaging?',
      purpose: 'Cosmetic tone',
      inputType: 'single_select',
      options: [
        { id: 'o1', label: 'Blue', value: 'blue', source: 'SYSTEM' },
        { id: 'o2', label: 'Navy Blue', value: 'blue', source: 'SYSTEM' }, // Same normalized output!
      ],
      required: false,
      priority: 50,
      userEffort: 5,
      decisionImpact: 20,
      creativeRelevance: 20,
      affectsStates: ['CONCEPT_GENERATION'],
      affectsDecisions: ['VISUAL_DIRECTION'],
      answerImpact: {
        decisionImpact: 20,
        creativeRelevance: 20,
        affectedDimensions: ['visual_direction'],
        affectedStates: ['CONCEPT_GENERATION'],
      },
    };

    const res = InformationGainCalculator.calculateGain(question, {});
    expect(res.informationGain).toBe(0);
    expect(res.recommendation).toBe('SKIP');
  });

  it('Test 4 — Contextual Gain: business founding year has 0 gain for weekend offer, high gain for anniversary campaign', () => {
    const foundingYearQuestion: CreativeQuestion = {
      id: 'q_founding_year',
      dimension: 'founding_year',
      question: 'What year was your business founded?',
      purpose: 'Heritage framing',
      inputType: 'short_text',
      required: false,
      priority: 60,
      userEffort: 10,
      decisionImpact: 50,
      creativeRelevance: 50,
      affectsStates: ['CREATIVE_BLUEPRINT_FORMATION'],
      affectsDecisions: ['POSITIONING', 'CREATIVE_TERRITORY'],
      answerImpact: {
        decisionImpact: 50,
        creativeRelevance: 50,
        affectedDimensions: ['founding_year'],
        affectedStates: ['CREATIVE_BLUEPRINT_FORMATION'],
      },
    };

    // Campaign A: Weekend offer (founding year is irrelevant)
    const knownContextA: KnownContextMap = {
      campaign_objective: {
        dimension: 'campaign_objective',
        value: 'weekend_offer',
        source: 'CURRENT_CAMPAIGN',
        authority: 'AUTHORITATIVE',
        confidence: 1.0,
        scope: 'CAMPAIGN',
      },
    };

    const resA = InformationGainCalculator.calculateGain(foundingYearQuestion, knownContextA, 20);
    expect(resA.recommendation).toBe('SKIP');

    // Campaign B: 10-year anniversary campaign (founding year is highly relevant)
    const knownContextB: KnownContextMap = {
      campaign_objective: {
        dimension: 'campaign_objective',
        value: 'anniversary_heritage',
        source: 'CURRENT_CAMPAIGN',
        authority: 'AUTHORITATIVE',
        confidence: 1.0,
        scope: 'CAMPAIGN',
      },
    };

    const resB = InformationGainCalculator.calculateGain(foundingYearQuestion, knownContextB, 75);
    expect(resB.informationGain).toBeGreaterThan(0);
  });

  it('Test 5 — Already Known: skips target audience question when Business Brain already provides authoritative target customer', () => {
    const result = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: mockRestaurantBrain,
      productContext: { name: 'Hyderabadi Chicken Biryani', price: 350 },
      campaignIntent: {
        objective: { primaryObjective: 'increase_orders' },
        offer: { headline: '20% OFF Biryani' },
        audience: { primaryAudience: 'Families' },
      } as any,
    });

    expect(result.action).toBe('PROCEED');
    expect(result.question).toBeUndefined();
  });

  it('Test 6 — Fully Specified Business: yields 0 questions and returns PROCEED', () => {
    const resRestaurant = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: mockRestaurantBrain,
      productContext: { name: 'Hyderabadi Chicken Biryani', price: 350 },
      campaignIntent: {
        objective: { primaryObjective: 'increase_orders' },
        offer: { headline: '20% OFF Biryani' },
        audience: { primaryAudience: 'Families' },
      } as any,
    });

    const resSalon = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: mockSalonBrain,
      productContext: { name: 'Bridal Facial Package', price: 4999 },
      campaignIntent: {
        objective: { primaryObjective: 'promote_bridal' },
        offer: { headline: '30% OFF Bridal Facial' },
        audience: { primaryAudience: 'Brides' },
      } as any,
    });

    const resRealEstate = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: mockRealEstateBrain,
      productContext: { name: 'Luxury 3BHK Apartment', price: 8500000 },
      campaignIntent: {
        objective: { primaryObjective: 'open_house' },
        offer: { headline: 'Open House This Weekend' },
        audience: { primaryAudience: 'Homebuyers' },
      } as any,
    });

    expect(resRestaurant.action).toBe('PROCEED');
    expect(resSalon.action).toBe('PROCEED');
    expect(resRealEstate.action).toBe('PROCEED');
  });

  it('Test 7 — Zero Industry Branches Invariant in InformationGainEngine source code', () => {
    const code = InformationGainEngine.toString() + InformationGainCalculator.toString();
    expect(code.includes('if (vertical ===')).toBe(false);
    expect(code.includes('switch (vertical)')).toBe(false);
    expect(code.includes('restaurant')).toBe(false);
    expect(code.includes('salon')).toBe(false);
    expect(code.includes('real_estate')).toBe(false);
  });
});

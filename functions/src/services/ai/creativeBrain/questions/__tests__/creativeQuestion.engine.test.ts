import { describe, it, expect } from '@jest/globals';
import { DynamicQuestionEngine } from '../creativeQuestion.engine';
import { IndustryKnowledgeResolver } from '../../industry/industryKnowledge.resolver';
import type { BusinessBrain } from '../../../../../types';

describe('Phase 4 — Dynamic Question Engine Unit Tests', () => {
  const mockFullRestaurantBrain: BusinessBrain = {
    identity: {
      name: 'Hyderabadi Spice House',
      industry: 'restaurant',
      category: 'restaurant',
      description: 'Authentic Hyderabadi Mutton Biryani delivery',
      location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
    },
    products: [
      {
        productId: 'p1',
        name: 'Special Mutton Dum Biryani',
        description: 'Slow cooked aromatic basmati rice with tender mutton',
        price: 399,
        category: 'biryani',
        tags: ['biryani', 'spicy'],
      },
    ],
    audience: { targetCustomer: 'Biryani lovers & local families' },
    brand: { tone: 'friendly' },
  } as any;

  const restaurantContext = IndustryKnowledgeResolver.resolve({
    businessBrain: mockFullRestaurantBrain,
    vertical: 'restaurant',
  });

  it('proceeds without asking a question when context is fully specified and sufficient', () => {
    const result = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: mockFullRestaurantBrain,
      productContext: {
        name: 'Special Mutton Dum Biryani',
        price: 399,
        category: 'biryani',
      },
      campaignIntent: {
        objective: { primaryObjective: 'increase_orders' },
        offer: { headline: '20% OFF Biryani' },
        audience: { primaryAudience: 'Families ordering dinner' },
      } as any,
      industryContext: restaurantContext,
    });

    expect(result.action).toBe('PROCEED');
    expect(result.question).toBeUndefined();
    expect(result.sufficiency.sufficient).toBe(true);
  });

  it('asks a single highest-value question when high-impact dimension is missing', () => {
    const result = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      businessBrain: {
        identity: {
          name: 'Hyderabadi Spice House',
          industry: 'restaurant',
          description: 'Local food joint',
        },
      } as any,
      productContext: {
        name: 'Special Mutton Dum Biryani',
      },
      industryContext: restaurantContext,
    });

    expect(result.action).toBe('ASK');
    expect(result.question).toBeDefined();
    expect(result.question?.dimension).toBe('audience');
    expect(result.trace.informationValueScores.length).toBeGreaterThan(0);
  });

  it('enforces maximum dynamic question budget per session', () => {
    const session = {
      sessionId: 'sess_123',
      askedQuestionIds: ['q_gen_audience', 'q_gen_occasion', 'q_gen_motivation'], // 3 questions already asked
      answers: [],
      skippedQuestionIds: [],
      inferredDimensions: [],
      userFatigueCount: 0,
      timestamp: new Date().toISOString(),
    };

    const result = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      productContext: { name: 'Special Biryani' },
      session,
      industryContext: restaurantContext,
    });

    expect(result.action).not.toBe('ASK');
    expect(result.question).toBeUndefined();
  });

  it('handles user fatigue by raising the Information Value threshold', () => {
    const fatiguedSession = {
      sessionId: 'sess_fatigue',
      askedQuestionIds: ['q_1'],
      answers: [],
      skippedQuestionIds: ['q_1'],
      inferredDimensions: [],
      userFatigueCount: 2, // Fatigued user
      timestamp: new Date().toISOString(),
    };

    const result = DynamicQuestionEngine.evaluate({
      state: 'AUDIENCE_REASONING',
      productContext: { name: 'Special Biryani' },
      session: fatiguedSession,
      industryContext: restaurantContext,
    });

    // Should skip low/medium IV questions when user is fatigued
    if (result.question) {
      expect(result.reasoning.informationValue).toBeGreaterThanOrEqual(75);
    }
  });

  it('verifies 0 industry-specific branches inside DynamicQuestionEngine source code', () => {
    const engineCode = DynamicQuestionEngine.toString();
    expect(engineCode.includes('if (vertical ===')).toBe(false);
    expect(engineCode.includes('switch (vertical)')).toBe(false);
    expect(engineCode.includes('restaurant')).toBe(false);
    expect(engineCode.includes('salon')).toBe(false);
  });
});

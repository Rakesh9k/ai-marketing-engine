import { describe, it, expect } from '@jest/globals';
import { InformationGainCalculator } from '../informationGain.calculator';
import type { CreativeQuestion, KnownContextMap } from '../creativeQuestion.types';

describe('Phase 5 — Information Gain Calculator Tests', () => {
  const mockKnownContext: KnownContextMap = {
    product_name: {
      dimension: 'product_name',
      value: 'Special Mutton Dum Biryani',
      source: 'CURRENT_CAMPAIGN',
      authority: 'AUTHORITATIVE',
      confidence: 1.0,
      scope: 'PRODUCT',
    },
  };

  it('calculates high Information Gain when candidate question answers produce divergent creative positioning', () => {
    const question: CreativeQuestion = {
      id: 'q_motivation_test',
      dimension: 'customer_motivation',
      question: 'What matters most to your customers?',
      purpose: 'Determine positioning angle',
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

    const result = InformationGainCalculator.calculateGain(question, mockKnownContext, 80);

    expect(result.informationGain).toBeGreaterThan(30);
    expect(result.possibleDecisionChanges.length).toBeGreaterThan(0);
    expect(result.recommendation).toBe('ASK');
  });

  it('enforces ZERO-GAIN QUESTION RULE: returns 0 Information Gain and SKIP for non-material question', () => {
    const zeroGainQuestion: CreativeQuestion = {
      id: 'q_registration_name',
      dimension: 'business_registration_number',
      question: 'What is your exact business registration number?',
      purpose: 'Record keeping',
      inputType: 'short_text',
      required: false,
      priority: 100, // High raw priority, but zero creative decision impact!
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

    const result = InformationGainCalculator.calculateGain(zeroGainQuestion, mockKnownContext, 10);

    expect(result.informationGain).toBe(0);
    expect(result.recommendation).toBe('SKIP');
    expect(result.reasoningTrace.reason).toContain('no downstream creative decision materially changes');
  });
});

import { describe, it, expect } from '@jest/globals';
import { CreativeQuestionSchema } from '../creativeQuestion.schema';
import type { CreativeQuestion } from '../creativeQuestion.types';

describe('Phase 4 — Creative Question Schema Validation', () => {
  it('validates a valid CreativeQuestion object', () => {
    const validQuestion: CreativeQuestion = {
      id: 'q_test_1',
      dimension: 'audience',
      question: 'Who is your main target audience?',
      purpose: 'Clarify target segment',
      inputType: 'single_select',
      required: false,
      priority: 80,
      userEffort: 5,
      decisionImpact: 85,
      creativeRelevance: 90,
      affectsStates: ['AUDIENCE_REASONING'],
      affectsDecisions: ['hook', 'tone'],
      answerImpact: {
        decisionImpact: 85,
        creativeRelevance: 90,
        affectedDimensions: ['audience'],
        affectedStates: ['AUDIENCE_REASONING'],
      },
    };

    const parsed = CreativeQuestionSchema.safeParse(validQuestion);
    expect(parsed.success).toBe(true);
  });

  it('rejects a CreativeQuestion missing required fields', () => {
    const invalidQuestion = {
      id: 'q_invalid',
      dimension: 'audience',
    };

    const parsed = CreativeQuestionSchema.safeParse(invalidQuestion);
    expect(parsed.success).toBe(false);
  });
});

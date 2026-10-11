import { describe, it, expect } from '@jest/globals';
import { DecisionMaterialityEvaluator } from '../informationGain.materiality';

describe('Phase 5 — Decision Materiality Evaluator Tests', () => {
  it('marks strategic positioning changes across answer paths as material', () => {
    const change = DecisionMaterialityEvaluator.evaluateChange(
      'POSITIONING',
      'unspecified',
      {
        convenience: 'effortless_speed_positioning',
        experience: 'indulgent_memorable_experience',
      }
    );

    expect(change.materiallyChanges).toBe(true);
    expect(change.impact).toBeGreaterThanOrEqual(70);
  });

  it('marks identical decision values across answer paths as non-material (0 impact)', () => {
    const change = DecisionMaterialityEvaluator.evaluateChange(
      'POSITIONING',
      'effortless_speed_positioning',
      {
        val1: 'effortless_speed_positioning',
        val2: 'effortless_speed_positioning',
      }
    );

    expect(change.materiallyChanges).toBe(false);
    expect(change.impact).toBe(0);
  });

  it('marks cosmetic alignment changes as non-material', () => {
    const change = DecisionMaterialityEvaluator.evaluateChange(
      'VISUAL_DIRECTION',
      'align_left',
      {
        opt_a: 'align_left',
        opt_b: 'align_center',
      }
    );

    expect(change.materiallyChanges).toBe(false);
    expect(change.impact).toBe(0);
  });
});

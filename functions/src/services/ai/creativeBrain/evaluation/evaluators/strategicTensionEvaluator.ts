/**
 * Phase 29 — Strategic Tension Evaluator
 * Mitra by BrainWise
 */

import type { StrategicTensionExpectation } from '../evaluation.types';

export class StrategicTensionEvaluator {
  /**
   * Evaluate whether Mitra surfaced expected strategic tension for conflicting user prompts
   */
  public static evaluateTension(
    currentState: string,
    expectations: StrategicTensionExpectation[] = []
  ): { score: number; passed: boolean; reason: string } {
    if (expectations.length === 0) {
      return { score: 100, passed: true, reason: 'No tension expectations specified' };
    }

    for (const exp of expectations) {
      if (exp.expectedState === 'STRATEGIC_TENSION' && currentState !== 'STRATEGIC_TENSION') {
        return {
          score: 30,
          passed: false,
          reason: `Expected state STRATEGIC_TENSION for conflict ${exp.conflictType}, but observed state "${currentState}". System blindly obeyed conflicting prompt.`
        };
      }
    }

    return {
      score: 95,
      passed: true,
      reason: 'Strategic tension detected and surfaced successfully'
    };
  }
}

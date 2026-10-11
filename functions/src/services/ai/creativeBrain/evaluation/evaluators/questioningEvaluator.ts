/**
 * Phase 29 — Questioning & Questionnaire Similarity Evaluator
 * Mitra by BrainWise
 */

import type { QuestionPathFingerprint } from '../evaluation.types';

export class QuestioningEvaluator {
  /**
   * Build a QuestionPathFingerprint from a sequence of asked questions and dimensions
   */
  public static createFingerprint(
    businessId: string,
    dimensions: string[],
    orderedDimensions: string[] = []
  ): QuestionPathFingerprint {
    return {
      businessId,
      dimensions: [...dimensions],
      orderedDimensions: orderedDimensions.length > 0 ? [...orderedDimensions] : [...dimensions],
      questionTypes: dimensions.map((d) => `Q_${d.toUpperCase()}`),
      informationGainProfile: dimensions.map((_, idx) => Math.max(0.1, 0.4 - idx * 0.05)),
      uncertaintyResolutions: [],
      deferredDimensions: []
    };
  }

  /**
   * Calculate Questionnaire Similarity Index between two QuestionPathFingerprints (0.00 to 1.00)
   * 1.00 = identical generic questionnaire (FAILURE)
   * < 0.40 = distinct intelligent questioning tailored to business type (PASS)
   */
  public static calculateSimilarity(
    f1: QuestionPathFingerprint,
    f2: QuestionPathFingerprint
  ): number {
    if (f1.dimensions.length === 0 || f2.dimensions.length === 0) return 0;

    const set1 = new Set(f1.dimensions.map((d) => d.toUpperCase()));
    const set2 = new Set(f2.dimensions.map((d) => d.toUpperCase()));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Check order similarity
    let orderMatches = 0;
    const minLen = Math.min(f1.orderedDimensions.length, f2.orderedDimensions.length);
    for (let i = 0; i < minLen; i++) {
      if (f1.orderedDimensions[i].toUpperCase() === f2.orderedDimensions[i].toUpperCase()) {
        orderMatches++;
      }
    }
    const orderSimilarity = minLen > 0 ? orderMatches / minLen : 0;

    return 0.7 * jaccardSimilarity + 0.3 * orderSimilarity;
  }

  /**
   * Evaluate a questioning score (0-100) for a single case
   */
  public static evaluateCaseQuestioning(
    fingerprint: QuestionPathFingerprint,
    expectedDimensions: string[],
    forbiddenQuestions: string[] = []
  ): number {
    if (fingerprint.dimensions.length === 0) return 100; // If fully known, 100% stop efficiency

    let score = 70; // Base score

    const askedSet = new Set(fingerprint.dimensions.map((d) => d.toUpperCase()));

    // Reward asking expected dimensions
    expectedDimensions.forEach((exp) => {
      if (askedSet.has(exp.toUpperCase())) {
        score += 15;
      }
    });

    // Deduct for asking forbidden questions
    fingerprint.dimensions.forEach((d) => {
      if (forbiddenQuestions.some((f) => d.toLowerCase().includes(f.toLowerCase()))) {
        score -= 25;
      }
    });

    return Math.min(100, Math.max(0, score));
  }
}

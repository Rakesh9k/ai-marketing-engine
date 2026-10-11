/**
 * PHASE 24 — Question Evaluator & Information Gain Integration
 * Ranks candidate questions using Confidence Gap, Information Gain, Strategic Importance,
 * Answerability, and Context Relevance.
 * Enforces confidence-driven stopping when strategic sufficiency is reached.
 */

import type {
  CreativeConfidenceDimension,
  CreativeConfidence,
  QuestionValue,
  CreativeReadiness,
} from './confidence.types';

export interface CandidateQuestion {
  questionId: string;
  text: string;
  targetDimensions: CreativeConfidenceDimension[];
  expectedInformationGain: number; // 0.0 to 1.0
  strategicImportance?: number; // 0.0 to 1.0
  answerability?: number; // 0.0 to 1.0
  contextRelevance?: number; // 0.0 to 1.0
}

export class QuestionEvaluator {
  private static readonly TARGET_CONFIDENCE_THRESHOLD = 0.85;

  /**
   * Evaluates candidate questions and selects the highest-value question.
   * Returns undefined if readiness is achieved or no question provides meaningful information gain.
   */
  public static selectBestQuestion(
    candidates: CandidateQuestion[],
    dimensions: Record<CreativeConfidenceDimension, CreativeConfidence>,
    readiness: CreativeReadiness
  ): QuestionValue | undefined {
    // 1. If overall strategic readiness is reached, stop questioning!
    if (readiness.ready) {
      return undefined;
    }

    const evaluatedQuestions: QuestionValue[] = [];

    for (const cand of candidates) {
      // Find the maximum confidence gap among target dimensions
      let maxGap = 0;
      let maxImportance = 0.20; // Default lower importance for non-blocking dimensions

      for (const targetDim of cand.targetDimensions) {
        const dimState = dimensions[targetDim];
        if (dimState) {
          const currentScore = dimState.score;
          const gap = Math.max(0, this.TARGET_CONFIDENCE_THRESHOLD - currentScore);
          if (gap > maxGap) {
            maxGap = gap;
          }
          if (dimState.blocking) {
            maxImportance = cand.strategicImportance ?? 1.0;
          }
        }
      }

      // If confidence gap is zero for all target dimensions, info gain is zero
      if (maxGap <= 0.05) {
        continue;
      }

      const infoGain = cand.expectedInformationGain;
      const answerability = cand.answerability ?? 0.90;
      const contextRel = cand.contextRelevance ?? 0.90;

      // Calculate total value: Confidence Gap * Information Gain * Strategic Importance * Answerability * Context Relevance
      const totalValue = Math.round(
        maxGap * infoGain * maxImportance * answerability * contextRel * 1000
      ) / 1000;

      evaluatedQuestions.push({
        questionId: cand.questionId,
        text: cand.text,
        targetDimensions: cand.targetDimensions,
        confidenceGap: Math.round(maxGap * 100) / 100,
        expectedInformationGain: infoGain,
        strategicImportance: maxImportance,
        answerability,
        contextRelevance: contextRel,
        totalValue,
      });
    }

    if (evaluatedQuestions.length === 0) {
      return undefined;
    }

    // Sort by totalValue descending
    evaluatedQuestions.sort((a, b) => b.totalValue - a.totalValue);

    const best = evaluatedQuestions[0];
    // Rule: Zero-gain stopping — if top question has negligible value (< 0.03), stop asking
    if (best.totalValue < 0.03) {
      return undefined;
    }

    return best;
  }
}

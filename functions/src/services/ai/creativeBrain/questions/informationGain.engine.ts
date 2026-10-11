import type { KnownContextMap } from './creativeQuestion.types';
import type { ScoredQuestion } from './creativeQuestion.scorer';
import type { InformationGainResult } from './informationGain.types';
import { InformationGainCalculator } from './informationGain.calculator';

export interface EvaluatedInformationGainItem {
  readonly scoredQuestion: ScoredQuestion;
  readonly gainResult: InformationGainResult;
  readonly combinedScore: number;
}

export class InformationGainEngine {
  public static evaluateCandidates(
    scoredCandidates: readonly ScoredQuestion[],
    knownContext: KnownContextMap
  ): readonly EvaluatedInformationGainItem[] {
    const results: EvaluatedInformationGainItem[] = [];

    for (const item of scoredCandidates) {
      const gainResult = InformationGainCalculator.calculateGain(
        item.question,
        knownContext,
        item.informationValue
      );

      // Combined Score: Information Value (50%) + Information Gain (50%)
      const combinedScore = Math.round(
        item.informationValue * 0.5 + gainResult.informationGain * 0.5
      );

      results.push({
        scoredQuestion: item,
        gainResult,
        combinedScore,
      });
    }

    // Sort descending by combinedScore, then informationGain, then informationValue
    return results.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (b.gainResult.informationGain !== a.gainResult.informationGain) return b.gainResult.informationGain - a.gainResult.informationGain;
      return b.scoredQuestion.informationValue - a.scoredQuestion.informationValue;
    });
  }

  public static filterZeroGainQuestions(
    items: readonly EvaluatedInformationGainItem[]
  ): readonly EvaluatedInformationGainItem[] {
    return items.filter(
      (item) => item.gainResult.informationGain > 0 && item.gainResult.recommendation !== 'SKIP'
    );
  }
}

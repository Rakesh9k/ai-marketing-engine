import type {
  CreativeBrainState,
  CreativeQuestion,
  KnownContextMap,
  MissingCreativeInformation,
} from './creativeQuestion.types';
import { CreativeKnowledgeResolver } from './creativeQuestion.knowledgeResolver';

export const QUESTION_THRESHOLDS = {
  SKIP_MAX: 25,
  INFER_MAX: 50,
  ASK_MIN: 51,
  HIGH_VALUE_MIN: 70,
} as const;

export interface ScoredQuestion {
  readonly question: CreativeQuestion;
  readonly informationValue: number;
  readonly totalScore: number;
  readonly action: 'SKIP' | 'INFER' | 'ASK';
  readonly missingInfo: MissingCreativeInformation;
}

export class QuestionScorer {
  public static scoreQuestion(
    question: CreativeQuestion,
    state: CreativeBrainState,
    knownContext: KnownContextMap
  ): ScoredQuestion {
    const dimState = CreativeKnowledgeResolver.evaluateDimensionState(
      question.dimension,
      knownContext
    );

    // Uncertainty calculation (0..100):
    // KNOWN -> 10, PARTIALLY_KNOWN -> 40, INFERRED -> 60, CONFLICTING -> 85, UNKNOWN -> 90
    let uncertainty = 90;
    if (dimState.status === 'KNOWN') uncertainty = 10;
    else if (dimState.status === 'PARTIALLY_KNOWN') uncertainty = 40;
    else if (dimState.status === 'INFERRED') uncertainty = 60;
    else if (dimState.status === 'CONFLICTING') uncertainty = 85;

    const decisionImpact = question.decisionImpact;
    const creativeRelevance = question.creativeRelevance;
    const userEffort = question.userEffort;

    // Standard Information Value Formula (Phase 2.5 / Phase 3A)
    const rawValue = (decisionImpact * uncertainty * creativeRelevance) / 10000;
    const informationValue = Math.max(0, Math.round(rawValue - userEffort * 0.2));

    // Threshold Action Determination
    let action: 'SKIP' | 'INFER' | 'ASK' = 'SKIP';
    if (informationValue > QUESTION_THRESHOLDS.ASK_MIN) {
      action = 'ASK';
    } else if (informationValue > QUESTION_THRESHOLDS.SKIP_MAX) {
      action = uncertainty <= 60 ? 'INFER' : 'SKIP';
    } else {
      action = 'SKIP';
    }

    // Ranking score prioritizing Information Value over static priority
    // Score = IV * 0.70 + (decisionImpact * 0.15) + (stateRelevance * 0.15)
    const stateRelevanceScore = question.affectsStates.includes(state) ? 100 : 50;
    const decisionCoverageScore = Math.min(100, question.affectsDecisions.length * 25);
    const totalScore = Math.round(
      informationValue * 0.7 + decisionCoverageScore * 0.15 + stateRelevanceScore * 0.15
    );

    const missingInfo: MissingCreativeInformation = {
      dimension: question.dimension,
      state: dimState.status === 'UNKNOWN' ? 'UNKNOWN' : dimState.status === 'CONFLICTING' ? 'CONFLICTING' : 'PARTIAL',
      uncertainty,
      decisionImpact,
      creativeRelevance,
      estimatedAnswerValue: informationValue,
      affectedDecisions: question.affectsDecisions,
      recommendedAction: action,
    };

    return {
      question,
      informationValue,
      totalScore,
      action,
      missingInfo,
    };
  }

  public static rankCandidates(scoredList: readonly ScoredQuestion[]): readonly ScoredQuestion[] {
    return [...scoredList].sort((a, b) => {
      // 1. Higher total score / Information Value
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.informationValue !== a.informationValue) return b.informationValue - a.informationValue;
      // 2. Higher decision impact
      if (b.question.decisionImpact !== a.question.decisionImpact) return b.question.decisionImpact - a.question.decisionImpact;
      // 3. Lower user effort
      if (a.question.userEffort !== b.question.userEffort) return a.question.userEffort - b.question.userEffort;
      // 4. Stable tie-breaker by question ID
      return a.question.id.localeCompare(b.question.id);
    });
  }
}

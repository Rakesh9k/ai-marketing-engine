import type { CreativeQualityEvaluation, CreativeQualityLearning, CreativeQualityDimension } from "../../types";

export class QualityLearningService {
  /**
   * Preserves quality evaluation predictions for future performance outcome correlation.
   */
  public recordPrediction(evaluation: CreativeQualityEvaluation): CreativeQualityLearning {
    return {
      evaluationId: evaluation.evaluationId,
      creativeVersionId: evaluation.creativeVersionId,
      predictedScore: evaluation,
      performanceSignals: [],
      dimensionCorrelations: {} as Record<CreativeQualityDimension, number>,
    };
  }

  /**
   * Attaches observed performance outcome data to a historical prediction.
   */
  public attachOutcome(
    learningRecord: CreativeQualityLearning,
    outcome: {
      engagement: number;
      conversion?: number;
      retention?: number;
      clickThroughRate?: number;
      otherMetrics?: Record<string, number>;
    }
  ): CreativeQualityLearning {
    return {
      ...learningRecord,
      observedOutcome: outcome,
    };
  }
}

import type { CreativeBrainState, DynamicQuestionTrace } from './creativeQuestion.types';
import type { ScoredQuestion } from './creativeQuestion.scorer';

export class DynamicQuestionTracer {
  public static createTrace(params: {
    state: CreativeBrainState;
    knownDimensions: readonly string[];
    missingDimensions: readonly string[];
    candidates: readonly ScoredQuestion[];
    selected?: ScoredQuestion;
    action: 'ASK' | 'INFER' | 'SKIP' | 'PROCEED' | 'FALLBACK';
    industryKnowledgeVersion?: string;
  }): DynamicQuestionTrace {
    const {
      state,
      knownDimensions,
      missingDimensions,
      candidates,
      selected,
      action,
      industryKnowledgeVersion,
    } = params;

    const candidateQuestionIds = candidates.map((c) => c.question.id);
    const rejectedQuestionIds = candidates
      .filter((c) => !selected || c.question.id !== selected.question.id)
      .map((c) => c.question.id);

    const informationValueScores = candidates.map((c) => ({
      questionId: c.question.id,
      score: c.informationValue,
    }));

    return {
      state,
      knownDimensions,
      missingDimensions,
      candidateQuestionIds,
      rejectedQuestionIds,
      informationValueScores,
      selectedQuestionId: selected?.question.id,
      action,
      industryKnowledgeVersion,
      decisionChangingRateEstimate: selected ? selected.informationValue / 100 : 0,
      timestamp: new Date().toISOString(),
    };
  }
}

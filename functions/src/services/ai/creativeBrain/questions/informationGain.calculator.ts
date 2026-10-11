import type { CreativeQuestion, KnownContextMap } from './creativeQuestion.types';
import type { InformationGainResult, InformationGainTrace } from './informationGain.types';
import { CounterfactualDecisionEvaluator } from './informationGain.counterfactual';
import { QUESTION_THRESHOLDS } from './creativeQuestion.scorer';

export class InformationGainCalculator {
  public static calculateGain(
    question: CreativeQuestion,
    knownContext: KnownContextMap,
    informationValue: number = 50
  ): InformationGainResult {
    // 1. Evaluate counterfactual answer paths and decision changes
    const counterfactuals = CounterfactualDecisionEvaluator.evaluateCounterfactuals(
      question,
      knownContext
    );

    const { affectedDecisions, answerPaths, possibleDecisionChanges, materialChangeCount } = counterfactuals;

    // 2. Current Uncertainty Calculation (0..100)
    // If dimension is missing or unspecified, current uncertainty is high (e.g. 85)
    const isKnown = Boolean(knownContext[question.dimension]);
    const currentDecisionUncertainty = isKnown ? 20 : 85;

    // 3. Expected Decision Uncertainty After Answer
    let expectedDecisionUncertainty = 0;
    for (const path of answerPaths) {
      expectedDecisionUncertainty += path.probability * path.resultingUncertainty;
    }
    expectedDecisionUncertainty = Math.round(expectedDecisionUncertainty);

    // 4. Raw Information Gain Calculation
    const rawGain = Math.max(0, currentDecisionUncertainty - expectedDecisionUncertainty);

    // HARD INVARIANT: ZERO-GAIN QUESTION RULE
    // If no downstream decision materially changes across candidate answers, Information Gain = 0!
    const informationGain = materialChangeCount > 0 ? Math.round(rawGain * (materialChangeCount / affectedDecisions.length)) : 0;

    // 5. Creative Impact Calculation
    const creativeImpact = Math.round(
      (question.decisionImpact * 0.5) + (question.creativeRelevance * 0.3) + (informationGain * 0.2)
    );

    // 6. Action Recommendation Determination
    let recommendation: 'ASK' | 'SKIP' | 'DEFER' = 'SKIP';
    let reason = '';

    if (materialChangeCount === 0 || informationGain === 0) {
      recommendation = 'SKIP';
      reason = 'Skipped because no downstream creative decision materially changes across candidate answers.';
    } else if (informationGain >= 40 && informationValue >= QUESTION_THRESHOLDS.ASK_MIN) {
      recommendation = 'ASK';
      reason = `Asked because answers produce materially different strategic decisions across ${materialChangeCount} creative dimensions.`;
    } else if (informationGain >= 20) {
      recommendation = 'DEFER';
      reason = 'Deferred because information gain is moderate but does not justify immediate user effort.';
    } else {
      recommendation = 'SKIP';
      reason = 'Skipped due to low information gain and insufficient decision divergence.';
    }

    const reasoningTrace: InformationGainTrace = {
      questionId: question.id,
      state: question.affectsStates[0] || 'AUDIENCE_REASONING',
      affectedDecisions,
      currentUncertainty: currentDecisionUncertainty,
      answerPaths,
      informationGain,
      materialChangeCount,
      informationValue,
      userEffort: question.userEffort,
      recommendation,
      reason,
      timestamp: new Date().toISOString(),
    };

    return {
      questionId: question.id,
      currentDecisionUncertainty,
      expectedDecisionUncertainty,
      informationGain,
      creativeImpact,
      affectedDecisions,
      possibleDecisionChanges,
      recommendation,
      confidence: 0.9,
      reasoningTrace,
    };
  }
}

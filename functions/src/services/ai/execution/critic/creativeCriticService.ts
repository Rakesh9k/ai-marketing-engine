/**
 * PHASE 19 — Creative Critic Service (Master Facade)
 * Independent Creative Critic that evaluates finished execution deliverables (Posts & Reels)
 * against approved CanonicalCreativeBlueprint, computing 10 dimension scores, generating actionable
 * feedback with evidence, and rendering decision (APPROVE, REVISE, REJECT).
 */

import type {
  CreativeCriticComparison,
  CreativeCriticInput,
  CreativeCriticResult,
  CriticRecommendation,
  ExecutionRevisionRequest,
} from './creativeCritic.types';
import { CriticEvaluator } from './criticEvaluator';
import { CriticRecommendations } from './criticRecommendations';
import { CriticScoring } from './criticScoring';

export class CreativeCriticService {
  private readonly evaluator: CriticEvaluator;
  private readonly scoring: CriticScoring;
  private readonly recommendationsEngine: CriticRecommendations;
  public readonly criticVersion: string = '1.0.0';

  constructor(
    evaluator?: CriticEvaluator,
    scoring?: CriticScoring,
    recommendationsEngine?: CriticRecommendations
  ) {
    this.evaluator = evaluator || new CriticEvaluator();
    this.scoring = scoring || new CriticScoring();
    this.recommendationsEngine = recommendationsEngine || new CriticRecommendations();
  }

  /**
   * Evaluates a finished execution asset (Post or Reel) against the approved Creative Blueprint.
   */
  public evaluateExecution(input: CreativeCriticInput): CreativeCriticResult {
    // 1. Guard against missing blueprint (Never guess strategy!)
    if (!input.blueprint || !input.blueprint.id) {
      throw new Error('Creative Critic Blocked: Mandatory CanonicalCreativeBlueprint missing. Critic refuses to guess strategy.');
    }

    // 2. Evaluate 10 Dimensions & 2s/5s understanding
    const evaluation = this.evaluator.evaluateDimensions(input);

    // 3. Compute Overall Score
    const overallScore = this.scoring.calculateOverallScore(evaluation.dimensions);

    // 4. Generate Feedback (Strengths, Weaknesses, Critical Issues, Recommendations)
    const feedback = this.recommendationsEngine.generateFeedback(evaluation.dimensions);

    // 5. Determine Decision (APPROVE, REVISE, REJECT)
    const decision = this.scoring.determineDecision(
      overallScore,
      evaluation.dimensions,
      feedback.criticalIssues
    );

    return {
      campaignId: input.campaignId,
      blueprintId: input.blueprintId,
      blueprintVersion: input.blueprintVersion,
      assetId: input.asset.assetId,
      overallScore,
      twoSecondUnderstanding: evaluation.twoSecondUnderstanding,
      fiveSecondUnderstanding: evaluation.fiveSecondUnderstanding,
      dimensions: evaluation.dimensions,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      criticalIssues: feedback.criticalIssues,
      recommendations: feedback.recommendations,
      decision,
      criticVersion: this.criticVersion,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Builds an ExecutionRevisionRequest targeting specific weak areas while preserving protected strategy.
   */
  public prepareRevisionRequest(
    blueprintId: string,
    blueprintVersion: number,
    executionId: string,
    criticResultId: string,
    recommendations: CriticRecommendation[],
    protectedConstraints?: string[]
  ): ExecutionRevisionRequest {
    return this.recommendationsEngine.buildRevisionRequest(
      blueprintId,
      blueprintVersion,
      executionId,
      criticResultId,
      recommendations,
      protectedConstraints
    );
  }

  /**
   * Performs regression comparison between two execution iterations.
   */
  public compareExecutions(
    previousResult: CreativeCriticResult,
    currentResult: CreativeCriticResult
  ): CreativeCriticComparison {
    return this.recommendationsEngine.compareExecutions(previousResult, currentResult);
  }
}

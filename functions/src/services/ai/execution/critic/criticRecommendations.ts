/**
 * PHASE 19 — Critic Recommendations & Revision Engine
 * Generates actionable execution-level recommendations (with protected constraint preservation),
 * packages ExecutionRevisionRequest payloads, and performs regression comparisons between iterations.
 */

import type {
  CreativeCriticComparison,
  CreativeCriticResult,
  CriticIssue,
  CriticRecommendation,
  ExecutionRevisionRequest,
  RevisionTarget,
} from './creativeCritic.types';

export class CriticRecommendations {
  /**
   * Generates strengths, weaknesses, critical issues, and actionable recommendations.
   */
  public generateFeedback(dimensions: CreativeCriticResult['dimensions']): {
    strengths: string[];
    weaknesses: string[];
    criticalIssues: CriticIssue[];
    recommendations: CriticRecommendation[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalIssues: CriticIssue[] = [];
    const recommendations: CriticRecommendation[] = [];

    // Evaluate dimension scores for feedback
    Object.values(dimensions).forEach((dim) => {
      if (dim.score >= 85) {
        strengths.push(`${dim.name.toUpperCase()}: ${dim.assessment}`);
      } else if (dim.score < 70) {
        weaknesses.push(`${dim.name.toUpperCase()}: ${dim.assessment}`);

        if (dim.score < 60) {
          criticalIssues.push({
            severity: dim.name === 'conceptFidelity' ? 'CRITICAL' : 'HIGH',
            dimension: dim.name,
            issue: dim.assessment,
            evidence: dim.evidence.join('; '),
            recommendedAction: dim.name === 'conceptFidelity' ? 'REVISE_EXECUTION' : 'RECOMPOSE',
          });
        }

        // Actionable recommendation
        recommendations.push(this.createRecommendationForDimension(dim.name, dim.assessment));
      }
    });

    return {
      strengths,
      weaknesses,
      criticalIssues,
      recommendations,
    };
  }

  /**
   * Constructs an ExecutionRevisionRequest targeting specific weak execution components
   * while enforcing protected strategy constraints.
   */
  public buildRevisionRequest(
    blueprintId: string,
    blueprintVersion: number,
    executionId: string,
    criticResultId: string,
    recommendations: CriticRecommendation[],
    protectedConstraints: string[] = ['Core concept storytelling', 'Approved tone', 'Supporting offer role']
  ): ExecutionRevisionRequest {
    const revisionTargets: RevisionTarget[] = recommendations.map((rec) => ({
      target: rec.target,
      action: rec.recommendation,
    }));

    const instructions = recommendations
      .map((r) => `[REVISE ${r.target}]: ${r.recommendation} (Problem: ${r.problem})`)
      .join('\n');

    return {
      blueprintId,
      blueprintVersion,
      executionId,
      criticResultId,
      revisionTargets,
      preserveConstraints: protectedConstraints,
      revisionInstruction: `
REVISION INSTRUCTION:
${instructions}

PRESERVE CONSTRAINTS (DO NOT ALTER):
${protectedConstraints.map((c) => `- ${c}`).join('\n')}
`.trim(),
    };
  }

  /**
   * Compares current execution critic score against previous execution score (Regression Check).
   * A revision is ONLY recommended if it improves target score without damaging protected dimensions.
   */
  public compareExecutions(
    previousResult: CreativeCriticResult,
    currentResult: CreativeCriticResult
  ): CreativeCriticComparison {
    const scoreDelta: Record<string, number> = {};
    const regressions: string[] = [];
    const improvements: string[] = [];

    const dimNames = Object.keys(currentResult.dimensions) as Array<keyof CreativeCriticResult['dimensions']>;

    dimNames.forEach((name) => {
      const prevScore = previousResult.dimensions[name].score;
      const currScore = currentResult.dimensions[name].score;
      const diff = currScore - prevScore;
      scoreDelta[name] = diff;

      if (diff > 5) {
        improvements.push(`Improved ${name}: +${diff} points (${prevScore} -> ${currScore})`);
      } else if (diff < -5) {
        regressions.push(`Regressed ${name}: ${diff} points (${prevScore} -> ${currScore})`);
      }
    });

    // Check if regression damaged protected concept fidelity or overall score
    const fidelityDiff = scoreDelta['conceptFidelity'] || 0;
    const isRegressionSevere = regressions.length > 0 && (fidelityDiff < -10 || currentResult.overallScore < previousResult.overallScore);

    const recommendedVersion = isRegressionSevere ? 'PREVIOUS' : 'CURRENT';

    return {
      previousExecutionId: previousResult.assetId,
      currentExecutionId: currentResult.assetId,
      scoreDelta,
      regressions,
      improvements,
      recommendedVersion,
    };
  }

  private createRecommendationForDimension(
    dimension: string,
    problem: string
  ): CriticRecommendation {
    switch (dimension) {
      case 'hook':
        return {
          priority: 1,
          target: 'HOOK',
          problem,
          recommendation: 'Make audience recognition or tension visible in the first 2 seconds.',
          blueprintConstraint: 'Must activate approved audience tension.',
          preserve: ['Core concept idea', 'Brand voice'],
        };
      case 'conceptFidelity':
        return {
          priority: 1,
          target: 'COMPOSITION',
          problem,
          recommendation: 'Recompose visual and headline to put core concept story front and center; reduce offer visual weight.',
          blueprintConstraint: 'Must preserve approved concept & mechanism.',
          preserve: ['Human insight', 'Brand logo'],
        };
      case 'visualCommunication':
        return {
          priority: 2,
          target: 'VISUAL',
          problem,
          recommendation: 'Ensure main subject interaction communicates narrative at a 2-second glance.',
          blueprintConstraint: 'Must match visualDirection subject.',
          preserve: ['Headline text', 'CTA'],
        };
      default:
        return {
          priority: 3,
          target: 'COPY',
          problem,
          recommendation: 'Refine phrasing for greater clarity and emotional impact.',
          blueprintConstraint: 'Must match approved tone.',
          preserve: ['Core concept', 'Offer details'],
        };
    }
  }
}

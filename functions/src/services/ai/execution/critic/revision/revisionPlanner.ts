/**
 * PHASE 20 — Revision Planner
 * Diagnoses Critic feedback, maps weak dimensions to minimum mutable execution components,
 * formulates preservation constraints, and builds a CreativeRevisionPlan.
 */

import type { CreativeCriticResult } from '../creativeCritic.types';
import type {
  CreativeRevisionPlan,
  ExecutionComponent,
  PreservationConstraint,
  RegressionConstraint,
  RevisionDimension,
  RevisionEligibility,
  RevisionStrategy,
} from './revision.types';

export class RevisionPlanner {
  public readonly MAX_AUTOMATIC_REVISIONS = 2;
  public readonly SUFFICIENCY_THRESHOLD = 80;

  /**
   * Evaluates whether a campaign asset requires and is eligible for targeted revision.
   */
  public evaluateEligibility(criticResult: CreativeCriticResult, revisionNumber: number): RevisionEligibility {
    // 1. Check max revisions limit (Budget condition)
    if (revisionNumber >= this.MAX_AUTOMATIC_REVISIONS) {
      return {
        eligible: false,
        reason: `Automatic revision budget reached (max ${this.MAX_AUTOMATIC_REVISIONS} attempts). Escalating to human review.`,
        targetDimensions: [],
        estimatedCost: 'LOW',
      };
    }

    // 2. Check if asset is already sufficient
    if (criticResult.overallScore >= this.SUFFICIENCY_THRESHOLD && criticResult.dimensions.conceptFidelity.score >= 75) {
      return {
        eligible: false,
        reason: `Quality score (${criticResult.overallScore}) is sufficient. No revision required.`,
        targetDimensions: [],
        estimatedCost: 'LOW',
      };
    }

    // 3. Identify weak dimensions
    const weakDimensions: RevisionDimension[] = [];
    (Object.keys(criticResult.dimensions) as RevisionDimension[]).forEach((dim) => {
      if (criticResult.dimensions[dim].score < 70) {
        weakDimensions.push(dim);
      }
    });

    if (weakDimensions.length === 0) {
      return {
        eligible: false,
        reason: 'No critical dimension weaknesses identified.',
        targetDimensions: [],
        estimatedCost: 'LOW',
      };
    }

    return {
      eligible: true,
      reason: `Targeting weaknesses in: ${weakDimensions.join(', ')}`,
      targetDimensions: weakDimensions,
      estimatedCost: weakDimensions.includes('visualCommunication') || weakDimensions.includes('originality') ? 'MEDIUM' : 'LOW',
    };
  }

  /**
   * Constructs a CreativeRevisionPlan targeting weak dimensions while protecting strong ones.
   */
  public buildRevisionPlan(
    criticResult: CreativeCriticResult,
    revisionNumber: number
  ): CreativeRevisionPlan {
    const targetDimensions: RevisionDimension[] = [];
    const protectedDimensions: RevisionDimension[] = [];

    (Object.keys(criticResult.dimensions) as RevisionDimension[]).forEach((dim) => {
      if (criticResult.dimensions[dim].score < 70) {
        targetDimensions.push(dim);
      } else {
        protectedDimensions.push(dim);
      }
    });

    // Determine Mutable vs Immutable Components
    const mutableComponents: ExecutionComponent[] = [];
    const immutableComponents: ExecutionComponent[] = [
      'creativeBlueprint',
      'coreConcept',
      'offer',
      'brandIdentity',
    ];

    targetDimensions.forEach((dim) => {
      switch (dim) {
        case 'hook':
          mutableComponents.push('hook', 'headline', 'openingHook');
          break;
        case 'originality':
        case 'visualCommunication':
          mutableComponents.push('heroImage', 'visualComposition', 'layout', 'visual');
          break;
        case 'offerClarity':
          mutableComponents.push('offerTreatment', 'supportingCopy');
          break;
        case 'conversion':
          mutableComponents.push('cta');
          break;
        default:
          mutableComponents.push('visualComposition');
          break;
      }
    });

    // Formulate Preservation Constraints
    const preservationConstraints: PreservationConstraint[] = [
      { component: 'creativeBlueprint', reason: 'Strategic Blueprint is locked & immutable', source: 'BLUEPRINT', strictness: 'HARD' },
      { component: 'coreConcept', reason: 'Core concept human insight must not be replaced', source: 'BLUEPRINT', strictness: 'HARD' },
      { component: 'offer', reason: 'Verified offer terms cannot be altered', source: 'BLUEPRINT', strictness: 'HARD' },
      { component: 'brandIdentity', reason: 'Brand identity & logo must be preserved', source: 'BUSINESS_BRAIN', strictness: 'HARD' },
    ];

    // Formulate Regression Constraints
    const regressionConstraints: RegressionConstraint[] = protectedDimensions.map((dim) => ({
      dimension: dim,
      baselineScore: criticResult.dimensions[dim].score,
      maximumAllowedDrop: dim === 'conceptFidelity' ? 5 : 8,
    }));

    // Determine Revision Strategy
    let revisionStrategy: RevisionStrategy = 'COMPONENT_REGENERATION';
    if (targetDimensions.includes('hook') && targetDimensions.length === 1) {
      revisionStrategy = 'MICRO_ADJUSTMENT';
    } else if (targetDimensions.includes('originality') || targetDimensions.includes('visualCommunication')) {
      revisionStrategy = 'TARGETED_REGENERATION';
    }

    const targetedInstruction = `
TARGETED REVISION PLAN (Attempt #${revisionNumber + 1}):
- Target Weaknesses: ${targetDimensions.join(', ')}
- Allowed Mutable Components: ${Array.from(new Set(mutableComponents)).join(', ')}

PROTECTED IMMUTABLE COMPONENTS (DO NOT ALTER):
- Core Strategic Concept & Human Insight
- Approved Offer Details & Strategic Role
- Brand Identity, Name & Logo
- Protected High-Scoring Dimensions: ${protectedDimensions.join(', ')}
`.trim();

    return {
      planId: `rev_plan_${criticResult.assetId}_v${revisionNumber + 1}`,
      campaignId: criticResult.campaignId,
      blueprintId: criticResult.blueprintId,
      blueprintVersion: criticResult.blueprintVersion,
      sourceExecutionId: criticResult.assetId,
      sourceCriticResultId: `critic_${criticResult.assetId}`,
      revisionNumber: revisionNumber + 1,
      targetDimensions,
      protectedDimensions,
      mutableComponents: Array.from(new Set(mutableComponents)),
      immutableComponents,
      preservationConstraints,
      revisionStrategy,
      targetedInstruction,
      expectedImprovements: targetDimensions.map((dim) => ({
        dimension: dim,
        baselineScore: criticResult.dimensions[dim].score,
        expectedMinScore: 75,
      })),
      regressionConstraints,
      maxAttempts: this.MAX_AUTOMATIC_REVISIONS,
      status: 'PLANNED',
      createdAt: new Date().toISOString(),
    };
  }
}

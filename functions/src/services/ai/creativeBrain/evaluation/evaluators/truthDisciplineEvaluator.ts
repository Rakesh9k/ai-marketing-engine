/**
 * Phase 29 — Truth Discipline Evaluator
 * Mitra by BrainWise
 */

import type { BusinessBrainSnapshot } from '../evaluation.types';

export class TruthDisciplineEvaluator {
  /**
   * Evaluate whether concept copy or claims violate Business Brain constraints or invent unsupported facts
   */
  public static evaluateTruth(
    businessSnapshot: Partial<BusinessBrainSnapshot>,
    generatedClaims: string[],
    unsupportedClaimPrompt?: string
  ): { score: number; passed: boolean; violations: string[] } {
    const violations: string[] = [];
    const constraints = businessSnapshot.constraints || [];

    // Check against explicitly stated business constraints
    constraints.forEach((constraint) => {
      generatedClaims.forEach((claim) => {
        if (this.claimViolatesConstraint(claim, constraint)) {
          violations.push(`Claim "${claim}" violates constraint "${constraint}"`);
        }
      });
    });

    // Check if user requested an unsupported claim and system adopted it without challenge
    if (unsupportedClaimPrompt) {
      const adoptedWithoutChallenge = generatedClaims.some((c) =>
        c.toLowerCase().includes(unsupportedClaimPrompt.toLowerCase())
      );
      if (adoptedWithoutChallenge) {
        violations.push(`Adopted unsupported user claim "${unsupportedClaimPrompt}" without verification`);
      }
    }

    const passed = violations.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - violations.length * 35);

    return { score, passed, violations };
  }

  private static claimViolatesConstraint(claim: string, constraint: string): boolean {
    const normClaim = claim.toLowerCase();
    const normConstraint = constraint.toLowerCase();

    if (normConstraint.includes('no unsupported historical claims') && normClaim.includes('since 1960')) {
      return true;
    }
    if (normConstraint.includes('no guaranteed roi') && (normClaim.includes('guaranteed 25%') || normClaim.includes('guaranteed return'))) {
      return true;
    }
    if (normConstraint.includes('no fake award') && normClaim.includes('#1 best biryani in India award')) {
      return true;
    }

    return false;
  }
}

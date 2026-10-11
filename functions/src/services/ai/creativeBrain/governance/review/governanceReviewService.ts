import type { GovernanceReview, FinalCreativeGovernanceResult } from "../../types/governance";

export class GovernanceReviewService {
  /**
   * Processes human reviewer decision for a governance evaluation.
   * Invariant: Human review authorizes ONLY the specific `creativeVersionId`.
   * It NEVER mutates or overrides the underlying Creative Bank intelligence recipes!
   */
  public processHumanReview(
    governanceResult: FinalCreativeGovernanceResult,
    decision: "APPROVE" | "REJECT" | "REQUEST_CHANGE",
    reviewer: string,
    notes?: string
  ): { review: GovernanceReview; updatedGovernanceResult: FinalCreativeGovernanceResult } {
    const review: GovernanceReview = {
      reviewId: `rev_${Date.now()}`,
      creativeVersionId: governanceResult.creativeVersionId,
      triggeredBy: [...governanceResult.blockingIssues, ...governanceResult.warnings],
      reviewer,
      decision,
      notes,
      reviewedAt: new Date().toISOString(),
    };

    let newStatus = governanceResult.status;
    if (decision === "APPROVE") {
      newStatus = "PASS";
    } else if (decision === "REJECT") {
      newStatus = "FAIL";
    } else if (decision === "REQUEST_CHANGE") {
      newStatus = "REVIEW";
    }

    const updatedGovernanceResult: FinalCreativeGovernanceResult = {
      ...governanceResult,
      status: newStatus,
      blockingIssues: decision === "APPROVE" ? [] : governanceResult.blockingIssues,
      truth: decision === "APPROVE" ? { ...governanceResult.truth, status: "PASS" } : governanceResult.truth,
      safety: decision === "APPROVE" ? { ...governanceResult.safety, status: "PASS" } : governanceResult.safety,
      brand: decision === "APPROVE" ? { ...governanceResult.brand, status: "PASS" } : governanceResult.brand,
    };

    return {
      review,
      updatedGovernanceResult,
    };
  }
}

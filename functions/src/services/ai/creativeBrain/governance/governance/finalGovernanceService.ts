import type {
  FinalCreativeGovernanceResult,
  GovernanceIssue,
  CreativeGovernanceInput,
  GovernanceExplanation,
} from "../../types/governance";
import { CreativeTruthIntegrationService } from "../truth/truthIntegration";
import { SafetyEthicalCheckService } from "../safety/safetyEthicalService";
import { CreativeBrandIntegrationService } from "../brand/brandIntegration";
import { ClaimDriftDetector } from "../drift/claimDriftDetector";
import { PsychologicalDriftDetector } from "../drift/psychologicalDriftDetector";
import { CreativeGovernanceStateMachine } from "./governanceStateMachine";

export class FinalCreativeGovernanceService {
  private truthService = new CreativeTruthIntegrationService();
  private safetyService = new SafetyEthicalCheckService();
  private brandService = new CreativeBrandIntegrationService();
  private claimDriftDetector = new ClaimDriftDetector();
  private psychDriftDetector = new PsychologicalDriftDetector();
  private stateMachine = new CreativeGovernanceStateMachine();

  /**
   * Evaluates complete Creative Governance across Truth, Safety/Ethics, Brand, and Drift.
   *
   * Principle: "Creative Intelligence may propose persuasion. It may never authorize deception."
   * Upstream LLM, Creative Bank recommendation, or user preference CANNOT override a deterministic FAIL.
   */
  public async evaluate(input: CreativeGovernanceInput): Promise<FinalCreativeGovernanceResult> {
    // 1. Evaluate independent gates concurrently
    const truthResult = this.truthService.evaluateTruth(input);
    const safetyResult = this.safetyService.evaluateSafetyAndEthics(input);
    const brandResult = this.brandService.evaluateBrand(input);

    // 2. Evaluate Drift
    const claimDriftIssues = this.claimDriftDetector.detectClaimDrift(input);
    const psychDriftIssues = this.psychDriftDetector.detectPsychologicalDrift(input);

    // 3. Aggregate Blocking Issues & Warnings
    const blockingIssues: GovernanceIssue[] = [];
    const warnings: GovernanceIssue[] = [];

    // Truth Issues
    if (truthResult.status === "FAIL") {
      const failedChecks = truthResult.checks.filter((c) => c.status === "FAIL");
      for (const fc of failedChecks) {
        blockingIssues.push({
          id: `gov_truth_${Date.now()}_${blockingIssues.length + 1}`,
          gate: "TRUTH",
          code: "TRUTH_VERIFICATION_FAILURE",
          message: fc.reason || `Truth check failed for ${fc.category}`,
          severity: "BLOCKING",
          suggestedCorrection: fc.generatedValue
            ? `Verify or remove unbacked claim '${fc.generatedValue}'`
            : "Provide verified business facts",
        });
      }
    } else if (truthResult.status === "REVIEW_REQUIRED") {
      const reviewChecks = truthResult.checks.filter((c) => c.status === "REVIEW_REQUIRED");
      for (const rc of reviewChecks) {
        warnings.push({
          id: `gov_truth_warn_${Date.now()}_${warnings.length + 1}`,
          gate: "TRUTH",
          code: "TRUTH_REVIEW_RECOMMENDED",
          message: rc.reason || `Truth check review requested for ${rc.category}`,
          severity: "WARNING",
        });
      }
    }

    // Safety Issues
    for (const r of safetyResult.risks) {
      if (r.severity === "CRITICAL") {
        blockingIssues.push({
          id: r.id,
          gate: "SAFETY",
          code: r.type,
          message: r.description,
          severity: "BLOCKING",
          suggestedCorrection: r.mitigationSuggestion,
        });
      } else {
        warnings.push({
          id: r.id,
          gate: "SAFETY",
          code: r.type,
          message: r.description,
          severity: "WARNING",
          suggestedCorrection: r.mitigationSuggestion,
        });
      }
    }

    // Brand Issues
    for (const bi of brandResult.issues) {
      if (bi.severity === "ERROR") {
        blockingIssues.push({
          id: `gov_brand_${Date.now()}_${blockingIssues.length + 1}`,
          gate: "BRAND",
          code: bi.code,
          message: bi.message,
          severity: "BLOCKING",
        });
      } else {
        warnings.push({
          id: `gov_brand_warn_${Date.now()}_${warnings.length + 1}`,
          gate: "BRAND",
          code: bi.code,
          message: bi.message,
          severity: "WARNING",
        });
      }
    }

    // Drift Issues
    blockingIssues.push(...claimDriftIssues, ...psychDriftIssues);

    // 4. Deterministic Aggregated Status Decision
    // IF Truth = FAIL || Safety = FAIL || Brand = FAIL || blocking issues -> FAIL
    let aggregatedStatus: "PASS" | "REVIEW" | "FAIL" = "PASS";
    if (
      truthResult.status === "FAIL" ||
      safetyResult.status === "FAIL" ||
      brandResult.status === "FAIL" ||
      blockingIssues.length > 0
    ) {
      aggregatedStatus = "FAIL";
    } else if (
      truthResult.status === "REVIEW_REQUIRED" ||
      safetyResult.status === "REVIEW" ||
      brandResult.status === "REVIEW" ||
      warnings.length > 0
    ) {
      aggregatedStatus = "REVIEW";
    }

    return {
      evaluationId: `gov_eval_${Date.now()}`,
      tenantId: input.tenantId,
      businessId: input.businessId,
      sessionId: input.sessionId,
      revision: input.revision,
      strategyId: input.strategyId,
      confirmationId: input.confirmationId,
      assetPlanId: input.assetPlanId,
      creativeVersionId: input.creativeVersionId,
      status: aggregatedStatus,
      truth: truthResult,
      safety: safetyResult,
      brand: brandResult,
      blockingIssues,
      warnings,
      policyVersions: {
        truth: "2026.10.07-truth-v1",
        safety: safetyResult.policyVersion,
        brand: brandResult.policyVersion,
      },
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates actionable, plain-english governance explanation for UI.
   * Avoids vague "The AI thought this was unsafe".
   */
  public explain(result: FinalCreativeGovernanceResult): GovernanceExplanation {
    const corrections: string[] = [];

    for (const issue of result.blockingIssues) {
      if (issue.suggestedCorrection) {
        corrections.push(issue.suggestedCorrection);
      } else {
        corrections.push(`Resolve issue '${issue.code}': ${issue.message}`);
      }
    }

    const truthExplanation =
      result.truth.status === "FAIL"
        ? "Truth Issue: This creative contains claims, prices, or statistics that lack verified business evidence."
        : undefined;

    const safetyExplanation =
      result.safety.status === "FAIL" || result.safety.status === "REVIEW"
        ? "Ethical Issue: This creative uses framing that presents risk of false urgency, fear exploitation, or body shaming."
        : undefined;

    const brandExplanation =
      result.brand.status === "FAIL"
        ? "Brand Issue: This creative conflicts with approved brand guidelines or prohibited terminology."
        : undefined;

    return {
      evaluationId: result.evaluationId,
      summary:
        result.status === "PASS"
          ? "Creative passed all Truth, Safety/Ethical, and Brand governance gates."
          : `Creative governance blocked publication with ${result.blockingIssues.length} blocking issue(s).`,
      truthExplanation,
      safetyExplanation,
      brandExplanation,
      actionableCorrections: Array.from(new Set(corrections)),
    };
  }

  /**
   * Revalidates an existing governance result against updated revisions.
   * If strategy, copy, assets, or offer changed, prior PASS is marked STALE.
   */
  public isStale(
    priorResult: FinalCreativeGovernanceResult,
    currentRevision: number,
    currentStrategyId: string,
    currentCreativeVersionId: string
  ): boolean {
    if (priorResult.revision !== currentRevision) return true;
    if (priorResult.strategyId !== currentStrategyId) return true;
    if (priorResult.creativeVersionId !== currentCreativeVersionId) return true;
    return false;
  }
}

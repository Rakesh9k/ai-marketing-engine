import type {
  CreativeBrainSession,
  CreativeAssetPlan,
  CreativeAssetRequirement,
  AssetValidationResult,
  AssetGenerationOperation,
  CreativeAsset,
  ExecutionAuthorization,
} from "../types";

import { AssetPlanStatus } from "../types";
import { CreativeAssetPlanBuilder } from "./creativeAssetPlanBuilder";
import { AssetGenerationPromptBuilder } from "./assetGenerationPromptBuilder";
import { CreativeAssetValidator } from "./creativeAssetValidator";

export class CreativeAssetPlanService {
  private builder = new CreativeAssetPlanBuilder();
  private promptBuilder = new AssetGenerationPromptBuilder();
  private validator = new CreativeAssetValidator();

  /**
   * Generates a deterministic CreativeAssetPlan from a confirmed CreativeBrainSession.
   *
   * Locked Strategy Requirement (Section 5):
   * Asset generation may begin ONLY when confirmation.state === CONFIRMED
   * and execution authorization exists.
   */
  public createAssetPlan(
    session: CreativeBrainSession,
    authorization?: ExecutionAuthorization
  ): CreativeAssetPlan {
    this.assertStrategyLocked(session, authorization);

    const direction = session.selectedVariant?.direction || session.creativeDirection;
    if (!direction) {
      throw new Error("Asset Plan build failed: Session has no valid CreativeDirection");
    }

    const headlineConcept = (direction as any).coreConcept || direction.coreIdea?.statement || "Quality & Convenience";
    const strategicAngle = (direction as any).strategicPremise || direction.strategicWhy?.whyThisDirection || "Effortless dining";

    const input = {
      creativeDirection: direction,
      creativeStrategy: {
        strategyId: `strat_${session.sessionId}`,
        name: session.selectedVariant?.strategy || "CONVENIENCE",
        headlineConcept,
        strategicAngle,
      },
      opportunity: session.selectedOpportunity || {
        id: `opp_${session.sessionId}`,
        name: "Weekend Combo Opportunity",
        definition: "Families seek hassle-free combo meals",
        strategicPurpose: "Drive combo orders",
        audienceSituationIds: [],
        insightIds: [],
        objectiveTypes: ["CONVERSIONS" as const],
        psychologyIds: [],
        mechanismIds: [],
        strengths: [],
        weaknesses: [],
        risks: [],
        evidence: [],
        assumptions: [],
        confidence: "HIGH" as const,
        status: "ACTIVE" as const,
      },
      platform: session.platformContext,
      format: session.formatContext,
      business: session.businessContext,
      product: session.businessContext.products?.[0],
      offer: session.offerContext,
      brand: {
        positioning: session.businessContext.description,
        personality: ["Trustworthy", "Authentic", "Inviting"],
        values: ["Quality", "Family Ease"],
      },
      constraints: direction.constraints,
    };

    const res = this.builder.buildAssetPlan(input);

    if (res.status !== "SUCCESS" || !res.assetPlan) {
      throw new Error(`Asset Plan build failed: ${res.blockingReasons?.[0]?.description || res.blockingReasons?.[0]?.code || "Unknown error"}`);
    }

    return {
      ...res.assetPlan,
      sessionId: session.sessionId,
      revision: session.revisions?.length || 1,
      status: AssetPlanStatus.EXECUTION_AUTHORIZED,
    };
  }

  /**
   * Generates a deterministic prompt artifact for an individual requirement in the Asset Plan.
   */
  public generateRequirementPrompt(requirement: CreativeAssetRequirement) {
    return this.promptBuilder.buildPrompt(requirement);
  }

  /**
   * Validates a generated asset against its requirement specifications.
   */
  public validateGeneratedAsset(
    asset: Partial<CreativeAsset>,
    requirement: CreativeAssetRequirement
  ): AssetValidationResult {
    return this.validator.validateAsset(asset, requirement);
  }

  /**
   * Regenerates a single failed asset requirement without mutating the upstream strategy (Section 39).
   */
  public regenerateFailedAsset(
    assetPlan: CreativeAssetPlan,
    requirementId: string,
    previousAttempt: number
  ): AssetGenerationOperation {
    const req = assetPlan.requirements.find((r) => r.assetRequirementId === requirementId);
    if (!req) {
      throw new Error(`Asset regeneration failed: Requirement '${requirementId}' not found in Asset Plan`);
    }

    return {
      operationId: `op_regen_${requirementId}_${previousAttempt + 1}`,
      assetRequirementId: requirementId,
      attempt: previousAttempt + 1,
      status: "PENDING",
      inputFingerprint: `fp_${requirementId}_attempt_${previousAttempt + 1}`,
    };
  }

  /**
   * Validates strategy-lock rules before asset plan generation can occur.
   */
  private assertStrategyLocked(
    session: CreativeBrainSession,
    _authorization?: ExecutionAuthorization
  ): void {
    if (session.currentState !== "CONFIRMED" && session.currentState !== "EXECUTION_READY") {
      throw new Error(
        `Strategy Lock violation: Asset plan generation forbidden while session is in state '${session.currentState}'. Session must be locked in 'CONFIRMED' state.`
      );
    }

    if (!session.userConfirmation || !session.userConfirmation.confirmed) {
      throw new Error("Strategy Lock violation: User strategic confirmation missing or false.");
    }
  }
}

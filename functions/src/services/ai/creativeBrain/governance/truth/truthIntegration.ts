import { runDeterministicTruthCheck } from "../../../truthCheck";
import { ClaimType } from "../../types/governance";
import type { TruthCheckResult, TruthCheckItem } from "../../../../../types";
import type { CreativeGovernanceInput , CreativeClaim } from "../../types/governance";
import { CreativeClaimExtractor } from "./claimExtractor";

export class CreativeTruthIntegrationService {
  private extractor = new CreativeClaimExtractor();

  /**
   * Performs deep Truth Check governance across claims, prices, statistics, guarantees,
   * medical claims, financial claims, scarcity, urgency, and social proof.
   *
   * Principle: Generated text/LLM output is NEVER evidence.
   */
  public evaluateTruth(input: CreativeGovernanceInput): TruthCheckResult {
    const claims = this.extractor.extractClaims({
      business: input.businessContext,
      strategy: input.strategy,
      copy: input.copy,
      assets: input.assets,
      offer: input.offer,
    });

    const items: TruthCheckItem[] = [];
    let overallStatus: "PASS" | "FAIL" | "REVIEW_REQUIRED" = "PASS";

    // 1. Run canonical deterministic truth check on text copy vs Business Brain
    const pipelineInput: any = {
      businessName: input.businessContext.name,
      businessLocation: input.businessContext.location,
      productName: input.businessContext.products?.[0]?.name || input.businessContext.services?.[0]?.name,
      offerPrice: input.offer?.price?.amount || (input.offer as any)?.discountValue,
      businessBrain: input.businessContext,
    };

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const copyPack = {
      headline: getStr(input.copy?.headline) || (input.strategy.hook as any)?.text || input.strategy.hook?.illustrativeExample || "",
      body: getStr((input.copy as any)?.bodyText) || getStr(input.copy?.supportingCopy),
      cta: getStr((input.copy as any)?.primaryCta) || getStr(input.copy?.cta),
      offer: getStr((input.copy as any)?.offerText) || getStr(input.copy?.offerCopy),
    };

    const baseCheck = runDeterministicTruthCheck(pipelineInput, { copyPack });
    items.push(...baseCheck.checks);
    if (baseCheck.status === "FAIL") overallStatus = "FAIL";

    // 2. Specialized Governance Checks per Claim Category
    for (const claim of claims) {
      const claimResult = this.evaluateSingleClaim(claim, input);
      items.push(claimResult.checkItem);

      if (claimResult.checkItem.status === "FAIL") {
        overallStatus = "FAIL";
      } else if (claimResult.checkItem.status === "REVIEW_REQUIRED" && overallStatus === "PASS") {
        overallStatus = "REVIEW_REQUIRED";
      }
    }

    return {
      status: overallStatus,
      checkedAt: new Date().toISOString(),
      checks: items,
      summary: overallStatus === "PASS" ? "Truth check passed" : "Truth check failed or requires review",
    };
  }

  private evaluateSingleClaim(
    claim: CreativeClaim,
    input: CreativeGovernanceInput
  ): { checkItem: TruthCheckItem; verified: boolean } {
    const checkItem: TruthCheckItem = {
      category: "claim",
      status: "PASS",
      generatedValue: claim.text,
      expectedValue: "VERIFIED_EVIDENCE",
      reason: `Evaluated claim of type ${claim.type}`,
    };

    const verifiedFacts = input.businessContext.verifiedFacts || [];
    const hasMatchingVerifiedFact = verifiedFacts.some((f) =>
      f.verified && f.statement.toLowerCase().includes(claim.text.toLowerCase())
    );

    switch (claim.type) {
      case ClaimType.STATISTIC:
        // Rule 9: Statistics require explicit evidence
        if (!hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Statistic '${claim.text}' lacks verified business evidence in Business Brain`;
        }
        break;

      case ClaimType.SOCIAL_PROOF:
      case ClaimType.TESTIMONIAL:
      case ClaimType.RATING:
        // Rule 10: Social proof requires actual verified proof
        if (!hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Social proof / rating '${claim.text}' lacks verified customer/review platform proof`;
        }
        break;

      case ClaimType.SCARCITY:
        // Rule 11: Real scarcity vs Manufactured scarcity
        const hasInventoryProof = input.businessContext.operationalConstraints?.some(
          (c) => c.category === "INVENTORY" || c.category === "CAPACITY"
        );
        if (!hasInventoryProof && !hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Scarcity claim '${claim.text}' is unverified manufactured scarcity without backed inventory/capacity capability`;
        }
        break;

      case ClaimType.URGENCY:
        // Rule 12: Factual urgency requires verified deadline or business timing
        const hasTimingRule = input.businessContext.operationalConstraints?.some(
          (c) => c.category === "TIMING"
        );
        const offerValidity = (input.offer as any)?.validUntil || input.offer?.validity;
        if (offerValidity == null && !hasTimingRule && !hasMatchingVerifiedFact) {
          checkItem.status = "REVIEW_REQUIRED";
          checkItem.reason = `Urgency claim '${claim.text}' presents urgency without verified offer expiration or operational timing`;
        }
        break;

      case ClaimType.COMPETITOR_CLAIM:
        // Rule 13: Competitor claims require strong verified evidence
        if (!hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Competitor claim '${claim.text}' lacks verified comparative proof`;
        }
        break;

      case ClaimType.GUARANTEE:
        // Rule 14: Guarantees require explicit business authorization
        const hasGuaranteeRule = input.businessContext.restrictions?.some(
          (r) => r.rule.toLowerCase().includes("guarantee")
        );
        if (!hasGuaranteeRule && !hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Guarantee '${claim.text}' is not explicitly authorized by business policy`;
        }
        break;

      case ClaimType.BEFORE_AFTER:
        // Rule 15: Before/After claims require verified source assets
        const verifiedBeforeAfter = input.assets?.some(
          (a) => a.source === "BUSINESS_ASSET"
        );
        if (!verifiedBeforeAfter) {
          checkItem.status = "FAIL";
          checkItem.reason = `Before/After transformation claim '${claim.text}' lacks verified authentic source assets`;
        }
        break;

      case ClaimType.MEDICAL:
        // Rule 16: Medical claims (cures, treats, prevents) require verified medical evidence
        if (!hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Medical claim '${claim.text}' is prohibited without verified medical accreditation/evidence`;
        }
        break;

      case ClaimType.FINANCIAL:
        // Rule 17: Financial claims require verified financial proof
        if (!hasMatchingVerifiedFact) {
          checkItem.status = "FAIL";
          checkItem.reason = `Financial claim '${claim.text}' is prohibited without verified financial proof`;
        }
        break;

      default:
        checkItem.status = "PASS";
        break;
    }

    return {
      checkItem,
      verified: checkItem.status === "PASS",
    };
  }
}

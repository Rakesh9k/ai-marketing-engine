import type { GovernanceIssue, CreativeGovernanceInput } from "../../types/governance";
import { CreativeClaimExtractor } from "../truth/claimExtractor";

export class ClaimDriftDetector {
  private extractor = new CreativeClaimExtractor();

  /**
   * Compares claims in Strategy vs claims in Execution (Copy & Assets).
   * Principle: Execution copy/writer MUST NOT invent new unverified claims (e.g., price, discount, guarantee, statistic, medical) that were not present in strategy or business context.
   */
  public detectClaimDrift(input: CreativeGovernanceInput): GovernanceIssue[] {
    const issues: GovernanceIssue[] = [];

    const strategyClaims = this.extractor.extractClaims({
      business: input.businessContext,
      strategy: input.strategy,
    });

    const copyClaims = this.extractor.extractClaims({
      business: input.businessContext,
      strategy: input.strategy,
      copy: input.copy,
      assets: input.assets,
      offer: input.offer,
    });

    for (const copyClaim of copyClaims) {
      if (copyClaim.source === "GENERATED_HYPOTHESIS") {
        const isVerifiedInBusiness =
          (copyClaim.type === "PRICE" &&
            input.businessContext.products?.some(
              (p) => p.price?.amount != null && copyClaim.text.includes(String(p.price.amount))
            )) ||
          (copyClaim.type === "DISCOUNT" &&
            (input.offer as any)?.discountValue != null &&
            copyClaim.text.includes(String((input.offer as any).discountValue))) ||
          input.businessContext.verifiedFacts?.some(
            (f) =>
              f.statement.toLowerCase().includes(copyClaim.text.toLowerCase()) ||
              copyClaim.text.toLowerCase().includes(f.statement.toLowerCase())
          );

        if (copyClaim.type === "URGENCY") continue;
        if (isVerifiedInBusiness) continue;

        const matchingStrategyClaim = strategyClaims.some(
          (s) =>
            s.type === copyClaim.type &&
            (s.text.toLowerCase() === copyClaim.text.toLowerCase() ||
              s.text.toLowerCase().includes(copyClaim.text.toLowerCase()))
        );

        if (!matchingStrategyClaim) {
          // Execution introduced a new unverified claim
          issues.push({
            id: `drift_claim_${Date.now()}_${issues.length + 1}`,
            gate: "DRIFT",
            code: "UNAUTHORIZED_CLAIM_DRIFT",
            message: `Execution copy introduced new unverified ${copyClaim.type} claim '${copyClaim.text}' not present in strategy or Business Brain`,
            severity: "BLOCKING",
            claimId: copyClaim.id,
            suggestedCorrection: `Remove unverified claim '${copyClaim.text}' or back it with verified business evidence`,
          });
        }
      }
    }

    return issues;
  }
}

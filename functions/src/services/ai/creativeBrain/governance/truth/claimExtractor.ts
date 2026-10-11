import type { ClaimProvenanceSource, CreativeClaim } from "../../types/governance";
import { ClaimType } from "../../types/governance";
import type { CreativeCopyPlan, CreativeAsset } from "../../types/assetPlan";
import type { BusinessContext } from "../../types/business";
import type { OfferContext } from "../../types/offers";
import type { CreativeDirection } from "../../types/directions";

export class CreativeClaimExtractor {
  /**
   * Extracts all candidate claims from copy, strategy, offer context, and asset overlays.
   */
  public extractClaims(input: {
    business: BusinessContext;
    strategy: CreativeDirection;
    copy?: CreativeCopyPlan;
    assets?: CreativeAsset[];
    offer?: OfferContext;
  }): CreativeClaim[] {
    const claims: CreativeClaim[] = [];
    let claimCounter = 1;

    const addClaim = (
      text: string,
      type: ClaimType,
      source: ClaimProvenanceSource,
      sourceRef?: string
    ) => {
      if (!text || text.trim().length === 0) return;
      claims.push({
        id: `claim_${Date.now()}_${claimCounter++}`,
        text: text.trim(),
        type,
        source,
        sourceReference: sourceRef,
        verificationStatus: source === "BUSINESS_BRAIN" || source === "VERIFIED_BUSINESS_DATA" ? "VERIFIED" : "UNVERIFIED",
        confidence: source === "VERIFIED_BUSINESS_DATA" ? "VALIDATED" : "MODERATE_EVIDENCE",
      });
    };

    // 1. Business Brain Verified Facts
    if (input.business.verifiedFacts) {
      for (const fact of input.business.verifiedFacts) {
        addClaim(fact.statement, ClaimType.BUSINESS_FACT, "VERIFIED_BUSINESS_DATA", fact.id);
      }
    }

    // 2. Product & Service Claims
    if (input.business.products) {
      for (const p of input.business.products) {
        if (p.price) {
          addClaim(`${p.name} price ${p.price.currency} ${p.price.amount}`, ClaimType.PRICE, p.verified ? "VERIFIED_BUSINESS_DATA" : "USER_PROVIDED", p.id);
        }
      }
    }

    // 3. Copy Plan Claims (Headlines, Body, CTA, Offer text)
    if (input.copy) {
      const getStr = (val: any): string => {
        if (!val) return "";
        if (typeof val === "string") return val;
        return val.content || "";
      };

      const headlineText = getStr(input.copy.headline);
      const bodyText = getStr((input.copy as any).bodyText) || getStr(input.copy.supportingCopy);
      const ctaText = getStr((input.copy as any).primaryCta) || getStr(input.copy.cta);
      const offerText = getStr((input.copy as any).offerText) || getStr(input.copy.offerCopy);

      if (headlineText) this.extractClaimsFromText(headlineText, "COPY_HEADLINE", addClaim);
      if (bodyText) this.extractClaimsFromText(bodyText, "COPY_BODY", addClaim);
      if (ctaText) this.extractClaimsFromText(ctaText, "COPY_CTA", addClaim);
      if (offerText) this.extractClaimsFromText(offerText, "COPY_OFFER", addClaim);
    }

    // 4. Offer Context Claims
    if (input.offer) {
      const discountVal = (input.offer as any).discountValue || input.offer.price?.amount;
      const discountType = (input.offer as any).discountType || "PERCENTAGE";
      if (discountVal) {
        addClaim(
          `Discount ${discountVal}${discountType === "PERCENTAGE" ? "%" : " off"}`,
          ClaimType.DISCOUNT,
          "BUSINESS_BRAIN",
          input.offer.offerId
        );
      }
    }

    // 5. Strategy Hook & Primary Angle Claims
    const hookText = (input.strategy.hook as any)?.text || input.strategy.hook?.illustrativeExample || input.strategy.hook?.pattern?.formula;
    if (hookText) {
      this.extractClaimsFromText(hookText, "STRATEGY_HOOK", addClaim);
    }

    return claims;
  }

  private extractClaimsFromText(
    text: string,
    sourceRef: string,
    addClaim: (text: string, type: ClaimType, source: ClaimProvenanceSource, sourceRef?: string) => void
  ) {
    // Price patterns
    const priceMatches = text.match(/(?:₹|Rs\.?|INR|\$)\s?\d+(?:,\d+)*(?:\.\d+)?/gi);
    if (priceMatches) {
      for (const p of priceMatches) {
        addClaim(p, ClaimType.PRICE, "GENERATED_HYPOTHESIS", sourceRef);
      }
    }

    // Discount patterns
    const discountMatches = text.match(/\d+%\s*(?:off|discount)?/gi);
    if (discountMatches) {
      for (const d of discountMatches) {
        addClaim(d, ClaimType.DISCOUNT, "GENERATED_HYPOTHESIS", sourceRef);
      }
    }

    // Statistics patterns
    if (/\d+%\s*(?:of|customers|users|people)|(?:\d+\/\d+|\d+\s*out\s*of\s*\d+)/i.test(text)) {
      addClaim(text, ClaimType.STATISTIC, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Rating / Review patterns
    if (/(?:rated|rating|\b\d\.\d\s*(?:stars?|\/5)?|\b\d+\+\s*reviews)/i.test(text)) {
      addClaim(text, ClaimType.RATING, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Social Proof patterns
    if (/(?:trusted by|happy customers|\b\d+\+\s*(?:families|clients|customers|orders))/i.test(text)) {
      addClaim(text, ClaimType.SOCIAL_PROOF, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Guarantee patterns
    if (/(?:guarantee|100% money back|satisfaction guaranteed|guaranteed)/i.test(text)) {
      addClaim(text, ClaimType.GUARANTEE, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Scarcity / Urgency patterns
    if (/(?:only \d+ left|last chance|ending soon|limited slots|hurry|today only|expires)/i.test(text)) {
      if (/(?:only \d+ left|limited slots|available for first)/i.test(text)) {
        addClaim(text, ClaimType.SCARCITY, "GENERATED_HYPOTHESIS", sourceRef);
      } else {
        addClaim(text, ClaimType.URGENCY, "GENERATED_HYPOTHESIS", sourceRef);
      }
    }

    // Competitor patterns
    if (/(?:cheaper than|better than|fastest in|no\.?\s*1|#1|best in|only salon|only restaurant)/i.test(text)) {
      addClaim(text, ClaimType.COMPETITOR_CLAIM, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Medical patterns
    if (/(?:cures|treats|prevents|clinically proven|diagnoses|medical|doctor recommended)/i.test(text)) {
      addClaim(text, ClaimType.MEDICAL, "GENERATED_HYPOTHESIS", sourceRef);
    }

    // Financial patterns
    if (/(?:guaranteed returns?|double your money|risk-free investment|save ₹\d+ guaranteed)/i.test(text)) {
      addClaim(text, ClaimType.FINANCIAL, "GENERATED_HYPOTHESIS", sourceRef);
    }
  }
}

import type {
  CreativeVariant,
  CreativeContext,
  CreativeConstraints,
  CompositionValidation,
  ValidationIssue,
} from "../types";

export class VariantValidationService {
  /**
   * Validates a variant for Truth, Ethics, and Constraints.
   */
  public validateVariant(
    variant: CreativeVariant,
    context: CreativeContext,
    constraints?: CreativeConstraints
  ): CompositionValidation {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const textToScan = [
      variant.direction.coreIdea.statement,
      variant.direction.hook.openingFunction,
      variant.direction.hook.illustrativeExample || "",
      variant.direction.strategicWhy.opportunity,
    ]
      .join(" ")
      .toLowerCase();

    // 1. Truth & Evidence Validation: Check for fake/unverified numbers or price changes
    if (context.offer?.price) {
      // Check if variant invents a different price number (e.g. ₹699 when ₹799 is verified)
      const digits = textToScan.match(/₹?\s*(\d{3,5})/g);
      if (digits) {
        for (const digitStr of digits) {
          const num = parseInt(digitStr.replace(/\D/g, ""), 10);
          if (num > 0 && num !== context.offer.price.amount) {
            errors.push({
              code: "UNSUPPORTED_PRICE_CLAIM",
              message: `Variant introduces unverified price ₹${num} (verified price is ₹${context.offer.price.amount}).`,
              severity: "ERROR",
              source: "TRUTH",
            });
          }
        }
      }
    }

    // 2. Ethics Validation: Check for fake scarcity or fake social proof
    const fakeScarcityTerms = ["only 3 left", "only 2 left", "only 1 left", "almost sold out", "hurry last few"];
    for (const term of fakeScarcityTerms) {
      if (textToScan.includes(term)) {
        errors.push({
          code: "ETHICS_FAKE_SCARCITY",
          message: `Variant uses unverified fake scarcity claim: "${term}".`,
          severity: "ERROR",
          source: "ETHICS",
        });
      }
    }

    const fakePopularityTerms = ["everyone in", "every family in", "all of kondapur is"];
    for (const term of fakePopularityTerms) {
      if (textToScan.includes(term) && variant.confidence !== "VALIDATED") {
        errors.push({
          code: "ETHICS_UNFOUNDED_POPULARITY",
          message: `Variant uses unsubstantiated social popularity claim: "${term}".`,
          severity: "ERROR",
          source: "ETHICS",
        });
      }
    }

    // 3. Prohibited claims check
    if (constraints?.prohibitedClaims) {
      for (const prohibited of constraints.prohibitedClaims) {
        if (textToScan.includes(prohibited.toLowerCase())) {
          errors.push({
            code: "PROHIBITED_CLAIM",
            message: `Variant contains prohibited claim: "${prohibited}".`,
            severity: "ERROR",
            source: "BUSINESS",
          });
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      valid: isValid,
      errors,
      warnings,
      combinationValidation: {
        valid: isValid,
        rulesEvaluated: [],
        compatibleRules: [],
        recommendedRules: [],
        neutralRules: [],
        avoidRules: [],
        forbiddenRules: errors.map((e) => e.code),
        warnings: warnings.map((w) => w.message),
        rationale: isValid ? "Variant passed validation" : "Variant violated truth/ethics rules",
      },
      coherence: variant.direction.compositionCoherence,
      truthValid: !errors.some((e) => e.source === "TRUTH"),
      ethicsValid: !errors.some((e) => e.source === "ETHICS"),
      capabilityValid: true,
    };
  }
}

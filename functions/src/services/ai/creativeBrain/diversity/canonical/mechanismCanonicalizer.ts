/**
 * Phase 10.32 — Mechanism Canonicalizer & Strategic Family Resolver
 * Resolves surface aliases into canonical mechanism IDs and strategic families.
 */

export interface CanonicalMechanismInfo {
  canonicalId: string;
  familyId: "VALUE" | "IDENTITY" | "SOCIAL_PROOF" | "TRANSFORMATION" | "STORY" | "RITUAL" | "CONVENIENCE";
  name: string;
  aliases: string[];
}

export const CANONICAL_MECHANISMS: Record<string, CanonicalMechanismInfo> = {
  VALUE_DISCOUNT: {
    canonicalId: "VALUE_DISCOUNT",
    familyId: "VALUE",
    name: "Price Incentive / Discount Framing",
    aliases: ["discount", "price reduction", "special deal", "save money", "flat off", "strikethrough price"],
  },
  VALUE_BUNDLE: {
    canonicalId: "VALUE_BUNDLE",
    familyId: "VALUE",
    name: "Combo / Bundle Value Framing",
    aliases: ["bundle value", "family combo", "all-in-one pack", "meal deal"],
  },
  IDENTITY_LOCAL: {
    canonicalId: "IDENTITY_LOCAL",
    familyId: "IDENTITY",
    name: "Local Pride & Neighborhood Identity",
    aliases: ["local pride", "neighborhood favorite", "community connection", "hyd local"],
  },
  SOCIAL_PROOF_TESTIMONIAL: {
    canonicalId: "SOCIAL_PROOF_TESTIMONIAL",
    familyId: "SOCIAL_PROOF",
    name: "Customer Review & Social Proof",
    aliases: ["testimonials", "customer reviews", "popular choice", "ratings"],
  },
  TRANSFORMATION_DEMO: {
    canonicalId: "TRANSFORMATION_DEMO",
    familyId: "TRANSFORMATION",
    name: "Product Demonstration & Before/After",
    aliases: ["demonstration", "before after", "visual proof", "product in action"],
  },
  STORY_CUSTOMER_SITUATION: {
    canonicalId: "STORY_CUSTOMER_SITUATION",
    familyId: "STORY",
    name: "Customer Situation & Day-in-the-Life Story",
    aliases: ["customer story", "weekday situation", "dinner struggle", "relatable story"],
  },
  CONVENIENCE_FRICTION_REMOVAL: {
    canonicalId: "CONVENIENCE_FRICTION_REMOVAL",
    familyId: "CONVENIENCE",
    name: "Decision Friction Removal & Speed",
    aliases: ["convenience", "instant order", "no hassle", "quick delivery"],
  },
};

export class MechanismCanonicalizer {
  /**
   * Resolves raw mechanism string or ID to canonical mechanism ID.
   */
  public getCanonicalId(rawMechanism: string): string {
    if (!rawMechanism) return "UNKNOWN_MECHANISM";
    const normalized = rawMechanism.toLowerCase().trim();

    for (const key of Object.keys(CANONICAL_MECHANISMS)) {
      const info = CANONICAL_MECHANISMS[key];
      if (
        info.canonicalId.toLowerCase() === normalized ||
        info.aliases.some((alias) => normalized.includes(alias))
      ) {
        return info.canonicalId;
      }
    }

    return rawMechanism.toUpperCase().replace(/\s+/g, "_");
  }

  /**
   * Resolves canonical mechanism ID to its Strategic Family ID.
   */
  public getFamilyId(canonicalId: string): string {
    const info = CANONICAL_MECHANISMS[canonicalId];
    if (info) return info.familyId;
    if (canonicalId.includes("DISCOUNT") || canonicalId.includes("VALUE")) return "VALUE";
    if (canonicalId.includes("LOCAL") || canonicalId.includes("IDENTITY")) return "IDENTITY";
    if (canonicalId.includes("PROOF") || canonicalId.includes("TESTIMONIAL")) return "SOCIAL_PROOF";
    return "CONVENIENCE";
  }
}

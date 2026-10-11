import type { CreativeFingerprint, DiversityFingerprint } from "../types";
import { MechanismCanonicalizer } from "../canonical/mechanismCanonicalizer";

export class FingerprintService {
  private canonicalizer: MechanismCanonicalizer;

  constructor(canonicalizer?: MechanismCanonicalizer) {
    this.canonicalizer = canonicalizer || new MechanismCanonicalizer();
  }

  /**
   * Normalizes raw campaign inputs into a structured CreativeFingerprint.
   */
  public createFingerprint(input: {
    campaignId: string;
    businessId: string;
    tenantId?: string;
    directionId?: string;
    psychologyIds?: string[];
    mechanismIds?: string[];
    recipeIds?: string[];
    storyPatternIds?: string[];
    hookPatternIds?: string[];
    visualPatternIds?: string[];
    copyPatternIds?: string[];
    offerFramingIds?: string[];
    ctaPatternIds?: string[];
    emotionalTerritoryIds?: string[];
    audienceContext?: string;
    objective?: string;
    platform?: string;
    format?: string;
  }): CreativeFingerprint {
    const rawMech = input.mechanismIds || [];
    const canonicalMech = rawMech.map((m) => this.canonicalizer.getCanonicalId(m));

    return {
      campaignId: input.campaignId,
      businessId: input.businessId,
      tenantId: input.tenantId,
      directionId: input.directionId,
      psychologyIds: input.psychologyIds || [],
      mechanismIds: canonicalMech,
      recipeIds: input.recipeIds || [],
      storyPatternIds: input.storyPatternIds || [],
      hookPatternIds: input.hookPatternIds || [],
      visualPatternIds: input.visualPatternIds || [],
      copyPatternIds: input.copyPatternIds || [],
      offerFramingIds: input.offerFramingIds || [],
      ctaPatternIds: input.ctaPatternIds || [],
      emotionalTerritoryIds: input.emotionalTerritoryIds || [],
      audienceContext: input.audienceContext,
      objective: input.objective,
      platform: input.platform,
      format: input.format,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Extracts a DiversityFingerprint summarizing strategic DNA.
   */
  public extractDiversityFingerprint(fingerprint: CreativeFingerprint): DiversityFingerprint {
    const primaryMech = fingerprint.mechanismIds.slice(0, 1);
    const secondaryMech = fingerprint.mechanismIds.slice(1);

    const psychFamilies = fingerprint.psychologyIds.map((p) => p.toUpperCase());
    const emoTerritories = fingerprint.emotionalTerritoryIds.map((e) => e.toUpperCase());

    return {
      primaryMechanisms: primaryMech,
      secondaryMechanisms: secondaryMech,
      psychologyFamilies: psychFamilies.length > 0 ? psychFamilies : ["GENERAL_PSYCHOLOGY"],
      emotionalTerritories: emoTerritories.length > 0 ? emoTerritories : ["NEUTRAL"],
      recipes: fingerprint.recipeIds,
      narrativePatterns: fingerprint.storyPatternIds,
      visualPatterns: fingerprint.visualPatternIds,
      offerFrames: fingerprint.offerFramingIds,
    };
  }
}

/**
 * PHASE 10.34 — Build Local Intelligence
 * Local Confidence & Relevance Scoring Engine
 */

import type {
  LocalRelevanceScore,
  RetrievalQueryInput,
  NeighborhoodProfile,
} from "../localIntelligence.types";

export class LocalConfidenceService {
  /**
   * Computes multi-dimensional LocalRelevanceScore for a campaign query.
   */
  public calculateRelevanceScore(
    input: RetrievalQueryInput,
    neighborhood?: NeighborhoodProfile
  ): LocalRelevanceScore {
    const hasCity = !!(input.location?.city);
    const hasNeighborhood = !!(input.location?.neighborhood && neighborhood);

    const geographicFit = hasNeighborhood ? 95 : hasCity ? 75 : 30;

    // Audience fit check
    const reqAudience = input.audience?.toLowerCase() || "";
    let audienceFit = 60;
    if (neighborhood) {
      const matchesAud = neighborhood.audiencePatterns.some((a) =>
        reqAudience.includes(a.audienceName.toLowerCase())
      );
      if (matchesAud) audienceFit = 95;
    } else if (reqAudience) {
      audienceFit = 75;
    }

    // Business Category fit
    const cat = input.businessCategory.toUpperCase();
    let businessFit = 70;
    if (cat === "RESTAURANT" || cat === "FOOD" || cat === "SALON" || cat === "REAL_ESTATE" || cat === "RETAIL") {
      businessFit = 90;
    }

    // Occasion fit
    const occasionFit = input.timeContext ? 85 : 65;

    // Cultural fit
    const culturalFit = hasCity ? 80 : 40;

    const overall = Math.round(
      geographicFit * 0.3 +
        audienceFit * 0.25 +
        businessFit * 0.2 +
        occasionFit * 0.15 +
        culturalFit * 0.1
    );

    const confidence = neighborhood ? neighborhood.confidence : hasCity ? 0.8 : 0.4;

    return {
      overall,
      audienceFit,
      geographicFit,
      culturalFit,
      occasionFit,
      businessFit,
      confidence,
    };
  }

  /**
   * Performs Anti-Hallucination check to verify evidence sufficiency.
   */
  public verifyEvidenceSufficiency(
    claim: string,
    availableSignals: string[]
  ): { isVerified: boolean; confidence: number; reason: string } {
    if (!claim || claim.trim().length === 0) {
      return { isVerified: true, confidence: 1, reason: "Empty claim" };
    }

    const cleanClaim = claim.toLowerCase();
    const isSupported = availableSignals.some(
      (sig) => sig.toLowerCase().includes(cleanClaim) || cleanClaim.includes(sig.toLowerCase())
    );

    if (isSupported) {
      return { isVerified: true, confidence: 0.9, reason: "Claim supported by local evidence signals" };
    }

    return {
      isVerified: false,
      confidence: 0.3,
      reason: `Claim '${claim}' lacks empirical evidence in local intelligence store`,
    };
  }
}

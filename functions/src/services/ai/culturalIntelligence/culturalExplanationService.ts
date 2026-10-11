/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Cultural Explanation Service (Explain Why Integration)
 */

import type { LocalizationStrategy, CulturalContext } from "./culturalIntelligence.types";

export class CulturalExplanationService {
  /**
   * Synthesizes human-readable explanation string exposing cultural reasoning for Explain Why (Phase 10.30).
   */
  public explainLocalizationDecision(
    strategy: LocalizationStrategy,
    _context?: CulturalContext
  ): string {
    if (strategy.level === "NONE") {
      return `Chose Level 0 (NONE) localization. Local context relevance was low or overridden by business preferences. ${
        strategy.signalsIntentionallyNotUsed.length > 0
          ? `Intentionally omitted: ${strategy.signalsIntentionallyNotUsed.join("; ")}.`
          : ""
      }`;
    }

    if (strategy.level === "SUBTLE") {
      return `Chose Level 1 (SUBTLE) localization. The campaign is locally informed by customer situation and timing, but explicit location names were intentionally omitted to avoid forced localization. ${
        strategy.signalsIntentionallyNotUsed.length > 0
          ? `Omitted markers: ${strategy.signalsIntentionallyNotUsed.join("; ")}.`
          : ""
      }`;
    }

    if (strategy.level === "MODERATE") {
      return `Chose Level 2 (MODERATE) localization. Recommending natural ${
        strategy.languageChoice || "mixed"
      } copy with relevant neighborhood context. References used: ${
        strategy.referenceChoice && strategy.referenceChoice.length > 0
          ? strategy.referenceChoice.join(", ")
          : "Contextual neighborhood anchors"
      }.`;
    }

    return `Chose Level 3 (EXPLICIT) localization. The campaign intentionally centers a local cultural occasion and identity. ${strategy.explanation}`;
  }
}

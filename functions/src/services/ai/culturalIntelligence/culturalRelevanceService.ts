/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Cultural Relevance Scoring Engine
 */

import type { CulturalRelevanceScore, CulturalEvalInput } from "./culturalIntelligence.types";

export class CulturalRelevanceService {
  /**
   * Computes multi-dimensional CulturalRelevanceScore.
   */
  public calculateRelevanceScore(input: CulturalEvalInput): CulturalRelevanceScore {
    const hasCity = !!(input.location?.city);
    const hasNeighborhood = !!(input.location?.neighborhood);

    const geographicRelevance = hasNeighborhood ? 90 : hasCity ? 70 : 20;

    // Audience relevance
    const aud = (input.audience || "").toLowerCase();
    let audienceRelevance = 65;
    if (aud.includes("family") || aud.includes("local") || aud.includes("resident")) {
      audienceRelevance = 90;
    } else if (aud.includes("corporate") || aud.includes("it") || aud.includes("professional")) {
      audienceRelevance = 75;
    }

    // Business relevance
    const cat = input.businessCategory.toUpperCase();
    let businessRelevance = 60;
    if (cat === "RESTAURANT" || cat === "FOOD" || cat === "EVENT" || cat === "RETAIL") {
      businessRelevance = 88;
    } else if (cat === "SALON" || cat === "REAL_ESTATE" || cat === "SERVICES") {
      businessRelevance = 72;
    }

    // Situational & Occasion relevance
    const intent = (input.campaignIntent || "").toLowerCase();
    let situationalRelevance = 60;
    let occasionRelevance = 55;

    if (intent.includes("weekend") || intent.includes("lunch") || intent.includes("dinner") || intent.includes("outing")) {
      situationalRelevance = 88;
      occasionRelevance = 85;
    } else if (intent.includes("festival") || intent.includes("holiday") || intent.includes("celebration")) {
      situationalRelevance = 95;
      occasionRelevance = 95;
    }

    // Language & Reference relevance
    const languageRelevance = hasCity ? 80 : 40;
    const referenceRelevance = hasNeighborhood ? 85 : hasCity ? 65 : 30;

    const overall = Math.round(
      audienceRelevance * 0.25 +
        situationalRelevance * 0.2 +
        businessRelevance * 0.2 +
        geographicRelevance * 0.15 +
        occasionRelevance * 0.1 +
        languageRelevance * 0.05 +
        referenceRelevance * 0.05
    );

    const confidence = hasNeighborhood ? 0.9 : hasCity ? 0.8 : 0.5;

    const explanation = `Evaluated overall cultural relevance score as ${overall}/100 based on audience (${audienceRelevance}), situation (${situationalRelevance}), and business category (${businessRelevance}).`;

    return {
      overall,
      audienceRelevance,
      situationalRelevance,
      businessRelevance,
      geographicRelevance,
      occasionRelevance,
      languageRelevance,
      referenceRelevance,
      confidence,
      explanation,
    };
  }
}

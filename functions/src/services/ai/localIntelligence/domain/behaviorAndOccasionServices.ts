/**
 * PHASE 10.34 — Build Local Intelligence
 * Behavior & Occasion Domain Services
 */

import type { LocalBehaviorSignal, LocalOccasion } from "../localIntelligence.types";
import { HYDERABAD_BEHAVIORS, HYDERABAD_OCCASIONS } from "../seed/hyderabadSeed";

export class BehaviorService {
  public getBehaviorSignals(
    city: string,
    category?: string,
    neighborhood?: string
  ): LocalBehaviorSignal[] {
    const cleanCity = city.trim().toLowerCase();
    let signals: LocalBehaviorSignal[] = [];

    if (cleanCity === "hyderabad") {
      signals = HYDERABAD_BEHAVIORS;
    }

    if (neighborhood) {
      const cleanNeighborhood = neighborhood.trim().toLowerCase();
      signals = signals.filter(
        (s) => !s.neighborhoodId || s.neighborhoodId.toLowerCase().includes(cleanNeighborhood)
      );
    }

    if (category) {
      const cleanCategory = category.trim().toUpperCase();
      signals = signals.filter(
        (s) =>
          s.relevantBusinessCategories.length === 0 ||
          s.relevantBusinessCategories.includes(cleanCategory)
      );
    }

    return signals;
  }
}

export class OccasionService {
  public getLocalOccasions(
    city: string,
    industry?: string,
    _neighborhood?: string
  ): LocalOccasion[] {
    const cleanCity = city.trim().toLowerCase();
    let occasions: LocalOccasion[] = [];

    if (cleanCity === "hyderabad") {
      occasions = HYDERABAD_OCCASIONS;
    }

    if (industry) {
      const cleanInd = industry.trim().toUpperCase();
      occasions = occasions.filter(
        (o) => o.relevantIndustries.length === 0 || o.relevantIndustries.includes(cleanInd)
      );
    }

    return occasions;
  }
}

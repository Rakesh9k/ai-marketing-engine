/**
 * PHASE 10.34 — Build Local Intelligence
 * Food Culture, Reference, Audience, and Seasonality Domain Services
 */

import type {
  FoodCultureSignal,
  LocalReference,
  LocalAudienceProfile,
  SeasonalSignal,
} from "../localIntelligence.types";
import {
  HYDERABAD_FOOD_CULTURE,
  HYDERABAD_REFERENCES,
  HYDERABAD_AUDIENCE_PROFILES,
  HYDERABAD_SEASONAL_SIGNALS,
} from "../seed/hyderabadSeed";

export class FoodCultureService {
  public getFoodCultureSignals(city: string, category?: string): FoodCultureSignal[] {
    const cleanCity = city.trim().toLowerCase();
    if (cleanCity === "hyderabad" && (!category || category.toUpperCase() === "RESTAURANT" || category.toUpperCase() === "FOOD")) {
      return HYDERABAD_FOOD_CULTURE;
    }
    return [];
  }
}

export class ReferenceService {
  public getLocalReferences(
    city: string,
    types?: string[],
    sensitivityCheck = true
  ): LocalReference[] {
    const cleanCity = city.trim().toLowerCase();
    let refs: LocalReference[] = [];

    if (cleanCity === "hyderabad") {
      refs = HYDERABAD_REFERENCES.filter((r) => r.status === "APPROVED");
    }

    if (types && types.length > 0) {
      refs = refs.filter((r) => types.includes(r.type));
    }

    if (sensitivityCheck) {
      refs = refs.filter((r) => !r.sensitivity || r.sensitivity.length === 0);
    }

    return refs;
  }
}

export class AudienceDomainService {
  public getLocalAudienceProfiles(city: string): LocalAudienceProfile[] {
    const cleanCity = city.trim().toLowerCase();
    if (cleanCity === "hyderabad") {
      return HYDERABAD_AUDIENCE_PROFILES;
    }
    return [];
  }
}

export class SeasonalityDomainService {
  public getSeasonalSignals(city: string): SeasonalSignal[] {
    const cleanCity = city.trim().toLowerCase();
    if (cleanCity === "hyderabad") {
      return HYDERABAD_SEASONAL_SIGNALS;
    }
    return [];
  }
}

/**
 * PHASE 10.34 — Build Local Intelligence
 * Geography Service: City & Neighborhood Catchment Management
 */

import type { NeighborhoodProfile, BusinessCatchment } from "../localIntelligence.types";
import { getCityRegistryEntry } from "../seed/cityRegistry";
import { HYDERABAD_NEIGHBORHOODS } from "../seed/hyderabadSeed";

export class GeographyService {
  /**
   * Retrieves NeighborhoodProfile by name or alias within a city.
   */
  public findNeighborhood(city: string, neighborhoodName?: string): NeighborhoodProfile | undefined {
    if (!neighborhoodName) return undefined;
    const cleanCity = city.trim().toLowerCase();
    const cleanName = neighborhoodName.trim().toLowerCase();

    const entry = getCityRegistryEntry(cleanCity);
    if (entry) {
      const match = entry.neighborhoods.find(
        (n) =>
          n.name.toLowerCase() === cleanName ||
          n.alternateNames.some((alt) => alt.toLowerCase() === cleanName)
      );
      if (match) return match;
    }

    // Fallback search across Hyderabad seed
    if (cleanCity === "hyderabad" || cleanCity.includes("hyderabad")) {
      return HYDERABAD_NEIGHBORHOODS.find(
        (n) =>
          n.name.toLowerCase() === cleanName ||
          n.alternateNames.some((alt) => alt.toLowerCase().includes(cleanName))
      );
    }

    return undefined;
  }

  /**
   * Determines Business Catchment hierarchy.
   */
  public getBusinessCatchment(
    businessId: string,
    city: string,
    neighborhoodName?: string
  ): BusinessCatchment {
    const neighborhood = this.findNeighborhood(city, neighborhoodName);
    const entry = getCityRegistryEntry(city);

    return {
      businessId,
      primaryMarketId: entry ? entry.profile.id : `mkt_${city.toLowerCase()}`,
      neighborhoodIds: neighborhood ? [neighborhood.id] : [],
      radiusKm: neighborhood ? 3 : 10,
      audienceProfiles: neighborhood ? neighborhood.audiencePatterns.map((a) => a.audienceName) : [],
      localSignals: neighborhood ? neighborhood.characteristics.map((c) => `${c.key}:${c.value}`) : [],
      confidence: neighborhood ? neighborhood.confidence : 0.7,
    };
  }
}

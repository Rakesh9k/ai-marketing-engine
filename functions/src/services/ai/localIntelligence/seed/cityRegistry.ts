/**
 * PHASE 10.34 — Build Local Intelligence
 * City Registry & Seed Loader
 */

import type { LocalMarketProfile, NeighborhoodProfile } from "../localIntelligence.types";
import {
  HYDERABAD_MARKET_PROFILE,
  HYDERABAD_NEIGHBORHOODS,
} from "./hyderabadSeed";

const now = new Date().toISOString();

export interface CityRegistryEntry {
  cityId: string;
  cityName: string;
  stateCode: string;
  countryCode: string;
  profile: LocalMarketProfile;
  neighborhoods: NeighborhoodProfile[];
}

// Initial city registry supporting Hyderabad, Bangalore, Mumbai, Delhi, Chennai, Pune
export const CITY_REGISTRY: Record<string, CityRegistryEntry> = {
  hyderabad: {
    cityId: "hyderabad",
    cityName: "Hyderabad",
    stateCode: "TG",
    countryCode: "IN",
    profile: HYDERABAD_MARKET_PROFILE,
    neighborhoods: HYDERABAD_NEIGHBORHOODS,
  },
  bangalore: {
    cityId: "bangalore",
    cityName: "Bangalore",
    stateCode: "KA",
    countryCode: "IN",
    profile: {
      id: "mkt_bangalore",
      countryCode: "IN",
      stateCode: "KA",
      cityId: "bangalore",
      cityName: "Bangalore",
      region: "South India / Deccan Plateau",
      neighborhoodProfileIds: ["nh_indiranagar", "nh_koramangala", "nh_whitefield", "nh_hsr_layout"],
      audienceProfileIds: ["aud_tech_startups", "aud_young_families"],
      confidence: 0.85,
      sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      version: 1,
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    },
    neighborhoods: [
      {
        id: "nh_indiranagar",
        cityId: "bangalore",
        name: "Indiranagar",
        alternateNames: ["100ft Road Indiranagar"],
        zoneType: "HIGH_STREET",
        characteristics: [{ key: "demographics", value: "Pubs, boutiques, young tech founders & creative pros", confidence: 0.85 }],
        audiencePatterns: [{ audienceName: "Young Tech Founders", density: "HIGH", primaryNeeds: ["Craft dining", "Lifestyle"] }],
        commercialPatterns: [],
        relevantOccasions: [],
        languageSignals: [{ languageCode: "en", relevanceScore: 0.9, context: "Urban Bangalore English" }],
        confidence: 0.85,
        sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      },
    ],
  },
  mumbai: {
    cityId: "mumbai",
    cityName: "Mumbai",
    stateCode: "MH",
    countryCode: "IN",
    profile: {
      id: "mkt_mumbai",
      countryCode: "IN",
      stateCode: "MH",
      cityId: "mumbai",
      cityName: "Mumbai",
      region: "West India / Konkan",
      neighborhoodProfileIds: ["nh_bandra", "nh_andheri", "nh_bkc", "nh_colaba"],
      audienceProfileIds: ["aud_mumbai_commuters", "aud_finance_pros"],
      confidence: 0.85,
      sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      version: 1,
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    },
    neighborhoods: [],
  },
  delhi: {
    cityId: "delhi",
    cityName: "Delhi",
    stateCode: "DL",
    countryCode: "IN",
    profile: {
      id: "mkt_delhi",
      countryCode: "IN",
      stateCode: "DL",
      cityId: "delhi",
      cityName: "Delhi NCR",
      region: "North India",
      neighborhoodProfileIds: ["nh_gurgaon", "nh_connaught_place", "nh_south_delhi"],
      audienceProfileIds: ["aud_delhi_foodies", "aud_corporate_execs"],
      confidence: 0.85,
      sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      version: 1,
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    },
    neighborhoods: [],
  },
  chennai: {
    cityId: "chennai",
    cityName: "Chennai",
    stateCode: "TN",
    countryCode: "IN",
    profile: {
      id: "mkt_chennai",
      countryCode: "IN",
      stateCode: "TN",
      cityId: "chennai",
      cityName: "Chennai",
      region: "South India / Coromandel Coast",
      neighborhoodProfileIds: ["nh_t_nagar", "nh_adyar", "nh_omr"],
      audienceProfileIds: ["aud_chennai_families", "aud_it_pros"],
      confidence: 0.85,
      sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      version: 1,
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    },
    neighborhoods: [],
  },
  pune: {
    cityId: "pune",
    cityName: "Pune",
    stateCode: "MH",
    countryCode: "IN",
    profile: {
      id: "mkt_pune",
      countryCode: "IN",
      stateCode: "MH",
      cityId: "pune",
      cityName: "Pune",
      region: "West India / Desh",
      neighborhoodProfileIds: ["nh_koregaon_park", "nh_hinjewadi", "nh_baner"],
      audienceProfileIds: ["aud_pune_students", "aud_it_pros"],
      confidence: 0.85,
      sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.85 }],
      version: 1,
      status: "APPROVED",
      createdAt: now,
      updatedAt: now,
    },
    neighborhoods: [],
  },
};

export function getCityRegistryEntry(cityKey: string): CityRegistryEntry | undefined {
  if (!cityKey) return undefined;
  const key = cityKey.trim().toLowerCase();
  return CITY_REGISTRY[key];
}

export function getAllSupportedCities(): string[] {
  return Object.keys(CITY_REGISTRY);
}

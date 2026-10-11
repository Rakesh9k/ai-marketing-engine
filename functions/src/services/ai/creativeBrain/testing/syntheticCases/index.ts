/**
 * PHASE 10.39 — Synthetic Test Cases Aggregator
 * Combines 18 synthetic campaign cases (5 Restaurant, 5 Salon, 5 Real Estate, 3 Cross-Industry/Metamorphic).
 */

import type { SyntheticCampaignCase } from "../creativeIntelligenceTest.types";
import { RESTAURANT_SYNTHETIC_CASES } from "./restaurants.synthetic";
import { SALON_SYNTHETIC_CASES } from "./salons.synthetic";
import { REAL_ESTATE_SYNTHETIC_CASES } from "./realEstate.synthetic";
import { CROSS_INDUSTRY_CONTRAST_CASES } from "./crossIndustry.synthetic";

export const ALL_SYNTHETIC_CASES: SyntheticCampaignCase[] = [
  ...RESTAURANT_SYNTHETIC_CASES,
  ...SALON_SYNTHETIC_CASES,
  ...REAL_ESTATE_SYNTHETIC_CASES,
  ...CROSS_INDUSTRY_CONTRAST_CASES,
];

export * from "./restaurants.synthetic";
export * from "./salons.synthetic";
export * from "./realEstate.synthetic";
export * from "./crossIndustry.synthetic";

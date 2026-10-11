/**
 * PHASE 10.40 — Diversity & Fatigue Test Fixtures
 * History profiles for testing mechanism saturation, repetition penalties, and fatigue signals.
 */

export interface HistoricalCampaignRecord {
  campaignId: string;
  mechanismId: string;
  psychologyId: string;
  recipeId: string;
  performanceTrend: "STRONG" | "STABLE" | "DECLINING";
  audienceResponseScore: number; // 0 - 100
  runDate: string;
}

export const FIXTURE_SATURATED_DISCOUNT_HISTORY: HistoricalCampaignRecord[] = [
  { campaignId: "c1", mechanismId: "mechanism_discount_flash_sale", psychologyId: "psychology_urgency", recipeId: "recipe_restaurant_value_bundle", performanceTrend: "STRONG", audienceResponseScore: 85, runDate: "2026-09-01" },
  { campaignId: "c2", mechanismId: "mechanism_discount_flash_sale", psychologyId: "psychology_urgency", recipeId: "recipe_restaurant_value_bundle", performanceTrend: "STRONG", audienceResponseScore: 82, runDate: "2026-09-08" },
  { campaignId: "c3", mechanismId: "mechanism_discount_flash_sale", psychologyId: "psychology_urgency", recipeId: "recipe_restaurant_value_bundle", performanceTrend: "STABLE", audienceResponseScore: 78, runDate: "2026-09-15" },
  { campaignId: "c4", mechanismId: "mechanism_discount_flash_sale", psychologyId: "psychology_urgency", recipeId: "recipe_restaurant_value_bundle", performanceTrend: "DECLINING", audienceResponseScore: 62, runDate: "2026-09-22" },
  { campaignId: "c5", mechanismId: "mechanism_discount_flash_sale", psychologyId: "psychology_urgency", recipeId: "recipe_restaurant_value_bundle", performanceTrend: "DECLINING", audienceResponseScore: 51, runDate: "2026-09-29" },
];

export const FIXTURE_STRONG_STABLE_REPETITION_HISTORY: HistoricalCampaignRecord[] = [
  { campaignId: "s1", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", performanceTrend: "STRONG", audienceResponseScore: 92, runDate: "2026-09-01" },
  { campaignId: "s2", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", performanceTrend: "STRONG", audienceResponseScore: 90, runDate: "2026-09-08" },
  { campaignId: "s3", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", performanceTrend: "STRONG", audienceResponseScore: 89, runDate: "2026-09-15" },
  { campaignId: "s4", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", performanceTrend: "STRONG", audienceResponseScore: 91, runDate: "2026-09-22" },
];

export const FIXTURE_DIVERSE_BALANCED_HISTORY: HistoricalCampaignRecord[] = [
  { campaignId: "d1", mechanismId: "mechanism_curated_family_set", psychologyId: "psychology_choice_simplification", recipeId: "recipe_restaurant_weekend_family", performanceTrend: "STRONG", audienceResponseScore: 88, runDate: "2026-09-01" },
  { campaignId: "d2", mechanismId: "mechanism_open_kitchen_ingredient_proof", psychologyId: "psychology_trust", recipeId: "recipe_restaurant_local_pride", performanceTrend: "STRONG", audienceResponseScore: 86, runDate: "2026-09-08" },
  { campaignId: "d3", mechanismId: "mechanism_express_lunch_box", psychologyId: "psychology_cognitive_ease", recipeId: "recipe_restaurant_lunch_convenience", performanceTrend: "STRONG", audienceResponseScore: 84, runDate: "2026-09-15" },
];

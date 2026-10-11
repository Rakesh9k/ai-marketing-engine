/**
 * PHASE 10.40 — Creative Bank Test Fixtures
 * Standard mock items, canonical IDs, anti-patterns, and combination rules for automated intelligence testing.
 */

export const CANONICAL_PSYCHOLOGIES = [
  "psychology_choice_simplification",
  "psychology_risk_reversal",
  "psychology_social_proof",
  "psychology_identity_signaling",
  "psychology_familiarity",
  "psychology_reciprocity",
  "psychology_commitment_consistency",
  "psychology_progress_momentum",
  "psychology_contrast",
  "psychology_anchoring",
  "psychology_curiosity",
  "psychology_anticipation",
  "psychology_belonging",
  "psychology_trust",
  "psychology_effort_reduction",
  "psychology_specificity",
  "psychology_urgency",
  "psychology_transformation",
  "psychology_authority",
  "psychology_loss_aversion",
  "psychology_cognitive_ease",
  "psychology_status_signaling",
  "psychology_framing_effect",
  "psychology_priming_effect",
  "psychology_endowment_effect",
  "psychology_instant_gratification",
] as const;

export const CANONICAL_MECHANISMS = [
  "mechanism_price_anchoring",
  "mechanism_bundle_value",
  "mechanism_decision_relief",
  "mechanism_time_compression",
  "mechanism_one_stop_solution",
  "mechanism_effortless_ordering",
  "mechanism_risk_reversal_guarantee",
  "mechanism_transparent_process",
  "mechanism_curated_family_set",
  "mechanism_priority_slot_guarantee",
  "mechanism_commute_time_calculator",
  "mechanism_express_lunch_box",
  "mechanism_multi_session_beauty_plan",
  "mechanism_curated_festive_hamper",
  "mechanism_nri_concierge_desk",
  "mechanism_monsoon_comfort_combo",
  "mechanism_post_festive_reset_bowl",
  "mechanism_solo_chef_counter_table",
  "mechanism_disposable_hygiene_seal",
  "mechanism_work_and_brew_day_pass",
  "mechanism_paws_and_brunch_experience",
  "mechanism_fixed_price_timeline_contract",
  "mechanism_midnight_express_kitchen",
  "mechanism_ammonia_free_color_trial",
  "mechanism_open_kitchen_ingredient_proof",
  "mechanism_flex_lease_growth_guarantee",
  "mechanism_60_min_dispatch_guarantee",
  "mechanism_vip_celebration_reserve",
  "mechanism_express_traveler_grooming",
  "mechanism_digital_detox_spa_package",
  "mechanism_school_cluster_housing_guide",
  "mechanism_protein_express_pickup",
  "mechanism_senior_friendly_comfort_suite",
  "mechanism_all_inclusive_party_box",
  "mechanism_16hr_hd_airbrush_guarantee",
  "mechanism_covered_vip_valet_service",
] as const;

export const CANONICAL_ANTI_PATTERNS = [
  "antipattern_fake_scarcity",
  "antipattern_invented_social_proof",
  "antipattern_unsupported_claim",
  "antipattern_empty_discount",
  "antipattern_vague_claims",
  "antipattern_feature_dump",
  "antipattern_fake_urgency",
  "antipattern_forced_localization",
] as const;

export interface MockBankItem {
  id: string;
  type: "PSYCHOLOGY" | "MECHANISM" | "RECIPE" | "HOOK" | "STORY" | "VISUAL" | "OFFER" | "CTA" | "ANTI_PATTERN";
  name: string;
  status: "ACTIVE" | "DEPRECATED" | "DRAFT";
  version: number;
  maturity: "DRAFT" | "TESTING" | "ESTABLISHED";
}

export const MOCK_BANK_ITEMS: MockBankItem[] = [
  { id: "psychology_choice_simplification", type: "PSYCHOLOGY", name: "Choice Simplification", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "psychology_risk_reversal", type: "PSYCHOLOGY", name: "Risk Reversal", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "psychology_transformation", type: "PSYCHOLOGY", name: "Transformation", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "psychology_deprecated_old_pattern", type: "PSYCHOLOGY", name: "Deprecated Pattern", status: "DEPRECATED", version: 1, maturity: "ESTABLISHED" },
  { id: "mechanism_curated_family_set", type: "MECHANISM", name: "Curated Family Set", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "mechanism_decision_relief", type: "MECHANISM", name: "Decision Relief", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "mechanism_discount_flash_sale", type: "MECHANISM", name: "Discount Flash Sale", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "recipe_restaurant_weekend_family", type: "RECIPE", name: "Weekend Family Feast", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "recipe_salon_transformation", type: "RECIPE", name: "Express Glow Transformation", status: "ACTIVE", version: 1, maturity: "ESTABLISHED" },
  { id: "recipe_deprecated_old_style", type: "RECIPE", name: "Deprecated Recipe", status: "DEPRECATED", version: 1, maturity: "ESTABLISHED" },
];

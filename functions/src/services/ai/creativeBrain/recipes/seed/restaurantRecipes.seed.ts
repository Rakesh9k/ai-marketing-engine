/**
 * PHASE 10.38 — Restaurant Creative Recipes (12 Recipes)
 */

import type { CreativeRecipe } from "../creativeRecipe.types";

export const RESTAURANT_RECIPES: CreativeRecipe[] = [
  {
    id: "recipe_restaurant_weekend_family",
    name: "Weekend Family Feast Recipe",
    description: "Eliminates decision fatigue for weekend family dining with curated combo sets.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.96,
    strategicInput: {
      businessObjectives: ["Increase weekend table reservations", "Boost average check size per group"],
      audienceSituations: ["Family weekend dining", "Multi-generational dinner groups", "Weekend family meal decision friction", "Young urban families with children"],
      customerPainPoints: ["Disagreement on what to order", "High cost of ordering separate dishes"],
      targetSubVerticals: ["Casual Dining", "Family Restaurant", "Biryani & North Indian", "Family Kitchen"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_choice_simplification",
      secondaryPsychologyIds: ["psychology_social_proof", "psychology_cognitive_ease"],
      primaryMechanismId: "mechanism_curated_family_set",
      secondaryMechanismIds: ["mechanism_decision_relief", "mechanism_bundle_value"],
      insightPatternId: "insight_family_ordering_friction",
      mechanismRoles: {
        mechanism_curated_family_set: "PRIMARY",
        mechanism_decision_relief: "SECONDARY",
        mechanism_bundle_value: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_benefit_first"],
      storyStructureIds: ["story_problem_agitation_solution", "story_day_in_the_life_experience"],
      visualStructureIds: ["visual_overhead_flatlay_arrangement", "visual_happy_children_family_moment"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_problem_solution_framework"],
      styleSystemIds: ["style_warm_editorial", "style_authentic_local"],
      emotionalTerritories: ["Togetherness", "Relief", "Celebration"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_all_inclusive_family_combo"],
      ctaMechanismIds: ["cta_reserve_table_now"],
      conversionIntent: "BOOK_TABLE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_lunch_convenience",
    name: "Express Lunch Convenience Recipe",
    description: "Captures corporate office lunch orders with guaranteed fast, curated meal boxes.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Increase weekday lunch sales", "Build recurring corporate delivery volume"],
      audienceSituations: ["Weekday desk lunch", "IT park work break"],
      customerPainPoints: ["Delayed lunch delivery", "Heavy, sleepy afternoon food coma"],
      targetSubVerticals: ["Cloud Kitchen", "Thali Restaurant", "Quick Service Restaurant"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_cognitive_ease",
      secondaryPsychologyIds: ["psychology_effort_reduction", "psychology_instant_gratification"],
      primaryMechanismId: "mechanism_express_lunch_box",
      secondaryMechanismIds: ["mechanism_time_compression"],
      insightPatternId: "insight_office_lunch_time_crunch",
      mechanismRoles: {
        mechanism_express_lunch_box: "PRIMARY",
        mechanism_time_compression: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_benefit_first"],
      storyStructureIds: ["story_the_secret_shortcut", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_text_overlay_hook_banner", "visual_step_1_2_3_numbered_grid"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_clear_offer_stack"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Efficiency", "Relief", "Satisfaction"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_tiered_volume_discount"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_feature_dump"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 5
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_craving",
    name: "Sensory Craving Trigger Recipe",
    description: "Triggers visceral food cravings using high-impact close-up sizzle and aroma cues.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Drive impulse food delivery orders", "Boost evening snack sales"],
      audienceSituations: ["Late afternoon fatigue", "Monsoon or rainy weather craving"],
      customerPainPoints: ["Boring home meals", "Strong food cravings"],
      targetSubVerticals: ["Pizza Pizzeria", "Kebab Grill", "Bakery & Cafe"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_priming_effect",
      secondaryPsychologyIds: ["psychology_instant_gratification"],
      primaryMechanismId: "mechanism_monsoon_comfort_combo",
      secondaryMechanismIds: ["mechanism_express_lunch_box"],
      insightPatternId: "insight_impulse_sensory_trigger",
      mechanismRoles: {
        mechanism_monsoon_comfort_combo: "PRIMARY",
        mechanism_express_lunch_box: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_benefit_first"],
      storyStructureIds: ["story_seasonal_transition_prep", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_crispy_golden_crunch_shot", "visual_steaming_hot_beverage_macro"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_cinematic_rich", "style_warm_editorial"],
      emotionalTerritories: ["Indulgence", "Craving", "Comfort"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_buy_one_get_one_free"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 4
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_local_pride",
    name: "Local Heritage & Pride Recipe",
    description: "Celebrates authentic local culinary heritage and neighborhood loyalty.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Strengthen brand loyalty", "Position as neighborhood staple"],
      audienceSituations: ["Weekend dining with out-of-town guests", "Local pride food craving", "Seeking authentic chemical-free food", "Health-conscious organic foodies"],
      customerPainPoints: ["Commercialized fake authentic food", "Loss of traditional taste"],
      targetSubVerticals: ["Heritage Restaurant", "Regional Cuisine", "Local Biryani House", "Clean Eating Restaurant", "Organic Bistro"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_belonging",
      secondaryPsychologyIds: ["psychology_familiarity", "psychology_trust"],
      primaryMechanismId: "mechanism_open_kitchen_ingredient_proof",
      secondaryMechanismIds: ["mechanism_transparent_process"],
      insightPatternId: "insight_local_heritage_authenticity",
      mechanismRoles: {
        mechanism_open_kitchen_ingredient_proof: "PRIMARY",
        mechanism_transparent_process: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_question_pattern"],
      storyStructureIds: ["story_behind_the_curtain_craftsmanship", "story_community_spotlight_tribute"],
      visualStructureIds: ["visual_authentic_candid_smile", "visual_ingredient_explosion_splash"],
      copyStructureIds: ["copy_story_anecdote", "copy_problem_solution_framework"],
      styleSystemIds: ["style_authentic_local", "style_heritage_classic"],
      emotionalTerritories: ["Pride", "Nostalgia", "Belonging"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_complimentary_add_on_service"],
      ctaMechanismIds: ["cta_reserve_table_now"],
      conversionIntent: "BOOK_TABLE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 14
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_new_dish",
    name: "New Chef Launch & Signature Dish Recipe",
    description: "Generates high curiosity and trial for new menu launches.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.92,
    strategicInput: {
      businessObjectives: ["Drive new menu item trial", "Build culinary authority"],
      audienceSituations: ["Foodie dining exploration", "Special occasion dinner"],
      customerPainPoints: ["Same old boring menu choices"],
      targetSubVerticals: ["Fine Dining", "Bistro Cafe", "Modern Indian"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_curiosity",
      secondaryPsychologyIds: ["psychology_anticipation", "psychology_authority"],
      primaryMechanismId: "mechanism_solo_chef_counter_table",
      secondaryMechanismIds: ["mechanism_transparent_process"],
      insightPatternId: "insight_foodie_novelty_seeking",
      mechanismRoles: {
        mechanism_solo_chef_counter_table: "PRIMARY",
        mechanism_transparent_process: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_contrarian_statement"],
      storyStructureIds: ["story_behind_the_curtain_craftsmanship", "story_the_scientific_experiment"],
      visualStructureIds: ["visual_ingredient_explosion_splash", "visual_warm_cinematic_lighting"],
      copyStructureIds: ["copy_story_anecdote", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_cinematic_rich", "style_warm_editorial"],
      emotionalTerritories: ["Curiosity", "Excitement", "Prestige"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_exclusive_chef_counter_pass"],
      ctaMechanismIds: ["cta_explore_the_menu"],
      conversionIntent: "EXPLORE_MENU"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 10
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_value_bundle",
    name: "Unbeatable Value Feast Bundle Recipe",
    description: "Framed price anchoring with bundled items for price-conscious dining.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Boost order volume during price-sensitive periods"],
      audienceSituations: ["Budget family meal", "Student / young professional group"],
      customerPainPoints: ["Surprise hidden charges", "High individual item costs"],
      targetSubVerticals: ["Casual Dining", "QSR", "Pizza Pizzeria"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_anchoring",
      secondaryPsychologyIds: ["psychology_contrast", "psychology_cognitive_ease"],
      primaryMechanismId: "mechanism_price_anchoring",
      secondaryMechanismIds: ["mechanism_bundle_value"],
      insightPatternId: "insight_price_perceived_value",
      mechanismRoles: {
        mechanism_price_anchoring: "PRIMARY",
        mechanism_bundle_value: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_benefit_first", "hook_direct_callout"],
      storyStructureIds: ["story_the_comparative_breakdown", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_overhead_flatlay_arrangement", "visual_text_overlay_hook_banner"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Smart Choice", "Relief", "Satisfaction"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_tiered_volume_discount"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_social_proof",
    name: "Customer Favorite & Social Proof Recipe",
    description: "Leverages community ratings and crowd validation to drive first-time visits.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Convert undecided foodies into first-time diners"],
      audienceSituations: ["First time city visitor", "Weekend dining decision"],
      customerPainPoints: ["Fear of bad meal experience"],
      targetSubVerticals: ["Casual Dining", "Roof Top Lounge", "Specialty Restaurant"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_social_proof",
      secondaryPsychologyIds: ["psychology_risk_reduction", "psychology_trust"],
      primaryMechanismId: "mechanism_transparent_process",
      secondaryMechanismIds: ["mechanism_decision_relief"],
      insightPatternId: "insight_crowd_validation_trust",
      mechanismRoles: {
        mechanism_transparent_process: "PRIMARY",
        mechanism_decision_relief: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_social_proof_lead", "hook_question_pattern"],
      storyStructureIds: ["story_underdog_quality_challenge", "story_community_spotlight_tribute"],
      visualStructureIds: ["visual_authentic_candid_smile", "visual_happy_children_family_moment"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_authentic_local", "style_warm_editorial"],
      emotionalTerritories: ["Trust", "Reassurance", "Belonging"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_cashback_loyalty_credit"],
      ctaMechanismIds: ["cta_reserve_table_now"],
      conversionIntent: "BOOK_TABLE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_festival",
    name: "Festive Celebration Hamper Recipe",
    description: "Captures corporate and family holiday gifting and banquet meal budgets.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Maximize seasonal festival revenue", "Drive hamper & banquet pre-orders"],
      audienceSituations: ["Diwali / Festive family reunion", "Corporate client gifting"],
      customerPainPoints: ["Finding premium authentic sweets & feast hampers"],
      targetSubVerticals: ["Sweet Shop & Bakery", "Heritage Restaurant", "Luxury Dining"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_priming_effect",
      secondaryPsychologyIds: ["psychology_belonging", "psychology_status_signaling"],
      primaryMechanismId: "mechanism_curated_festive_hamper",
      secondaryMechanismIds: ["mechanism_bundle_value"],
      insightPatternId: "insight_festive_gifting_generosity",
      mechanismRoles: {
        mechanism_curated_festive_hamper: "PRIMARY",
        mechanism_bundle_value: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_benefit_first", "hook_direct_callout"],
      storyStructureIds: ["story_festive_reunion_celebration", "story_behind_the_curtain_craftsmanship"],
      visualStructureIds: ["visual_seasonal_decor_atmosphere", "visual_overhead_flatlay_arrangement"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_story_anecdote"],
      styleSystemIds: ["style_heritage_classic", "style_cinematic_rich"],
      emotionalTerritories: ["Joy", "Generosity", "Tradition"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_seasonal_festive_hamper_bundle"],
      ctaMechanismIds: ["cta_claim_your_voucher"],
      conversionIntent: "CLAIM_VOUCHER"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 14
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_rainy_day",
    name: "Rainy Day Hot Snack Trigger Recipe",
    description: "Capitalizes on sudden rainy weather mood with steaming tea and fried snacks.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Capitalize on weather-driven demand spikes"],
      audienceSituations: ["Rainy afternoon snack craving", "Work-from-home rain break"],
      customerPainPoints: ["Rain prevents going out to eat"],
      targetSubVerticals: ["Chai & Snacks Cafe", "Cloud Kitchen", "Street Food Lounge"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_priming_effect",
      secondaryPsychologyIds: ["psychology_instant_gratification"],
      primaryMechanismId: "mechanism_monsoon_comfort_combo",
      secondaryMechanismIds: ["mechanism_time_compression"],
      insightPatternId: "insight_weather_driven_comfort",
      mechanismRoles: {
        mechanism_monsoon_comfort_combo: "PRIMARY",
        mechanism_time_compression: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_direct_callout"],
      storyStructureIds: ["story_seasonal_transition_prep", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_steaming_hot_beverage_macro", "visual_crispy_golden_crunch_shot"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_warm_editorial", "style_authentic_local"],
      emotionalTerritories: ["Cozy", "Nostalgia", "Relief"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_buy_one_get_one_free"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 3
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_late_night",
    name: "Midnight Cravings & Shift Meal Recipe",
    description: "Serves late night shift workers and night owls with instant delivery combos.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.92,
    strategicInput: {
      businessObjectives: ["Monetize off-peak 11 PM - 3 AM window"],
      audienceSituations: ["Late night work shift", "Overnight study session"],
      customerPainPoints: ["Most restaurants closed", "Slow late night delivery"],
      targetSubVerticals: ["Late Night Delivery Kitchen", "24/7 Diner"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_instant_gratification",
      secondaryPsychologyIds: ["psychology_effort_reduction"],
      primaryMechanismId: "mechanism_midnight_express_kitchen",
      secondaryMechanismIds: ["mechanism_time_compression"],
      insightPatternId: "insight_late_night_hunger",
      mechanismRoles: {
        mechanism_midnight_express_kitchen: "PRIMARY",
        mechanism_time_compression: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_curiosity_gap"],
      storyStructureIds: ["story_problem_agitation_solution", "story_the_secret_shortcut"],
      visualStructureIds: ["visual_dark_mode_neon_accent", "visual_crispy_golden_crunch_shot"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_modern_bold", "style_cinematic_rich"],
      emotionalTerritories: ["Relief", "Indulgence", "Speed"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_flash_sale_24hr_voucher"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_feature_dump"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 5
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_date_night",
    name: "Romantic Date Night & Ambience Recipe",
    description: "Positions ambient fine dining for couple anniversaries and romantic dinners.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Increase high-margin couple reservation bookings"],
      audienceSituations: ["Anniversary dinner", "Weekend romantic date"],
      customerPainPoints: ["Noisy crowded seating ruining intimate moments"],
      targetSubVerticals: ["Fine Dining", "Rooftop Restaurant", "Wine & Dine"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_status_signaling",
      secondaryPsychologyIds: ["psychology_anticipation", "psychology_risk_reduction"],
      primaryMechanismId: "mechanism_vip_celebration_reserve",
      secondaryMechanismIds: ["mechanism_covered_vip_valet_service"],
      insightPatternId: "insight_romantic_ambience_assurance",
      mechanismRoles: {
        mechanism_vip_celebration_reserve: "PRIMARY",
        mechanism_covered_vip_valet_service: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_question_pattern"],
      storyStructureIds: ["story_day_in_the_life_experience", "story_vip_insider_access"],
      visualStructureIds: ["visual_warm_cinematic_lighting", "visual_nighttime_ambient_patio_glow"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_cinematic_rich", "style_warm_editorial"],
      emotionalTerritories: ["Romance", "Elegance", "Exclusivity"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_complimentary_valet_drink_treat"],
      ctaMechanismIds: ["cta_reserve_table_now"],
      conversionIntent: "BOOK_TABLE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_restaurant_office_lunch",
    name: "Corporate Office Group Feast Recipe",
    description: "Targets team lunches and office celebrations with bulk party boxes.",
    vertical: "RESTAURANT",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.92,
    strategicInput: {
      businessObjectives: ["Build B2B group lunch catering orders"],
      audienceSituations: ["Friday office team lunch", "Project milestone celebration", "Weekday office team meal delivery", "IT office team lunch groups", "Express Desk Delivery Box"],
      customerPainPoints: ["Difficult to split bill and satisfy diverse tastes"],
      targetSubVerticals: ["Casual Dining", "Cloud Kitchen", "Catering Service"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_choice_simplification",
      secondaryPsychologyIds: ["psychology_effort_reduction"],
      primaryMechanismId: "mechanism_all_inclusive_party_box",
      secondaryMechanismIds: ["mechanism_curated_family_set"],
      insightPatternId: "insight_corporate_group_coordination",
      mechanismRoles: {
        mechanism_all_inclusive_party_box: "PRIMARY",
        mechanism_curated_family_set: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_benefit_first"],
      storyStructureIds: ["story_the_secret_shortcut", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_overhead_flatlay_arrangement", "visual_step_1_2_3_numbered_grid"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Efficiency", "Relief", "Celebration"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_tiered_volume_discount"],
      ctaMechanismIds: ["cta_order_on_whatsapp"],
      conversionIntent: "ORDER_ONLINE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_feature_dump"],
      unsupportedIndustries: ["REAL_ESTATE", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  }
];

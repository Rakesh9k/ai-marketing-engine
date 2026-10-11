/**
 * PHASE 10.38 — Real Estate Creative Recipes (10 Recipes)
 */

import type { CreativeRecipe } from "../creativeRecipe.types";

export const REAL_ESTATE_RECIPES: CreativeRecipe[] = [
  {
    id: "recipe_real_estate_lifestyle",
    name: "Luxury Lifestyle & Amenity Sanctuary Recipe",
    description: "Framed luxury living and resort-style amenities for premium home buyers.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Drive site visits for luxury residential apartments and villas"],
      audienceSituations: ["High-net-worth home upgrade search", "NRI luxury investment"],
      customerPainPoints: ["Cramped urban living", "Lack of green open spaces and clubhouses"],
      targetSubVerticals: ["Luxury Apartments", "Gated Villas", "Premium Condos"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_status_signaling",
      secondaryPsychologyIds: ["psychology_identity_signaling", "psychology_belonging"],
      primaryMechanismId: "mechanism_nri_concierge_desk",
      secondaryMechanismIds: ["mechanism_solo_chef_counter_table"],
      insightPatternId: "insight_lifestyle_status_upgrade",
      mechanismRoles: {
        mechanism_nri_concierge_desk: "PRIMARY",
        mechanism_solo_chef_counter_table: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_benefit_first"],
      storyStructureIds: ["story_vip_insider_access", "story_day_in_the_life_experience"],
      visualStructureIds: ["visual_aerial_drone_perspective", "visual_wide_architectural_panoramic"],
      copyStructureIds: ["copy_story_anecdote", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_cinematic_rich", "style_heritage_classic"],
      emotionalTerritories: ["Prestige", "Tranquility", "Achievement"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_limited_time_early_bird"],
      ctaMechanismIds: ["cta_schedule_site_visit"],
      conversionIntent: "SCHEDULE_SITE_VISIT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 14
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_commute",
    name: "Commute Time Calculator & Connectivity Recipe",
    description: "Proves exact commute times to major IT hubs and business centers to overcome location doubts.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Accelerate lead conversion for suburban tech corridor projects"],
      audienceSituations: ["IT professional looking for home close to office"],
      customerPainPoints: ["Long daily traffic commute stress", "Unclear metro connectivity"],
      targetSubVerticals: ["Mid-Segment Apartments", "Tech Park Housing"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_effort_reduction",
      secondaryPsychologyIds: ["psychology_cognitive_ease", "psychology_specificity"],
      primaryMechanismId: "mechanism_commute_time_calculator",
      secondaryMechanismIds: ["mechanism_time_compression"],
      insightPatternId: "insight_commute_time_frustration",
      mechanismRoles: {
        mechanism_commute_time_calculator: "PRIMARY",
        mechanism_time_compression: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_contrarian_statement"],
      storyStructureIds: ["story_myth_vs_reality", "story_the_comparative_breakdown"],
      visualStructureIds: ["visual_infographic_split_callout", "visual_wide_architectural_panoramic"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_problem_solution_framework"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Relief", "Practicality", "Smart Move"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_zero_down_payment_installment"],
      ctaMechanismIds: ["cta_schedule_site_visit"],
      conversionIntent: "SCHEDULE_SITE_VISIT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_family_upgrade",
    name: "Growing Family Upgrade Recipe",
    description: "Appeals to growing families needing larger 3BHK/4BHK layouts near top schools.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Increase 3BHK / 4BHK family apartment sales"],
      audienceSituations: ["Outgrowing 2BHK apartment", "Relocating near top international schools"],
      customerPainPoints: ["Lack of kids play areas", "Cramped bedrooms for children"],
      targetSubVerticals: ["Family Residential Township", "Gated Communities"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_belonging",
      secondaryPsychologyIds: ["psychology_progress_momentum", "psychology_framing_effect"],
      primaryMechanismId: "mechanism_school_cluster_housing_guide",
      secondaryMechanismIds: ["mechanism_senior_friendly_comfort_suite"],
      insightPatternId: "insight_family_space_expansion",
      mechanismRoles: {
        mechanism_school_cluster_housing_guide: "PRIMARY",
        mechanism_senior_friendly_comfort_suite: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_benefit_first"],
      storyStructureIds: ["story_day_in_the_life_experience", "story_first_time_visitor_guide"],
      visualStructureIds: ["visual_happy_children_family_moment", "visual_wide_architectural_panoramic"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_warm_editorial", "style_authentic_local"],
      emotionalTerritories: ["Nurturing", "Growth", "Security"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_staggered_payment_milestone"],
      ctaMechanismIds: ["cta_download_brochure_floorplan"],
      conversionIntent: "DOWNLOAD_BROCHURE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_feature_dump"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_investment",
    name: "High-ROI Real Estate Investment Recipe",
    description: "Presents rental yield and capital appreciation math to savvy property investors.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Attract real estate investor leads"],
      audienceSituations: ["Wealth diversification", "NRI real estate investment"],
      customerPainPoints: ["Stock market volatility", "Low bank deposit yields"],
      targetSubVerticals: ["Commercial Office Spaces", "Studio Apartments", "Plots"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_anchoring",
      secondaryPsychologyIds: ["psychology_contrast", "psychology_authority"],
      primaryMechanismId: "mechanism_flex_lease_growth_guarantee",
      secondaryMechanismIds: ["mechanism_nri_concierge_desk"],
      insightPatternId: "insight_investor_yield_focus",
      mechanismRoles: {
        mechanism_flex_lease_growth_guarantee: "PRIMARY",
        mechanism_nri_concierge_desk: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_social_proof_lead"],
      storyStructureIds: ["story_the_comparative_breakdown", "story_the_scientific_experiment"],
      visualStructureIds: ["visual_infographic_split_callout", "visual_architectural_blueprint_overlay"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_clear_offer_stack"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Wealth", "Security", "Prudence"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_limited_time_early_bird"],
      ctaMechanismIds: ["cta_download_brochure_floorplan"],
      conversionIntent: "DOWNLOAD_BROCHURE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 10
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_locality",
    name: "Neighborhood Micro-Location Spotlight Recipe",
    description: "Highlights neighborhood infrastructure, upcoming metro lines, and retail hubs.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Build micro-locality awareness for newly developing corridors"],
      audienceSituations: ["Researching best neighborhoods to settle down"],
      customerPainPoints: ["Fear of buying in underdeveloped isolated zones"],
      targetSubVerticals: ["Suburban Townships", "Plot Developments"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_familiarity",
      secondaryPsychologyIds: ["psychology_trust", "psychology_belonging"],
      primaryMechanismId: "mechanism_commute_time_calculator",
      secondaryMechanismIds: ["mechanism_school_cluster_housing_guide"],
      insightPatternId: "insight_neighborhood_vitality",
      mechanismRoles: {
        mechanism_commute_time_calculator: "PRIMARY",
        mechanism_school_cluster_housing_guide: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_curiosity_gap"],
      storyStructureIds: ["story_first_time_visitor_guide", "story_community_spotlight_tribute"],
      visualStructureIds: ["visual_aerial_drone_perspective", "visual_infographic_split_callout"],
      copyStructureIds: ["copy_story_anecdote", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_authentic_local", "style_modern_bold"],
      emotionalTerritories: ["Discovery", "Growth", "Community"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_staggered_payment_milestone"],
      ctaMechanismIds: ["cta_schedule_site_visit"],
      conversionIntent: "SCHEDULE_SITE_VISIT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_future_value",
    name: "Infrastructure Growth & Future Value Recipe",
    description: "Showcases upcoming infrastructure catalysts (airports, metros, expressways) driving growth.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Pre-sell early-stage launching projects"],
      audienceSituations: ["Early bird property investment"],
      customerPainPoints: ["Missing out on early phase pricing before appreciation"],
      targetSubVerticals: ["Pre-Launch Apartments", "Growth Corridor Land Plots"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_anticipation",
      secondaryPsychologyIds: ["psychology_framing_effect", "psychology_anchoring"],
      primaryMechanismId: "mechanism_commute_time_calculator",
      secondaryMechanismIds: ["mechanism_flex_lease_growth_guarantee"],
      insightPatternId: "insight_infrastructure_catalyst",
      mechanismRoles: {
        mechanism_commute_time_calculator: "PRIMARY",
        mechanism_flex_lease_growth_guarantee: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_benefit_first"],
      storyStructureIds: ["story_myth_vs_reality", "story_the_comparative_breakdown"],
      visualStructureIds: ["visual_architectural_blueprint_overlay", "visual_aerial_drone_perspective"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_clear_offer_stack"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Vision", "Opportunity", "Smart Move"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_limited_time_early_bird"],
      ctaMechanismIds: ["cta_download_brochure_floorplan"],
      conversionIntent: "DOWNLOAD_BROCHURE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 10
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_first_home",
    name: "First-Time Buyer Confidence & EMI Recipe",
    description: "Simplifies home ownership financing and zero-down payment milestone plans.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Convert young professionals into first-time homebuyers"],
      audienceSituations: ["Renting vs buying decision", "First home search"],
      customerPainPoints: ["Rent money feel like waste", "High upfront down-payment barrier"],
      targetSubVerticals: ["Affordable Housing", "Compact 2BHKs"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_risk_reversal",
      secondaryPsychologyIds: ["psychology_progress_momentum", "psychology_cognitive_ease"],
      primaryMechanismId: "mechanism_fixed_price_timeline_contract",
      secondaryMechanismIds: ["mechanism_decision_relief"],
      insightPatternId: "insight_first_home_downpayment_fear",
      mechanismRoles: {
        mechanism_fixed_price_timeline_contract: "PRIMARY",
        mechanism_decision_relief: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_benefit_first"],
      storyStructureIds: ["story_problem_agitation_solution", "story_guarantee_promise_fulfillment"],
      visualStructureIds: ["visual_infographic_split_callout", "visual_wide_architectural_panoramic"],
      copyStructureIds: ["copy_problem_solution_framework", "copy_clear_offer_stack"],
      styleSystemIds: ["style_clean_minimalist", "style_warm_editorial"],
      emotionalTerritories: ["Pride", "Relief", "Security"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_zero_down_payment_installment"],
      ctaMechanismIds: ["cta_schedule_site_visit"],
      conversionIntent: "SCHEDULE_SITE_VISIT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_trust",
    name: "RERA Clear Title & Developer Trust Recipe",
    description: "Reinforces builder reputation, RERA compliance, and on-time delivery track record.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Eliminate developer credibility hesitation"],
      audienceSituations: ["Evaluating builder track record before booking"],
      customerPainPoints: ["Delayed possession fear", "Legal title disputes"],
      targetSubVerticals: ["Mid-Segment & Premium Residential"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_trust",
      secondaryPsychologyIds: ["psychology_risk_reversal", "psychology_authority"],
      primaryMechanismId: "mechanism_fixed_price_timeline_contract",
      secondaryMechanismIds: ["mechanism_risk_reversal_guarantee"],
      insightPatternId: "insight_builder_trust_guarantee",
      mechanismRoles: {
        mechanism_fixed_price_timeline_contract: "PRIMARY",
        mechanism_risk_reversal_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_social_proof_lead"],
      storyStructureIds: ["story_guarantee_promise_fulfillment", "story_underdog_quality_challenge"],
      visualStructureIds: ["visual_architectural_blueprint_overlay", "visual_authentic_candid_smile"],
      copyStructureIds: ["copy_problem_solution_framework", "copy_story_anecdote"],
      styleSystemIds: ["style_clean_minimalist", "style_heritage_classic"],
      emotionalTerritories: ["Trust", "Peace of Mind", "Reliability"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_staggered_payment_milestone"],
      ctaMechanismIds: ["cta_download_brochure_floorplan"],
      conversionIntent: "DOWNLOAD_BROCHURE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_property_tour",
    name: "Sample Apartment Walkthrough Tour Recipe",
    description: "Invites buyers for an immersive sample flat walkthrough and floorplan demo.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Maximize weekend site visit walkthrough traffic"],
      audienceSituations: ["Final shortlist phase of home search"],
      customerPainPoints: ["Misleading 3D renders that don't match reality"],
      targetSubVerticals: ["Under-Construction Residential Projects"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_endowment_effect",
      secondaryPsychologyIds: ["psychology_curiosity", "psychology_trust"],
      primaryMechanismId: "mechanism_transparent_process",
      secondaryMechanismIds: ["mechanism_decision_relief"],
      insightPatternId: "insight_tactile_sample_flat_proof",
      mechanismRoles: {
        mechanism_transparent_process: "PRIMARY",
        mechanism_decision_relief: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_direct_callout"],
      storyStructureIds: ["story_day_in_the_life_experience", "story_the_stress_free_guarantee_walkthrough"],
      visualStructureIds: ["visual_wide_architectural_panoramic", "visual_first_person_pov_framing"],
      copyStructureIds: ["copy_story_anecdote", "copy_clear_offer_stack"],
      styleSystemIds: ["style_cinematic_rich", "style_warm_editorial"],
      emotionalTerritories: ["Belonging", "Excitement", "Clarity"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_staggered_payment_milestone"],
      ctaMechanismIds: ["cta_schedule_site_visit"],
      conversionIntent: "SCHEDULE_SITE_VISIT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_real_estate_comparison",
    name: "Side-by-Side Value Comparison Recipe",
    description: "Provides side-by-side specs comparison proving higher carpet area and better price per sqft.",
    vertical: "REAL_ESTATE",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Win against nearby competing real estate projects"],
      audienceSituations: ["Comparing 2 or 3 projects in the same locality"],
      customerPainPoints: ["Hidden super built-up area loading fees"],
      targetSubVerticals: ["Mid-Segment & Premium Apartments"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_contrast",
      secondaryPsychologyIds: ["psychology_anchoring", "psychology_cognitive_ease"],
      primaryMechanismId: "mechanism_fixed_price_timeline_contract",
      secondaryMechanismIds: ["mechanism_price_anchoring"],
      insightPatternId: "insight_carpet_area_transparency",
      mechanismRoles: {
        mechanism_fixed_price_timeline_contract: "PRIMARY",
        mechanism_price_anchoring: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_question_pattern"],
      storyStructureIds: ["story_the_comparative_breakdown", "story_myth_vs_reality"],
      visualStructureIds: ["visual_infographic_split_callout", "visual_architectural_blueprint_overlay"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_problem_solution_framework"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Smart Decision", "Transparency", "Relief"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_limited_time_early_bird"],
      ctaMechanismIds: ["cta_download_brochure_floorplan"],
      conversionIntent: "DOWNLOAD_BROCHURE"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "SALON"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  }
];

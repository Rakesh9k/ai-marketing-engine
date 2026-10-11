/**
 * PHASE 10.38 — Salon Creative Recipes (9 Recipes)
 */

import type { CreativeRecipe } from "../creativeRecipe.types";

export const SALON_RECIPES: CreativeRecipe[] = [
  {
    id: "recipe_salon_transformation",
    name: "Express Glow Transformation Recipe",
    description: "Eliminates first-time visitor hesitation with zero-risk transformation trial.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Acquire new first-time salon clients", "Increase high-margin skincare bookings"],
      audienceSituations: ["First-time visitor pass search", "Skin dullness & weekend prep"],
      customerPainPoints: ["Fear of bad hair cut or skin reaction", "Overpriced consultations"],
      targetSubVerticals: ["Skin Clinic", "Hair Salon", "Beauty Lounge"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_risk_reversal",
      secondaryPsychologyIds: ["psychology_transformation", "psychology_trust"],
      primaryMechanismId: "mechanism_priority_slot_guarantee",
      secondaryMechanismIds: ["mechanism_risk_reversal_guarantee"],
      insightPatternId: "insight_salon_first_time_hesitation",
      mechanismRoles: {
        mechanism_priority_slot_guarantee: "PRIMARY",
        mechanism_risk_reversal_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_benefit_first", "hook_question_pattern"],
      storyStructureIds: ["story_before_and_after_contrast", "story_hero_transformation_journey"],
      visualStructureIds: ["visual_macro_extreme_close_up", "visual_mirror_reflection_shot"],
      copyStructureIds: ["copy_problem_solution_framework", "copy_clear_offer_stack"],
      styleSystemIds: ["style_clean_minimalist", "style_warm_editorial"],
      emotionalTerritories: ["Confidence", "Radiance", "Relief"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_first_time_visitor_pass"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_before_event",
    name: "Pre-Event & Party Prep Makeover Recipe",
    description: "Captures urgent pre-wedding and party makeover bookings.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Fill weekend appointment slots", "Drive high-ticket makeover packages"],
      audienceSituations: ["Attending wedding next week", "Corporate gala event"],
      customerPainPoints: ["Last minute booking unavailability", "Frizz & makeup smudging during event"],
      targetSubVerticals: ["Bridal Studio", "Hair & Makeup Salon"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_urgency",
      secondaryPsychologyIds: ["psychology_status_signaling", "psychology_anticipation"],
      primaryMechanismId: "mechanism_multi_session_beauty_plan",
      secondaryMechanismIds: ["mechanism_priority_slot_guarantee"],
      insightPatternId: "insight_event_readiness_stress",
      mechanismRoles: {
        mechanism_multi_session_beauty_plan: "PRIMARY",
        mechanism_priority_slot_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_benefit_first"],
      storyStructureIds: ["story_hero_transformation_journey", "story_the_secret_shortcut"],
      visualStructureIds: ["visual_mirror_reflection_shot", "visual_human_hand_demonstrating_proof"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_cinematic_rich", "style_warm_editorial"],
      emotionalTerritories: ["Glamour", "Preparedness", "Confidence"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_100_percent_satisfaction_guarantee"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 5
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_self_care",
    name: "Weekend Self-Care Detox Spa Recipe",
    description: "Frames salon treatments as essential mental reset and restorative self-care.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Increase weekday spa and massage bookings"],
      audienceSituations: ["Work stress relief", "Weekend self-care routine"],
      customerPainPoints: ["Guilt over spending on pampering", "Burnout & muscle tension"],
      targetSubVerticals: ["Day Spa", "Wellness Salon", "Aromatherapy Studio"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_priming_effect",
      secondaryPsychologyIds: ["psychology_cognitive_ease"],
      primaryMechanismId: "mechanism_digital_detox_spa_package",
      secondaryMechanismIds: ["mechanism_disposable_hygiene_seal"],
      insightPatternId: "insight_self_care_permission",
      mechanismRoles: {
        mechanism_digital_detox_spa_package: "PRIMARY",
        mechanism_disposable_hygiene_seal: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_question_pattern"],
      storyStructureIds: ["story_micro_adventure_getaway", "story_the_stress_free_guarantee_walkthrough"],
      visualStructureIds: ["visual_relaxing_water_botanical_element", "visual_macro_lens_skin_texture"],
      copyStructureIds: ["copy_story_anecdote", "copy_problem_solution_framework"],
      styleSystemIds: ["style_warm_editorial", "style_clean_minimalist"],
      emotionalTerritories: ["Tranquility", "Relief", "Self-Love"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_membership_vip_pass_subscription"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "OFFER_FRAMING", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_confidence",
    name: "Hair & Skin Confidence Revival Recipe",
    description: "Rebuilds customer confidence by fixing past hair damage or skin concerns.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Position as high-expertise corrective salon"],
      audienceSituations: ["Damaged hair repair", "Acne/pigmentation treatment search"],
      customerPainPoints: ["Previous botched salon experience", "Self-consciousness about hair/skin"],
      targetSubVerticals: ["Hair Lab", "Trichology Clinic", "Advanced Skincare"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_transformation",
      secondaryPsychologyIds: ["psychology_trust", "psychology_risk_reversal"],
      primaryMechanismId: "mechanism_ammonia_free_color_trial",
      secondaryMechanismIds: ["mechanism_risk_reversal_guarantee"],
      insightPatternId: "insight_beauty_vulnerability_trust",
      mechanismRoles: {
        mechanism_ammonia_free_color_trial: "PRIMARY",
        mechanism_risk_reversal_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_social_proof_lead"],
      storyStructureIds: ["story_restoration_revival", "story_before_and_after_contrast"],
      visualStructureIds: ["visual_human_hand_demonstrating_proof", "visual_macro_lens_skin_texture"],
      copyStructureIds: ["copy_problem_solution_framework", "copy_story_anecdote"],
      styleSystemIds: ["style_clean_minimalist", "style_warm_editorial"],
      emotionalTerritories: ["Empowerment", "Relief", "Confidence"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_free_home_sample_trial"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_new_look",
    name: "New Season New Look Makeover Recipe",
    description: "Inspires clients to refresh their style with trending hair colors and cuts.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.92,
    strategicInput: {
      businessObjectives: ["Drive seasonal trend-led styling bookings"],
      audienceSituations: ["New job / post-breakup / birthday refresh", "Seasonal hair color update"],
      customerPainPoints: ["Stuck in a boring beauty routine"],
      targetSubVerticals: ["Hair Styling Lounge", "Color Studio"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_identity_signaling",
      secondaryPsychologyIds: ["psychology_curiosity"],
      primaryMechanismId: "mechanism_ammonia_free_color_trial",
      secondaryMechanismIds: ["mechanism_priority_slot_guarantee"],
      insightPatternId: "insight_identity_refresh_desire",
      mechanismRoles: {
        mechanism_ammonia_free_color_trial: "PRIMARY",
        mechanism_priority_slot_guarantee: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_curiosity_gap", "hook_benefit_first"],
      storyStructureIds: ["story_hero_transformation_journey", "story_expert_masterclass_breakdown"],
      visualStructureIds: ["visual_mirror_reflection_shot", "visual_step_1_2_3_numbered_grid"],
      copyStructureIds: ["copy_bullet_benefit_list", "copy_clear_offer_stack"],
      styleSystemIds: ["style_modern_bold", "style_warm_editorial"],
      emotionalTerritories: ["Excitement", "Reinvention", "Style"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_first_time_visitor_pass"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_empty_discount"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 10
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_seasonal",
    name: "Monsoon & Summer Skin Defense Recipe",
    description: "Educates clients on climate-specific hair and skin care defense treatments.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.93,
    strategicInput: {
      businessObjectives: ["Drive weather-dependent salon treatment visits"],
      audienceSituations: ["Monsoon hair frizz", "Summer tan & sun damage"],
      customerPainPoints: ["Unmanageable seasonal hair/skin breakdown"],
      targetSubVerticals: ["Hair Spa", "Skin Clinic"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_priming_effect",
      secondaryPsychologyIds: ["psychology_authority"],
      primaryMechanismId: "mechanism_disposable_hygiene_seal",
      secondaryMechanismIds: ["mechanism_risk_reversal_guarantee"],
      insightPatternId: "insight_seasonal_skin_breakdown",
      mechanismRoles: {
        mechanism_disposable_hygiene_seal: "PRIMARY",
        mechanism_risk_reversal_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_question_pattern", "hook_direct_callout"],
      storyStructureIds: ["story_seasonal_transition_prep", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_macro_lens_skin_texture", "visual_step_1_2_3_numbered_grid"],
      copyStructureIds: ["copy_problem_solution_framework", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_clean_minimalist", "style_warm_editorial"],
      emotionalTerritories: ["Protection", "Relief", "Expertise"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_complimentary_add_on_service"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_appointment_urgency",
    name: "Limited Priority VIP Slot Reservation Recipe",
    description: "Fills empty calendar slots with VIP priority booking passes.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Fill off-peak weekday appointment gaps"],
      audienceSituations: ["Same-day hair cut search", "Express lunchtime touchup"],
      customerPainPoints: ["Long waiting times at unreserved salons"],
      targetSubVerticals: ["Express Salon", "Nail Spa", "Barbershop"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_urgency",
      secondaryPsychologyIds: ["psychology_effort_reduction"],
      primaryMechanismId: "mechanism_express_traveler_grooming",
      secondaryMechanismIds: ["mechanism_priority_slot_guarantee"],
      insightPatternId: "insight_time_sensitive_grooming",
      mechanismRoles: {
        mechanism_express_traveler_grooming: "PRIMARY",
        mechanism_priority_slot_guarantee: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_direct_callout", "hook_benefit_first"],
      storyStructureIds: ["story_the_secret_shortcut", "story_problem_agitation_solution"],
      visualStructureIds: ["visual_text_overlay_hook_banner", "visual_step_1_2_3_numbered_grid"],
      copyStructureIds: ["copy_clear_offer_stack", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_modern_bold", "style_clean_minimalist"],
      emotionalTerritories: ["Speed", "Convenience", "Priority"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_flash_sale_24hr_voucher"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_fake_urgency"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 4
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_expert_authority",
    name: "Master Stylist Science & Authority Recipe",
    description: "Establishes clinical expertise and premium service credentials.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.94,
    strategicInput: {
      businessObjectives: ["Justify premium pricing tiers", "Position salon as luxury authority"],
      audienceSituations: ["High-end hair coloring or balayage", "Medical facial clinic"],
      customerPainPoints: ["Damaged hair from amateur stylists"],
      targetSubVerticals: ["Luxury Studio", "Skin Clinic", "High-End Salon"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_authority",
      secondaryPsychologyIds: ["psychology_trust", "psychology_status_signaling"],
      primaryMechanismId: "mechanism_16hr_hd_airbrush_guarantee",
      secondaryMechanismIds: ["mechanism_transparent_process"],
      insightPatternId: "insight_expert_authority_trust",
      mechanismRoles: {
        mechanism_16hr_hd_airbrush_guarantee: "PRIMARY",
        mechanism_transparent_process: "SECONDARY"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_contrarian_statement", "hook_curiosity_gap"],
      storyStructureIds: ["story_expert_masterclass_breakdown", "story_behind_the_curtain_craftsmanship"],
      visualStructureIds: ["visual_macro_lens_skin_texture", "visual_human_hand_demonstrating_proof"],
      copyStructureIds: ["copy_story_anecdote", "copy_bullet_benefit_list"],
      styleSystemIds: ["style_clean_minimalist", "style_cinematic_rich"],
      emotionalTerritories: ["Trust", "Mastery", "Exclusivity"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_100_percent_satisfaction_guarantee"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_feature_dump"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 14
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  },
  {
    id: "recipe_salon_customer_story",
    name: "Real Client Journey & Case Study Recipe",
    description: "Showcases authentic client transformation stories and review testimonials.",
    vertical: "SALON",
    maturity: "ACTIVE",
    version: 1,
    confidenceScore: 0.95,
    strategicInput: {
      businessObjectives: ["Build social proof trust for complex skincare treatments"],
      audienceSituations: ["Evaluating salon reviews before booking"],
      customerPainPoints: ["Doubts about advertised before/after results"],
      targetSubVerticals: ["Hair & Skin Clinic", "Bridal Salon"]
    },
    creativeLogic: {
      primaryPsychologyId: "psychology_social_proof",
      secondaryPsychologyIds: ["psychology_trust", "psychology_familiarity"],
      primaryMechanismId: "mechanism_risk_reversal_guarantee",
      secondaryMechanismIds: ["mechanism_transparent_process"],
      insightPatternId: "insight_real_client_proof",
      mechanismRoles: {
        mechanism_risk_reversal_guarantee: "PRIMARY",
        mechanism_transparent_process: "SUPPORTING"
      }
    },
    creativeExpression: {
      hookPatternIds: ["hook_social_proof_lead", "hook_question_pattern"],
      storyStructureIds: ["story_hero_transformation_journey", "story_before_and_after_contrast"],
      visualStructureIds: ["visual_authentic_candid_smile", "visual_mirror_reflection_shot"],
      copyStructureIds: ["copy_story_anecdote", "copy_problem_solution_framework"],
      styleSystemIds: ["style_warm_editorial", "style_authentic_local"],
      emotionalTerritories: ["Relief", "Authenticity", "Joy"]
    },
    commercialAction: {
      offerMechanismIds: ["offer_first_time_visitor_pass"],
      ctaMechanismIds: ["cta_book_free_consultation"],
      conversionIntent: "BOOK_APPOINTMENT"
    },
    constraints: {
      allowedVariationAxes: ["HOOK", "STORY", "VISUAL", "COPY", "CTA"],
      antiPatternIds: ["antipattern_vague_claims"],
      unsupportedIndustries: ["RESTAURANT", "REAL_ESTATE"],
      maxFrequencyDays: 7
    },
    metadata: {
      createdAt: "2026-10-07T00:00:00Z",
      author: "Mitra Creative Engine"
    }
  }
];

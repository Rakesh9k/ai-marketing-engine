/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * 30 High-Quality Creative Recipes
 */

import type { SeedItemDefinition } from "./psychology.seed";

export const RECIPE_SEEDS: SeedItemDefinition[] = [
  {
    id: "recipe_family_weekend_feast",
    type: "RECIPE",
    canonicalName: "Family Weekend Feast Campaign Recipe",
    definition: "Combines Choice Simplification + Curated Family Set + Problem-Agitation-Solution Story + Warm Editorial Visual + All-Inclusive Family Offer + Reserve Table CTA.",
    purpose: "Eliminate family weekend dining decision friction with high perceived combo value.",
    useCases: ["Family restaurant promotions", "Weekend dining specials"],
    antiPatterns: ["Single dish discount ads without family combo messaging"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.96,
    relationships: [
      { targetItemId: "psychology_choice_simplification", relationshipType: "USES_PSYCHOLOGY", confidence: 0.95 },
      { targetItemId: "mechanism_curated_family_set", relationshipType: "USES_MECHANISM", confidence: 0.95 },
      { targetItemId: "story_problem_agitation_solution", relationshipType: "USES_STORY", confidence: 0.94 },
      { targetItemId: "visual_overhead_flatlay_arrangement", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_all_inclusive_family_combo", relationshipType: "USES_OFFER", confidence: 0.96 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_salon_express_glow_transformation",
    type: "RECIPE",
    canonicalName: "Salon Express Glow Transformation Recipe",
    definition: "Combines Risk Reversal + Priority Slot Guarantee + Before-After Story + Macro Close-Up Visual + First-Time Visitor Pass + Book Free Consultation CTA.",
    purpose: "Drive first-time salon visits with zero purchase hesitation.",
    useCases: ["Salon intro promotion", "Hydra-facial launch"],
    antiPatterns: ["Vague skincare claims with no before/after proof"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "USES_PSYCHOLOGY", confidence: 0.95 },
      { targetItemId: "mechanism_priority_slot_guarantee", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_before_and_after_contrast", relationshipType: "USES_STORY", confidence: 0.95 },
      { targetItemId: "visual_macro_extreme_close_up", relationshipType: "USES_VISUAL", confidence: 0.94 },
      { targetItemId: "offer_first_time_visitor_pass", relationshipType: "USES_OFFER", confidence: 0.95 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.94 }
    ]
  },
  {
    id: "recipe_real_estate_clear_title_launch",
    type: "RECIPE",
    canonicalName: "Real Estate Clear Title Launch Recipe",
    definition: "Combines Risk Reversal + Commute Time Calculator + Myth vs Reality Story + Wide Architectural Visual + Zero Down Payment Offer + Schedule Site Visit CTA.",
    purpose: "Overcome first-time homebuyer location doubt and financial hesitation.",
    useCases: ["Residential 2BHK/3BHK launch", "Gated township project"],
    antiPatterns: ["Empty hype brochure without commute or legal facts"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_commute_time_calculator", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_myth_vs_reality", relationshipType: "USES_STORY", confidence: 0.93 },
      { targetItemId: "visual_wide_architectural_panoramic", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_zero_down_payment_installment", relationshipType: "USES_OFFER", confidence: 0.94 },
      { targetItemId: "cta_schedule_site_visit", relationshipType: "USES_CTA", confidence: 0.93 }
    ]
  },
  {
    id: "recipe_express_it_park_lunch_box",
    type: "RECIPE",
    canonicalName: "Express IT Park Lunch Box Recipe",
    definition: "Combines Cognitive Ease + Express Lunch Box + Secret Shortcut Story + Text Overlay Visual + Tiered Volume Discount + Order On WhatsApp CTA.",
    purpose: "Capture corporate office lunch food orders in IT corridors.",
    useCases: ["Weekday office delivery", "Cloud kitchen lunch box"],
    antiPatterns: ["Complex à la carte ordering menus"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_express_lunch_box", relationshipType: "USES_MECHANISM", confidence: 0.94 },
      { targetItemId: "story_the_secret_shortcut", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_text_overlay_hook_banner", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_tiered_volume_discount", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.96 }
    ]
  },
  {
    id: "recipe_bridal_multi_session_makeover",
    type: "RECIPE",
    canonicalName: "Bridal Multi-Session Makeover Recipe",
    definition: "Combines Social Proof + Multi-Session Beauty Plan + Hero Transformation Story + Mirror Reflection Visual + Free Home Trial Offer + Book Free Consultation CTA.",
    purpose: "Acquire high-ticket bridal makeup packages early in wedding season.",
    useCases: ["Bridal studio marketing", "Wedding season salon packages"],
    antiPatterns: ["Selling single uncoordinated treatments"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_multi_session_beauty_plan", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_hero_transformation_journey", relationshipType: "USES_STORY", confidence: 0.94 },
      { targetItemId: "visual_mirror_reflection_shot", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_free_home_sample_trial", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.94 }
    ]
  },
  {
    id: "recipe_festive_diwali_gourmet_hamper",
    type: "RECIPE",
    canonicalName: "Festive Diwali Gourmet Hamper Recipe",
    definition: "Combines Priming Effect + Curated Festive Hamper + Festive Reunion Story + Seasonal Decor Visual + Seasonal Hamper Offer + Claim Your Voucher CTA.",
    purpose: "Capture corporate and family holiday gifting budgets.",
    useCases: ["Diwali sweet box hamper", "Year-end gift campaign"],
    antiPatterns: ["Generic cheap gift sets without festive branding"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_priming_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_curated_festive_hamper", relationshipType: "USES_MECHANISM", confidence: 0.94 },
      { targetItemId: "story_festive_reunion_celebration", relationshipType: "USES_STORY", confidence: 0.92 },
      { targetItemId: "visual_seasonal_decor_atmosphere", relationshipType: "USES_VISUAL", confidence: 0.9 },
      { targetItemId: "offer_seasonal_festive_hamper_bundle", relationshipType: "USES_OFFER", confidence: 0.93 },
      { targetItemId: "cta_claim_your_voucher", relationshipType: "USES_CTA", confidence: 0.92 }
    ]
  },
  {
    id: "recipe_nri_luxury_villa_concierge",
    type: "RECIPE",
    canonicalName: "NRI Luxury Villa Concierge Recipe",
    definition: "Combines Authority Bias + NRI Concierge Desk + VIP Insider Access Story + Aerial Drone Visual + Staggered Milestone Offer + Schedule Site Visit CTA.",
    purpose: "Sell high-end real estate villas to non-resident Indian investors.",
    useCases: ["NRI luxury villa marketing", "Gated villa community"],
    antiPatterns: ["Requiring physical presence for documentation"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "USES_PSYCHOLOGY", confidence: 0.92 },
      { targetItemId: "mechanism_nri_concierge_desk", relationshipType: "USES_MECHANISM", confidence: 0.91 },
      { targetItemId: "story_vip_insider_access", relationshipType: "USES_STORY", confidence: 0.9 },
      { targetItemId: "visual_aerial_drone_perspective", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_staggered_payment_milestone", relationshipType: "USES_OFFER", confidence: 0.93 },
      { targetItemId: "cta_schedule_site_visit", relationshipType: "USES_CTA", confidence: 0.92 }
    ]
  },
  {
    id: "recipe_monsoon_comfort_chai_pakora",
    type: "RECIPE",
    canonicalName: "Monsoon Comfort Chai & Pakora Recipe",
    definition: "Combines Priming Effect + Monsoon Comfort Combo + Seasonal Transition Story + Steaming Beverage Visual + Buy One Get One Offer + Order On WhatsApp CTA.",
    purpose: "Capitalize on sudden monsoon weather cravings.",
    useCases: ["Monsoon food delivery", "Chai cafe promotions"],
    antiPatterns: ["Promoting cold iced beverages during heavy rains"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_priming_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.95 },
      { targetItemId: "mechanism_monsoon_comfort_combo", relationshipType: "USES_MECHANISM", confidence: 0.94 },
      { targetItemId: "story_seasonal_transition_prep", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_steaming_hot_beverage_macro", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_buy_one_get_one_free", relationshipType: "USES_OFFER", confidence: 0.94 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.96 }
    ]
  },
  {
    id: "recipe_post_festive_7day_detox_cleanse",
    type: "RECIPE",
    canonicalName: "Post-Festive 7-Day Detox Cleanse Recipe",
    definition: "Combines Anchoring Effect + Post-Festive Reset Bowl + The Scientific Experiment Story + Clean Minimalist Visual + Cashback Wallet Offer + Try It Risk Free CTA.",
    purpose: "Capture health reset demand immediately after heavy holiday feasting.",
    useCases: ["Salad bar launch", "Juice cleanse subscription"],
    antiPatterns: ["Promoting heavy fried cheat meals post-holidays"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_anchoring_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.91 },
      { targetItemId: "mechanism_post_festive_reset_bowl", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_the_scientific_experiment", relationshipType: "USES_STORY", confidence: 0.9 },
      { targetItemId: "visual_clean_minimalist_studio", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_cashback_loyalty_credit", relationshipType: "USES_OFFER", confidence: 0.89 },
      { targetItemId: "cta_try_it_risk_free", relationshipType: "USES_CTA", confidence: 0.93 }
    ]
  },
  {
    id: "recipe_chef_signature_counter_dining",
    type: "RECIPE",
    canonicalName: "Chef Signature Counter Dining Recipe",
    definition: "Combines Status Signaling + Solo Chef Counter Table + Behind-The-Curtain Story + Warm Cinematic Visual + Exclusive Chef Counter Pass Offer + Reserve Table CTA.",
    purpose: "Sell high-margin VIP culinary experiences to discerning foodies.",
    useCases: ["Gourmet restaurant chef table", "Fine dining lounge"],
    antiPatterns: ["Discounting chef counter seats"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_status_signaling", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_solo_chef_counter_table", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_behind_the_curtain_craftsmanship", relationshipType: "USES_STORY", confidence: 0.93 },
      { targetItemId: "visual_warm_cinematic_lighting", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_exclusive_chef_counter_pass", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_hygiene_sealed_pedicure_spa",
    type: "RECIPE",
    canonicalName: "Hygiene-Sealed Pedicure Spa Recipe",
    definition: "Combines Risk Reversal + Disposable Hygiene Seal + Stress-Free Guarantee Story + Macro Lens Skin Visual + 100% Satisfaction Offer + Book Free Consultation CTA.",
    purpose: "Eliminate customer hygiene hesitation for nail and feet care.",
    useCases: ["Pedicure lounge", "Clinical podiatry spa"],
    antiPatterns: ["Hiding equipment cleaning procedures"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "USES_PSYCHOLOGY", confidence: 0.95 },
      { targetItemId: "mechanism_disposable_hygiene_seal", relationshipType: "USES_MECHANISM", confidence: 0.95 },
      { targetItemId: "story_the_stress_free_guarantee_walkthrough", relationshipType: "USES_STORY", confidence: 0.94 },
      { targetItemId: "visual_macro_lens_skin_texture", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_100_percent_satisfaction_guarantee", relationshipType: "USES_OFFER", confidence: 0.96 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.93 }
    ]
  },
  {
    id: "recipe_work_and_brew_daytime_pass",
    type: "RECIPE",
    canonicalName: "Work & Brew Daytime Pass Recipe",
    definition: "Combines Reciprocity Norm + Work & Brew Day Pass + Day-In-The-Life Story + First Person POV Visual + Digital Stamp Card Offer + Order On WhatsApp CTA.",
    purpose: "Fill daytime off-peak cafe seating with remote workers.",
    useCases: ["Artisan coffee shop", "Co-working cafe"],
    antiPatterns: ["Charging high hourly desk fees without free coffee refill"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_reciprocity_norm", relationshipType: "USES_PSYCHOLOGY", confidence: 0.9 },
      { targetItemId: "mechanism_work_and_brew_day_pass", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_day_in_the_life_experience", relationshipType: "USES_STORY", confidence: 0.89 },
      { targetItemId: "visual_first_person_pov_framing", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_stamp_card_frequent_buyer", relationshipType: "USES_OFFER", confidence: 0.9 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_pet_friendly_patio_brunch",
    type: "RECIPE",
    canonicalName: "Pet-Friendly Patio Brunch Recipe",
    definition: "Combines Social Proof + Paws & Brunch Experience + Community Spotlight Story + Authentic Candid Visual + Complimentary Add-On Offer + Reserve Table CTA.",
    purpose: "Attract pet owners for weekend outdoor garden dining.",
    useCases: ["Pet cafe brunch", "Outdoor garden restaurant"],
    antiPatterns: ["Restricting pets to cramped corner tables"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "USES_PSYCHOLOGY", confidence: 0.9 },
      { targetItemId: "mechanism_paws_and_brunch_experience", relationshipType: "USES_MECHANISM", confidence: 0.91 },
      { targetItemId: "story_community_spotlight_tribute", relationshipType: "USES_STORY", confidence: 0.88 },
      { targetItemId: "visual_authentic_candid_smile", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_complimentary_add_on_service", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_turnkey_interior_fixed_contract",
    type: "RECIPE",
    canonicalName: "Turnkey Interior Fixed Contract Recipe",
    definition: "Combines Risk Reversal + Fixed Price Timeline Contract + Guarantee Promise Story + Architectural Blueprint Visual + Staggered Payment Offer + Get Instant Quote CTA.",
    purpose: "Convert homeowners worried about budget overruns into interior clients.",
    useCases: ["Interior design studio", "Modular kitchen renovation"],
    antiPatterns: ["Open ended estimates with no timeline guarantee"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_fixed_price_timeline_contract", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_guarantee_promise_fulfillment", relationshipType: "USES_STORY", confidence: 0.93 },
      { targetItemId: "visual_architectural_blueprint_overlay", relationshipType: "USES_VISUAL", confidence: 0.89 },
      { targetItemId: "offer_staggered_payment_milestone", relationshipType: "USES_OFFER", confidence: 0.93 },
      { targetItemId: "cta_get_instant_quote", relationshipType: "USES_CTA", confidence: 0.94 }
    ]
  },
  {
    id: "recipe_midnight_express_cloud_kitchen",
    type: "RECIPE",
    canonicalName: "Midnight Express Cloud Kitchen Recipe",
    definition: "Combines Instant Gratification + Midnight Express Kitchen + Problem-Agitation-Solution Story + Dark Mode Neon Visual + Flash Sale Voucher + Order On WhatsApp CTA.",
    purpose: "Capture late-night hungry shift workers and college students.",
    useCases: ["Late night delivery kitchen", "24/7 cafe delivery"],
    antiPatterns: ["Promoting cold packaged foods past midnight"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_midnight_express_kitchen", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_problem_agitation_solution", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_dark_mode_neon_accent", relationshipType: "USES_VISUAL", confidence: 0.89 },
      { targetItemId: "offer_flash_sale_24hr_voucher", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.96 }
    ]
  },
  {
    id: "recipe_damage_repair_ammonia_free_color",
    type: "RECIPE",
    canonicalName: "Damage-Repair Ammonia-Free Color Recipe",
    definition: "Combines Risk Reversal + Ammonia-Free Color Trial + Restoration Revival Story + Human Hand Proof Visual + Free Home Trial Offer + Book Free Consultation CTA.",
    purpose: "Overcome client hair damage fears during coloring services.",
    useCases: ["Balayage specialty salon", "Hair color lab"],
    antiPatterns: ["Coloring without prior damage consultation test"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_ammonia_free_color_trial", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_restoration_revival", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_human_hand_demonstrating_proof", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_free_home_sample_trial", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.93 }
    ]
  },
  {
    id: "recipe_open_kitchen_farm_to_table",
    type: "RECIPE",
    canonicalName: "Open-Kitchen Farm-To-Table Recipe",
    definition: "Combines Authority Bias + Open Kitchen Ingredient Proof + Sustainable Sourcing Story + Ingredient Explosion Visual + Complimentary Add-On Offer + Explore Menu CTA.",
    purpose: "Convince health-conscious diners of clean organic sourcing.",
    useCases: ["Organic farm cafe", "Clean eating restaurant"],
    antiPatterns: ["Vague healthy claims without farm origin proof"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "USES_PSYCHOLOGY", confidence: 0.92 },
      { targetItemId: "mechanism_open_kitchen_ingredient_proof", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_sustainable_sourcing_journey", relationshipType: "USES_STORY", confidence: 0.9 },
      { targetItemId: "visual_ingredient_explosion_splash", relationshipType: "USES_VISUAL", confidence: 0.88 },
      { targetItemId: "offer_complimentary_add_on_service", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_explore_the_menu", relationshipType: "USES_CTA", confidence: 0.9 }
    ]
  },
  {
    id: "recipe_flex_lease_startup_office",
    type: "RECIPE",
    canonicalName: "Flex-Lease Startup Office Recipe",
    definition: "Combines Endowment Effect + Flex Lease Growth Guarantee + Comparative Breakdown Story + Tech Forward Visual + Early Bird Offer + Download Floorplan CTA.",
    purpose: "Convert growing tech startups hesitant about long commercial leases.",
    useCases: ["Co-working space launch", "Managed tech park office"],
    antiPatterns: ["Inflexible 10-year lock-in lease agreements"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_endowment_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.9 },
      { targetItemId: "mechanism_flex_lease_growth_guarantee", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_the_comparative_breakdown", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_infographic_split_callout", relationshipType: "USES_VISUAL", confidence: 0.9 },
      { targetItemId: "offer_limited_time_early_bird", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_download_brochure_floorplan", relationshipType: "USES_CTA", confidence: 0.91 }
    ]
  },
  {
    id: "recipe_express_60min_home_repair",
    type: "RECIPE",
    canonicalName: "Express 60-Min Home Repair Recipe",
    definition: "Combines Instant Gratification + 60-Min Dispatch Guarantee + Problem-Agitation-Solution Story + Text Overlay Visual + 100% Guarantee Offer + Call Direct CTA.",
    purpose: "Capture immediate emergency home plumbing and electrical calls.",
    useCases: ["Emergency electrician", "Plumbing repair service"],
    antiPatterns: ["Vague arrival time promises"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_60_min_dispatch_guarantee", relationshipType: "USES_MECHANISM", confidence: 0.93 },
      { targetItemId: "story_problem_agitation_solution", relationshipType: "USES_STORY", confidence: 0.93 },
      { targetItemId: "visual_text_overlay_hook_banner", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_100_percent_satisfaction_guarantee", relationshipType: "USES_OFFER", confidence: 0.95 },
      { targetItemId: "cta_call_us_now_direct", relationshipType: "USES_CTA", confidence: 0.93 }
    ]
  },
  {
    id: "recipe_vip_celebration_dinner_reserve",
    type: "RECIPE",
    canonicalName: "VIP Celebration Dinner Reserve Recipe",
    definition: "Combines Status Signaling + VIP Celebration Reserve + Special Occasion Risk Story + Warm Cinematic Visual + Valet & Welcome Drink Offer + Reserve Table CTA.",
    purpose: "Secure high-stakes birthday and anniversary dinner reservations.",
    useCases: ["Fine dining anniversary package", "Celebratory dinner special"],
    antiPatterns: ["Noisy, unreserved casual seating"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_status_signaling", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_vip_celebration_reserve", relationshipType: "USES_MECHANISM", confidence: 0.94 },
      { targetItemId: "story_day_in_the_life_experience", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_warm_cinematic_lighting", relationshipType: "USES_VISUAL", confidence: 0.94 },
      { targetItemId: "offer_complimentary_valet_drink_treat", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_express_traveler_grooming_touchup",
    type: "RECIPE",
    canonicalName: "Express Traveler Grooming Touchup Recipe",
    definition: "Combines Cognitive Ease + Express Traveler Grooming + Secret Shortcut Story + Step Grid Visual + First-Time Pass Offer + Order On WhatsApp CTA.",
    purpose: "Capture busy business travelers needing quick grooming before meetings.",
    useCases: ["Airport salon touchup", "Transit hotel spa"],
    antiPatterns: ["Long 2-hour treatment commitments"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "USES_PSYCHOLOGY", confidence: 0.91 },
      { targetItemId: "mechanism_express_traveler_grooming", relationshipType: "USES_MECHANISM", confidence: 0.9 },
      { targetItemId: "story_the_secret_shortcut", relationshipType: "USES_STORY", confidence: 0.89 },
      { targetItemId: "visual_step_1_2_3_numbered_grid", relationshipType: "USES_VISUAL", confidence: 0.9 },
      { targetItemId: "offer_first_time_visitor_pass", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_digital_detox_wellness_escape",
    type: "RECIPE",
    canonicalName: "Digital Detox Wellness Escape Recipe",
    definition: "Combines Priming Effect + Digital Detox Spa Package + Micro Adventure Story + Relaxing Water Visual + VIP Pass Subscription Offer + Book Free Consultation CTA.",
    purpose: "Sell restorative spa day packages to overworked managers.",
    useCases: ["Luxury day spa retreat", "Aromatherapy relaxation"],
    antiPatterns: ["Fast-paced aggressive voucher promotions"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_priming_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.91 },
      { targetItemId: "mechanism_digital_detox_spa_package", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_micro_adventure_getaway", relationshipType: "USES_STORY", confidence: 0.89 },
      { targetItemId: "visual_relaxing_water_botanical_element", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_membership_vip_pass_subscription", relationshipType: "USES_OFFER", confidence: 0.9 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.92 }
    ]
  },
  {
    id: "recipe_school_cluster_housing_finder",
    type: "RECIPE",
    canonicalName: "School Cluster Housing Finder Recipe",
    definition: "Combines Framing Effect + School Cluster Housing Guide + First-Time Visitor Story + Infographic Callout Visual + Staggered Payment Offer + Download Floorplan CTA.",
    purpose: "Target families relocating near premier schools during admission season.",
    useCases: ["Family residential apartment sales", "Gated rental communities"],
    antiPatterns: ["Ignoring educational institution proximity data"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_framing_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.9 },
      { targetItemId: "mechanism_school_cluster_housing_guide", relationshipType: "USES_MECHANISM", confidence: 0.91 },
      { targetItemId: "story_first_time_visitor_guide", relationshipType: "USES_STORY", confidence: 0.89 },
      { targetItemId: "visual_infographic_split_callout", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_staggered_payment_milestone", relationshipType: "USES_OFFER", confidence: 0.9 },
      { targetItemId: "cta_download_brochure_floorplan", relationshipType: "USES_CTA", confidence: 0.92 }
    ]
  },
  {
    id: "recipe_protein_express_gym_pickup",
    type: "RECIPE",
    canonicalName: "Protein Express Gym Pickup Recipe",
    definition: "Combines Instant Gratification + Protein Express Pickup + Day-In-The-Life Story + Dynamic Action Visual + Cashback Wallet Offer + Order On WhatsApp CTA.",
    purpose: "Supply immediate post-workout fresh meal bowls to local gymgoers.",
    useCases: ["Health cafe delivery", "Fitness meal plan"],
    antiPatterns: ["High-calorie junk food messaging"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "USES_PSYCHOLOGY", confidence: 0.91 },
      { targetItemId: "mechanism_protein_express_pickup", relationshipType: "USES_MECHANISM", confidence: 0.9 },
      { targetItemId: "story_day_in_the_life_experience", relationshipType: "USES_STORY", confidence: 0.88 },
      { targetItemId: "visual_dynamic_action_pour_steam", relationshipType: "USES_VISUAL", confidence: 0.92 },
      { targetItemId: "offer_cashback_loyalty_credit", relationshipType: "USES_OFFER", confidence: 0.89 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_senior_friendly_housing_comfort",
    type: "RECIPE",
    canonicalName: "Senior-Friendly Housing Comfort Recipe",
    definition: "Combines Cognitive Ease + Senior-Friendly Comfort Suite + Stress-Free Guarantee Story + Warm Lighting Visual + Zero Down Payment Offer + Schedule Site Visit CTA.",
    purpose: "Appeal to senior citizens looking for accessible living spaces.",
    useCases: ["Retirement villa sales", "Senior friendly apartments"],
    antiPatterns: ["Loud music and steep staircases"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "USES_PSYCHOLOGY", confidence: 0.9 },
      { targetItemId: "mechanism_senior_friendly_comfort_suite", relationshipType: "USES_MECHANISM", confidence: 0.89 },
      { targetItemId: "story_the_stress_free_guarantee_walkthrough", relationshipType: "USES_STORY", confidence: 0.91 },
      { targetItemId: "visual_warm_cinematic_lighting", relationshipType: "USES_VISUAL", confidence: 0.9 },
      { targetItemId: "offer_zero_down_payment_installment", relationshipType: "USES_OFFER", confidence: 0.91 },
      { targetItemId: "cta_schedule_site_visit", relationshipType: "USES_CTA", confidence: 0.92 }
    ]
  },
  {
    id: "recipe_all_inclusive_kids_birthday_box",
    type: "RECIPE",
    canonicalName: "All-Inclusive Kids Birthday Box Recipe",
    definition: "Combines Cognitive Ease + All-Inclusive Party Box + Hero Transformation Story + Happy Children Visual + All-Inclusive Family Offer + Reserve Table CTA.",
    purpose: "Relieve parents from birthday party planning stress.",
    useCases: ["Kids party cafe packages", "Family restaurant celebration"],
    antiPatterns: ["Selling food without entertainment/decor coordination"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_all_inclusive_party_box", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_hero_transformation_journey", relationshipType: "USES_STORY", confidence: 0.9 },
      { targetItemId: "visual_happy_children_family_moment", relationshipType: "USES_VISUAL", confidence: 0.91 },
      { targetItemId: "offer_all_inclusive_family_combo", relationshipType: "USES_OFFER", confidence: 0.94 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_bogo_flash_pizza_frenzy",
    type: "RECIPE",
    canonicalName: "BOGO Flash Pizza Frenzy Recipe",
    definition: "Combines Loss Aversion + Express Lunch Box + Limited Batch Race Story + Golden Crunch Visual + BOGO Special Offer + Order On WhatsApp CTA.",
    purpose: "Drive explosive short-term pizza delivery volume during flash windows.",
    useCases: ["Wood-fired pizza delivery", "Casual pizzeria flash sale"],
    antiPatterns: ["Extending flash sales past expiration date"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_loss_aversion", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_express_lunch_box", relationshipType: "USES_MECHANISM", confidence: 0.91 },
      { targetItemId: "story_limited_batch_race", relationshipType: "USES_STORY", confidence: 0.93 },
      { targetItemId: "visual_crispy_golden_crunch_shot", relationshipType: "USES_VISUAL", confidence: 0.94 },
      { targetItemId: "offer_buy_one_get_one_free", relationshipType: "USES_OFFER", confidence: 0.96 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "USES_CTA", confidence: 0.96 }
    ]
  },
  {
    id: "recipe_16hr_hd_bridal_airbrush",
    type: "RECIPE",
    canonicalName: "16hr HD Bridal Airbrush Recipe",
    definition: "Combines Authority Bias + 16hr HD Airbrush Guarantee + Expert Masterclass Story + Macro Lens Skin Visual + 100% Satisfaction Offer + Book Free Consultation CTA.",
    purpose: "Target high-budget brides worried about long ceremony makeup wear.",
    useCases: ["Bridal beauty studio", "Destination wedding makeup"],
    antiPatterns: ["Using standard non-waterproof makeup for brides"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_16hr_hd_airbrush_guarantee", relationshipType: "USES_MECHANISM", confidence: 0.94 },
      { targetItemId: "story_expert_masterclass_breakdown", relationshipType: "USES_STORY", confidence: 0.92 },
      { targetItemId: "visual_macro_lens_skin_texture", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_100_percent_satisfaction_guarantee", relationshipType: "USES_OFFER", confidence: 0.95 },
      { targetItemId: "cta_book_free_consultation", relationshipType: "USES_CTA", confidence: 0.94 }
    ]
  },
  {
    id: "recipe_covered_valet_fine_dining",
    type: "RECIPE",
    canonicalName: "Covered Valet Fine Dining Recipe",
    definition: "Combines Status Signaling + Covered VIP Valet Service + VIP Insider Access Story + Nighttime Ambient Visual + Valet & Welcome Drink Offer + Reserve Table CTA.",
    purpose: "Eliminate parking stress for luxury restaurant guests.",
    useCases: ["Fine dining restaurant launch", "Exclusive lounge bar"],
    antiPatterns: ["Unmanaged street parking"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_status_signaling", relationshipType: "USES_PSYCHOLOGY", confidence: 0.93 },
      { targetItemId: "mechanism_covered_vip_valet_service", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_vip_insider_access", relationshipType: "USES_STORY", confidence: 0.9 },
      { targetItemId: "visual_nighttime_ambient_patio_glow", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_complimentary_valet_drink_treat", relationshipType: "USES_OFFER", confidence: 0.92 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  },
  {
    id: "recipe_unlimited_kebab_tasting_feast",
    type: "RECIPE",
    canonicalName: "Unlimited Kebab Tasting Feast Recipe",
    definition: "Combines Anchoring Effect + Curated Family Set + Underdog Challenge Story + Action Pour Visual + Unlimited Tasting Offer + Reserve Table CTA.",
    purpose: "Drive high-volume feast bookings during festival periods.",
    useCases: ["Unlimited kebab festival", "Buffet restaurant specials"],
    antiPatterns: ["Slow kitchen replenishment delaying refills"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_anchoring_effect", relationshipType: "USES_PSYCHOLOGY", confidence: 0.94 },
      { targetItemId: "mechanism_curated_family_set", relationshipType: "USES_MECHANISM", confidence: 0.92 },
      { targetItemId: "story_underdog_quality_challenge", relationshipType: "USES_STORY", confidence: 0.89 },
      { targetItemId: "visual_dynamic_action_pour_steam", relationshipType: "USES_VISUAL", confidence: 0.93 },
      { targetItemId: "offer_unlimited_tasting_experience", relationshipType: "USES_OFFER", confidence: 0.94 },
      { targetItemId: "cta_reserve_table_now", relationshipType: "USES_CTA", confidence: 0.95 }
    ]
  }
];

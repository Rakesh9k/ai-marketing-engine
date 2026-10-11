/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * 30 High-Quality Insight Patterns
 */

import type { SeedItemDefinition } from "./psychology.seed";

export const INSIGHT_SEEDS: SeedItemDefinition[] = [
  {
    id: "insight_weekend_family_dinner_friction",
    type: "INSIGHT",
    canonicalName: "Weekend Family Dinner Friction",
    definition: "Families experience friction choosing a weekend dining option that satisfies diverse age preferences quickly.",
    purpose: "Target family meal decision paralysis with high-consensus menu combinations.",
    useCases: ["Family restaurant promotions", "Weekend combo meals"],
    antiPatterns: ["Focusing only on individual meals", "Ignoring kid preferences"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_choice_simplification", relationshipType: "DERIVED_FROM", confidence: 0.95 },
      { targetItemId: "mechanism_curated_family_set", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_last_minute_grooming_urgency",
    type: "INSIGHT",
    canonicalName: "Last-Minute Grooming Urgency",
    definition: "Working professionals suddenly discover an unexpected meeting or social event requiring quick salon services.",
    purpose: "Capture high-intent appointment bookings with fast-slot availability.",
    useCases: ["Salon express slots", "Professional styling"],
    antiPatterns: ["Requiring multi-day advance notice"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.88,
    relationships: [
      { targetItemId: "psychology_loss_aversion", relationshipType: "DERIVED_FROM", confidence: 0.9 },
      { targetItemId: "mechanism_priority_slot_guarantee", relationshipType: "SOLVED_BY", confidence: 0.88 }
    ]
  },
  {
    id: "insight_first_home_buyer_location_doubt",
    type: "INSIGHT",
    canonicalName: "First Home Buyer Location Doubt",
    definition: "First-time real estate buyers worry about neighborhood future infrastructure growth and commute times.",
    purpose: "Address buyer anxiety with verified connectivity and infrastructure growth proof points.",
    useCases: ["Residential launch campaigns", "Gated community promotion"],
    antiPatterns: ["Vague hype without commuting facts"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "DERIVED_FROM", confidence: 0.92 },
      { targetItemId: "mechanism_commute_time_calculator", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_weekday_lunch_decision_fatigue",
    type: "INSIGHT",
    canonicalName: "Weekday Lunch Decision Fatigue",
    definition: "Office employees waste time daily deciding where and what to order for fast, healthy team lunches.",
    purpose: "Simplify daily corporate lunch decisions with fast express meal boxes.",
    useCases: ["IT park food delivery", "Express lunch combos"],
    antiPatterns: ["Overly complex à la carte menus"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "DERIVED_FROM", confidence: 0.9 },
      { targetItemId: "mechanism_express_lunch_box", relationshipType: "SOLVED_BY", confidence: 0.92 }
    ]
  },
  {
    id: "insight_special_occasion_dining_risk",
    type: "INSIGHT",
    canonicalName: "Special Occasion Dining Risk",
    definition: "Diners celebrating birthdays or anniversaries fear poor seating, slow service, or embarrassing hospitality errors.",
    purpose: "Provide VIP reservation guarantees for high-stakes celebratory dinners.",
    useCases: ["Fine dining celebratory packages", "Anniversary specials"],
    antiPatterns: ["Standard casual messaging"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_status_signaling", relationshipType: "DERIVED_FROM", confidence: 0.91 },
      { targetItemId: "mechanism_vip_celebration_reserve", relationshipType: "SOLVED_BY", confidence: 0.93 }
    ]
  },
  {
    id: "insight_wedding_season_beauty_prep",
    type: "INSIGHT",
    canonicalName: "Wedding Season Beauty Prep",
    definition: "Wedding attendees and family members struggle to schedule multi-session skin and hair prep routines efficiently.",
    purpose: "Offer structured multi-week bridal/guest packages.",
    useCases: ["Bridal makeup packages", "Festival grooming"],
    antiPatterns: ["Selling standalone single treatments without a prep timeline"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_commitment_consistency", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_multi_session_beauty_plan", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_rental_income_investor_hesitation",
    type: "INSIGHT",
    canonicalName: "Rental Income Investor Hesitation",
    definition: "Property investors worry about tenant vacancy periods and unmanaged property maintenance burden.",
    purpose: "Highlight rental yield guarantees and full tenant management services.",
    useCases: ["Commercial space investment", "Studio apartment launches"],
    antiPatterns: ["Focusing only on capital appreciation without yield metrics"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.87,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "DERIVED_FROM", confidence: 0.91 },
      { targetItemId: "mechanism_rental_yield_guarantee", relationshipType: "SOLVED_BY", confidence: 0.89 }
    ]
  },
  {
    id: "insight_post_workout_protein_convenience",
    type: "INSIGHT",
    canonicalName: "Post-Workout Protein Convenience",
    definition: "Fitness enthusiasts need immediate, high-protein fresh meal options right after gym sessions.",
    purpose: "Position fresh protein smoothies and meal bowls directly to local gymgoers.",
    useCases: ["Health cafe promotions", "Fitness meal subs"],
    antiPatterns: ["High-calorie junk food messaging"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.86,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_protein_express_pickup", relationshipType: "SOLVED_BY", confidence: 0.86 }
    ]
  },
  {
    id: "insight_festive_gifting_doubt",
    type: "INSIGHT",
    canonicalName: "Festive Gifting Doubt",
    definition: "Corporate clients and individuals struggle to select festive gifts that feel elegant, premium, and universally appreciated.",
    purpose: "Offer customizable premium festive food and luxury gift hampers with branded packaging.",
    useCases: ["Diwali gift hampers", "Corporate year-end gifts"],
    antiPatterns: ["Generic cheap gift sets without customization"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "DERIVED_FROM", confidence: 0.9 },
      { targetItemId: "mechanism_curated_festive_hamper", relationshipType: "SOLVED_BY", confidence: 0.92 }
    ]
  },
  {
    id: "insight_hair_damage_repair_desire",
    type: "INSIGHT",
    canonicalName: "Hair Damage Repair Desire",
    definition: "Clients experiencing pollution or styling damage seek scientifically proven restorative hair spa treatments.",
    purpose: "Highlight deep conditioning technology and immediate visible smooth hair results.",
    useCases: ["Keratin therapy", "Botanical spa treatments"],
    antiPatterns: ["Superficial shampoo claims without salon-grade proof"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "DERIVED_FROM", confidence: 0.89 },
      { targetItemId: "mechanism_scientific_damage_audit", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_kids_birthday_party_stress",
    type: "INSIGHT",
    canonicalName: "Kids Birthday Party Stress",
    definition: "Parents face immense stress coordinating venue, food, theme decorations, and entertainment for children's parties.",
    purpose: "Provide all-inclusive hassle-free birthday celebration packages at venue restaurants.",
    useCases: ["Family restaurant events", "Playzone cafe parties"],
    antiPatterns: ["Selling food only without decor/coordination support"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "DERIVED_FROM", confidence: 0.93 },
      { targetItemId: "mechanism_all_inclusive_party_box", relationshipType: "SOLVED_BY", confidence: 0.91 }
    ]
  },
  {
    id: "insight_home_renovation_budget_overrun",
    type: "INSIGHT",
    canonicalName: "Home Renovation Budget Overrun",
    definition: "Homeowners fear hidden contractor costs and indefinite completion delays during interior redesigns.",
    purpose: "Offer fixed-budget turn-key interior design with strict 45-day delivery guarantees.",
    useCases: ["Interior design studio", "Modular kitchen upgrade"],
    antiPatterns: ["Open-ended estimate quotes without timeline penalties"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "DERIVED_FROM", confidence: 0.92 },
      { targetItemId: "mechanism_fixed_price_timeline_contract", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_late_night_craving_fulfillment",
    type: "INSIGHT",
    canonicalName: "Late Night Craving Fulfillment",
    definition: "Students and night-shift workers want fresh, hot gourmet snacks delivered fast past midnight.",
    purpose: "Establish late-night kitchen operations with guaranteed 30-minute midnight dispatch.",
    useCases: ["Late night cloud kitchen", "24/7 cafe delivery"],
    antiPatterns: ["Cold food pre-packaged options"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.88,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "DERIVED_FROM", confidence: 0.91 },
      { targetItemId: "mechanism_midnight_express_kitchen", relationshipType: "SOLVED_BY", confidence: 0.88 }
    ]
  },
  {
    id: "insight_luxury_spa_relaxation_escape",
    type: "INSIGHT",
    canonicalName: "Luxury Spa Relaxation Escape",
    definition: "Overworked corporate managers crave a quiet mental reset away from digital screens and work stress.",
    purpose: "Promote 90-minute digital detox wellness massage therapies in peaceful surroundings.",
    useCases: ["Day spa retreat", "Aromatherapy packages"],
    antiPatterns: ["Fast-paced discount voucher vibe"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_novelty_seeking", relationshipType: "DERIVED_FROM", confidence: 0.87 },
      { targetItemId: "mechanism_digital_detox_spa_package", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_school_admission_season_housing",
    type: "INSIGHT",
    canonicalName: "School Admission Season Housing",
    definition: "Families relocate specifically to be within a 2-km radius of top-tier schools before academic terms start.",
    purpose: "Highlight apartment proximity to top schools during admission months.",
    useCases: ["Family apartment sales", "Gated community rentals"],
    antiPatterns: ["Ignoring nearby educational institution mentions"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_framing_effect", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_school_cluster_housing_guide", relationshipType: "SOLVED_BY", confidence: 0.89 }
    ]
  },
  {
    id: "insight_rainy_day_comfort_comfort_food",
    type: "INSIGHT",
    canonicalName: "Rainy Day Comfort Food",
    definition: "Monsoon weather triggers strong psychological cravings for hot crispy snacks and warm beverages.",
    purpose: "Trigger contextual monsoon snack delivery ads with hot tea/chai and pakoras.",
    useCases: ["Monsoon food delivery", "Chai cafe promotions"],
    antiPatterns: ["Promoting cold iced beverages during heavy downpours"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_priming_effect", relationshipType: "DERIVED_FROM", confidence: 0.94 },
      { targetItemId: "mechanism_monsoon_comfort_combo", relationshipType: "SOLVED_BY", confidence: 0.93 }
    ]
  },
  {
    id: "insight_express_grooming_for_travelers",
    type: "INSIGHT",
    canonicalName: "Express Grooming for Travelers",
    definition: "Business travelers need quick touch-up treatments near transit hubs or hotels before key presentations.",
    purpose: "Provide 30-minute quick-grooming express packages.",
    useCases: ["Airport salon services", "Hotel spa express"],
    antiPatterns: ["Requiring 2-hour long treatment commitments"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.87,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "DERIVED_FROM", confidence: 0.89 },
      { targetItemId: "mechanism_express_traveler_grooming", relationshipType: "SOLVED_BY", confidence: 0.87 }
    ]
  },
  {
    id: "insight_pet_owner_dining_exclusion",
    type: "INSIGHT",
    canonicalName: "Pet Owner Dining Exclusion",
    definition: "Pet owners feel guilty leaving dogs home alone when going out for weekend brunches.",
    purpose: "Promote pet-friendly outdoor dining patios with dedicated pet menu treats.",
    useCases: ["Pet cafe brunch", "Outdoor garden restaurant"],
    antiPatterns: ["Strict no-pets policy without alternative arrangements"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.88,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "DERIVED_FROM", confidence: 0.86 },
      { targetItemId: "mechanism_paws_and_brunch_experience", relationshipType: "SOLVED_BY", confidence: 0.88 }
    ]
  },
  {
    id: "insight_commercial_office_space_scalability",
    type: "INSIGHT",
    canonicalName: "Commercial Office Space Scalability",
    definition: "Growing tech startups fear getting locked into long 5-year commercial leases before team sizes stabilize.",
    purpose: "Offer flexible managed co-working offices with 6-month scale-up clauses.",
    useCases: ["Commercial tech park lease", "Co-working space"],
    antiPatterns: ["Inflexible 10-year lock-in lease agreements"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_endowment_effect", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_flex_lease_growth_guarantee", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_clean_label_ingredient_transparency",
    type: "INSIGHT",
    canonicalName: "Clean Label Ingredient Transparency",
    definition: "Health-conscious diners distrust hidden preservatives, artificial colors, and low-quality cooking oils.",
    purpose: "Showcase farm-to-table organic sourcing and cold-pressed oil preparation.",
    useCases: ["Organic cafe", "Clean eating restaurant"],
    antiPatterns: ["Vague 'healthy' buzzwords without ingredient origin proof"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "DERIVED_FROM", confidence: 0.92 },
      { targetItemId: "mechanism_open_kitchen_ingredient_proof", relationshipType: "SOLVED_BY", confidence: 0.91 }
    ]
  },
  {
    id: "insight_salon_hygiene_skepticism",
    type: "INSIGHT",
    canonicalName: "Salon Hygiene Skepticism",
    definition: "Clients worry about unsterilized equipment, reused towels, and unhygienic wax kits.",
    purpose: "Guarantee single-use disposable kits opened right in front of the client.",
    useCases: ["Skin clinic", "Premium pedicure lounge"],
    antiPatterns: ["Concealing sanitization procedures behind closed doors"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "DERIVED_FROM", confidence: 0.95 },
      { targetItemId: "mechanism_disposable_hygiene_seal", relationshipType: "SOLVED_BY", confidence: 0.94 }
    ]
  },
  {
    id: "insight_nri_property_management_anxiety",
    type: "INSIGHT",
    canonicalName: "NRI Property Management Anxiety",
    definition: "Non-resident Indians struggle to inspect, maintain, or lease out real estate properties from abroad.",
    purpose: "Provide dedicated virtual video walkthroughs and overseas property management.",
    useCases: ["NRI real estate sales", "Luxury villa management"],
    antiPatterns: ["Requiring physical presence for documentation"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "DERIVED_FROM", confidence: 0.9 },
      { targetItemId: "mechanism_nri_concierge_desk", relationshipType: "SOLVED_BY", confidence: 0.89 }
    ]
  },
  {
    id: "insight_solo_diner_awkwardness",
    type: "INSIGHT",
    canonicalName: "Solo Diner Awkwardness",
    definition: "Single diners feel awkward eating alone at large multi-seater restaurant tables.",
    purpose: "Create welcoming solo-diner counter seating with single-serving portion sizes.",
    useCases: ["Ramen bar", "Express cafe counter"],
    antiPatterns: ["Forcing single diners onto awkward high-traffic corner tables"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.86,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_solo_chef_counter_table", relationshipType: "SOLVED_BY", confidence: 0.86 }
    ]
  },
  {
    id: "insight_hair_color_fear_of_damage",
    type: "INSIGHT",
    canonicalName: "Hair Color Fear of Damage",
    definition: "First-time hair color clients fear harsh chemical damage and unnatural brassy color outcomes.",
    purpose: "Offer ammonia-free vegan hair coloring with personalized strand test trial.",
    useCases: ["Balayage specialty salon", "Hair color lab"],
    antiPatterns: ["Proceeding with full coloring without prior consultation strand test"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_risk_reversal", relationshipType: "DERIVED_FROM", confidence: 0.91 },
      { targetItemId: "mechanism_ammonia_free_color_trial", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_senior_citizen_comfort_needs",
    type: "INSIGHT",
    canonicalName: "Senior Citizen Comfort Needs",
    definition: "Elderly diners and home buyers look for wheelchair accessibility, low-noise environments, and gentle cuisine.",
    purpose: "Highlight easy access ramps, quiet dining spaces, and mild healthy menu options.",
    useCases: ["Retirement community real estate", "Family heritage dining"],
    antiPatterns: ["Loud background music and steep staircases"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.88,
    relationships: [
      { targetItemId: "psychology_cognitive_ease", relationshipType: "DERIVED_FROM", confidence: 0.89 },
      { targetItemId: "mechanism_senior_friendly_comfort_suite", relationshipType: "SOLVED_BY", confidence: 0.88 }
    ]
  },
  {
    id: "insight_post_festive_detox_demand",
    type: "INSIGHT",
    canonicalName: "Post-Festive Detox Demand",
    definition: "After heavy holiday feasting, customers look for light salads, cold-pressed juices, and digestive cleanses.",
    purpose: "Launch post-festival 7-day clean eating refresh programs.",
    useCases: ["Salad bar promotion", "Juice cleanse subscription"],
    antiPatterns: ["Pushing heavy fried foods immediately after festivals"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_priming_effect", relationshipType: "DERIVED_FROM", confidence: 0.92 },
      { targetItemId: "mechanism_post_festive_reset_bowl", relationshipType: "SOLVED_BY", confidence: 0.91 }
    ]
  },
  {
    id: "insight_express_home_maintenance_need",
    type: "INSIGHT",
    canonicalName: "Express Home Maintenance Need",
    definition: "Busy professionals encounter sudden plumbing or electrical faults and need verified technicians within 60 minutes.",
    purpose: "Promote 60-minute emergency home repair dispatch with flat transparent pricing.",
    useCases: ["Local electrician services", "Plumbing emergency dispatch"],
    antiPatterns: ["Vague arrival windows like 'sometime between 10 AM and 6 PM'"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_instant_gratification", relationshipType: "DERIVED_FROM", confidence: 0.91 },
      { targetItemId: "mechanism_60_min_dispatch_guarantee", relationshipType: "SOLVED_BY", confidence: 0.9 }
    ]
  },
  {
    id: "insight_bridal_makeup_longevity_concern",
    type: "INSIGHT",
    canonicalName: "Bridal Makeup Longevity Concern",
    definition: "Brides worry their makeup will smudge or fade during 12-hour wedding ceremonies under warm lighting.",
    purpose: "Guarantee HD airbrush sweat-proof makeup lasting 16+ hours.",
    useCases: ["Bridal studio packages", "Destination wedding makeup"],
    antiPatterns: ["Using standard daily makeup without long-wear guarantees"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_authority_bias", relationshipType: "DERIVED_FROM", confidence: 0.92 },
      { targetItemId: "mechanism_16hr_hd_airbrush_guarantee", relationshipType: "SOLVED_BY", confidence: 0.93 }
    ]
  },
  {
    id: "insight_luxury_car_valet_parking_stress",
    type: "INSIGHT",
    canonicalName: "Luxury Car Valet Parking Stress",
    definition: "High-net-worth restaurant guests avoid places with bad parking options or risky street parking.",
    purpose: "Promote complimentary VIP covered valet parking with CCTV security.",
    useCases: ["Fine dining restaurant", "Exclusive lounge"],
    antiPatterns: ["Leaving guests to find distant paid street parking on their own"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.87,
    relationships: [
      { targetItemId: "psychology_status_signaling", relationshipType: "DERIVED_FROM", confidence: 0.88 },
      { targetItemId: "mechanism_covered_vip_valet_service", relationshipType: "SOLVED_BY", confidence: 0.87 }
    ]
  },
  {
    id: "insight_work_from_cafe_amenity_search",
    type: "INSIGHT",
    canonicalName: "Work From Cafe Amenity Search",
    definition: "Remote workers look for quiet cafes with fast Wi-Fi, abundant charging outlets, and good coffee.",
    purpose: "Market 'Work & Brew' daytime pass packages for remote freelancers.",
    useCases: ["Artisan coffee shop", "Boutique work cafe"],
    antiPatterns: ["Loud music and spotty Wi-Fi with no power plugs"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_reciprocity_norm", relationshipType: "DERIVED_FROM", confidence: 0.87 },
      { targetItemId: "mechanism_work_and_brew_day_pass", relationshipType: "SOLVED_BY", confidence: 0.89 }
    ]
  }
];

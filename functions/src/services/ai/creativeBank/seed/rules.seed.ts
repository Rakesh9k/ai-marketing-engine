/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * 50 High-Quality Combination Rules
 */

import type { SeedItemDefinition } from "./psychology.seed";

export const RULE_SEEDS: SeedItemDefinition[] = [
  {
    id: "rule_restaurant_family_simplification",
    type: "RULE",
    canonicalName: "Restaurant Family Simplification Rule",
    definition: "WHEN industry IS Restaurant AND audience IS Busy Working Parents THEN REQUIRE Choice Simplification psychology AND Curated Family Set mechanism.",
    purpose: "Ensure family restaurant campaigns prioritize low decision friction.",
    useCases: ["Family restaurant campaign generation"],
    antiPatterns: ["Using complex à la carte ordering for busy families"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_choice_simplification", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_curated_family_set", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_salon_first_time_risk_reversal",
    type: "RULE",
    canonicalName: "Salon First-Time Risk Reversal Rule",
    definition: "WHEN industry IS Salon AND audience IS First-Time Salon Explorers THEN REQUIRE Risk Reversal psychology AND 100% Satisfaction Guarantee offer.",
    purpose: "Destroy initial customer hesitation for new salon trials.",
    useCases: ["Salon acquisition campaigns"],
    antiPatterns: ["Selling expensive multi-month subscriptions to first-time trial clients"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.96,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.96 },
      { targetItemId: "offer_100_percent_satisfaction_guarantee", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_real_estate_homebuyer_clarity",
    type: "RULE",
    canonicalName: "Real Estate Homebuyer Clarity Rule",
    definition: "WHEN industry IS Real Estate AND audience IS First-Time Homebuyers THEN REQUIRE Risk Reversal AND Commute Time Calculator mechanism.",
    purpose: "Provide concrete infrastructure proof to first-time buyers.",
    useCases: ["Residential launch campaigns"],
    antiPatterns: ["Using vague lifestyle adjectives without location metrics"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_commute_time_calculator", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_office_lunch_express_delivery",
    type: "RULE",
    canonicalName: "Office Lunch Express Delivery Rule",
    definition: "WHEN situation IS Weekday Lunch AND audience IS Corporate IT Professionals THEN REQUIRE Effort Reduction AND Express Lunch Box mechanism.",
    purpose: "Ensure fast corporate ordering during short lunch windows.",
    useCases: ["IT park food campaigns"],
    antiPatterns: ["Slow dining menus requiring long prep times"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_express_lunch_box", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_bridal_makeover_social_proof",
    type: "RULE",
    canonicalName: "Bridal Makeover Social Proof Rule",
    definition: "WHEN situation IS Wedding Season AND audience IS Bride & Groom To Be THEN REQUIRE Social Proof AND Multi-Session Beauty Plan mechanism.",
    purpose: "Establish high trust for high-stakes wedding beauty routines.",
    useCases: ["Bridal package campaigns"],
    antiPatterns: ["Single standalone treatments without prep timeline"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_multi_session_beauty_plan", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_festive_diwali_gifting_priming",
    type: "RULE",
    canonicalName: "Festive Diwali Gifting Priming Rule",
    definition: "WHEN situation IS Festive Season THEN REQUIRE Anticipation AND Curated Festive Hamper mechanism.",
    purpose: "Leverage seasonal gifting emotions.",
    useCases: ["Diwali & New Year hamper campaigns"],
    antiPatterns: ["Non-festive standard corporate discounts"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_curated_festive_hamper", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_nri_investment_authority",
    type: "RULE",
    canonicalName: "NRI Investment Authority Rule",
    definition: "WHEN audience IS NRI Property Investors THEN REQUIRE Authority AND NRI Concierge Desk mechanism.",
    purpose: "Instill overseas investor confidence.",
    useCases: ["NRI luxury real estate campaigns"],
    antiPatterns: ["Requiring physical paperwork in India"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_authority", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "mechanism_rental_yield_guarantee", relationshipType: "REQUIRES", confidence: 0.91 }
    ]
  },
  {
    id: "rule_monsoon_weather_comfort_priming",
    type: "RULE",
    canonicalName: "Monsoon Weather Comfort Priming Rule",
    definition: "WHEN weather IS Monsoon Rainy THEN REQUIRE Anticipation AND Monsoon Comfort Combo mechanism.",
    purpose: "Align creative mood with rainy day cravings.",
    useCases: ["Monsoon food delivery campaigns"],
    antiPatterns: ["Promoting iced cold beverages during heavy rains"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_seasonal_peak", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_post_festive_health_reset",
    type: "RULE",
    canonicalName: "Post-Festive Health Reset Rule",
    definition: "WHEN situation IS Post-Festive THEN REQUIRE Anticipation AND Post-Festive Reset Bowl mechanism.",
    purpose: "Capture detox demand after heavy holidays.",
    useCases: ["Salad bar & juice cleanse campaigns"],
    antiPatterns: ["Heavy fried food promotions post-holidays"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_protein_express_pickup", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_luxury_chef_counter_status",
    type: "RULE",
    canonicalName: "Luxury Chef Counter Status Rule",
    definition: "WHEN objective IS High Margin Dining AND audience IS Luxury Lifestyle Seekers THEN REQUIRE Identity Signaling AND Solo Chef Counter Table mechanism.",
    purpose: "Drive high-ticket exclusive dining.",
    useCases: ["Gourmet restaurant chef table"],
    antiPatterns: ["Discounting chef counter seats"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_insider_access", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_salon_hygiene_proof",
    type: "RULE",
    canonicalName: "Salon Hygiene Proof Rule",
    definition: "WHEN audience IS Hygiene-Sensitive Clients THEN REQUIRE Risk Reduction AND Disposable Hygiene Seal mechanism.",
    purpose: "Guarantee sanitized single-use tools.",
    useCases: ["Nail lounge & skin clinic campaigns"],
    antiPatterns: ["Concealing sanitization procedures"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_transparent_process", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_work_cafe_reciprocity",
    type: "RULE",
    canonicalName: "Work Cafe Reciprocity Rule",
    definition: "WHEN audience IS Remote Freelancers THEN REQUIRE Reciprocity AND Work & Brew Day Pass mechanism.",
    purpose: "Monetize daytime cafe seating.",
    useCases: ["Co-working cafe marketing"],
    antiPatterns: ["Charging desk fees with zero coffee included"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_reciprocity", relationshipType: "REQUIRES", confidence: 0.91 },
      { targetItemId: "mechanism_effortless_ordering", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_pet_friendly_dining_patio",
    type: "RULE",
    canonicalName: "Pet-Friendly Dining Patio Rule",
    definition: "WHEN audience IS Pet Parents THEN REQUIRE Social Proof AND Paws & Brunch Experience mechanism.",
    purpose: "Attract weekend pet brunch lovers.",
    useCases: ["Pet cafe marketing"],
    antiPatterns: ["Banning pets from outdoor tables"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "REQUIRES", confidence: 0.9 },
      { targetItemId: "mechanism_neighborhood_favorite", relationshipType: "REQUIRES", confidence: 0.91 }
    ]
  },
  {
    id: "rule_interior_renovation_fixed_contract",
    type: "RULE",
    canonicalName: "Interior Renovation Fixed Contract Rule",
    definition: "WHEN audience IS Home Renovation Upgraders THEN REQUIRE Risk Reduction AND Fixed Price Timeline Contract mechanism.",
    purpose: "Overcome budget overrun fear in interior projects.",
    useCases: ["Interior design studio campaigns"],
    antiPatterns: ["Open ended non-guaranteed estimates"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_risk_reversal_guarantee", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_midnight_kitchen_instant_fulfillment",
    type: "RULE",
    canonicalName: "Midnight Kitchen Instant Fulfillment Rule",
    definition: "WHEN time IS Past Midnight AND audience IS Late-Night Shift Workers THEN REQUIRE Urgency AND Midnight Express Kitchen mechanism.",
    purpose: "Provide fast late night deliveries.",
    useCases: ["24/7 cloud kitchen delivery"],
    antiPatterns: ["Closed kitchens or cold food pre-packages"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_urgency", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_time_compression", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_hair_color_damage_prevention",
    type: "RULE",
    canonicalName: "Hair Color Damage Prevention Rule",
    definition: "WHEN service IS Hair Color THEN REQUIRE Risk Reduction AND Ammonia-Free Color Trial mechanism.",
    purpose: "Allay hair damage fears for coloring clients.",
    useCases: ["Balayage hair salon campaigns"],
    antiPatterns: ["Harsh chemical dye without strand testing"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_trial_before_commit", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_clean_label_organic_proof",
    type: "RULE",
    canonicalName: "Clean Label Organic Proof Rule",
    definition: "WHEN positioning IS Organic Clean THEN REQUIRE Authority AND Open Kitchen Ingredient Proof mechanism.",
    purpose: "Verify organic claim credibility.",
    useCases: ["Organic farm cafe campaigns"],
    antiPatterns: ["Vague 'natural' claims without sourcing proof"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_authority", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "mechanism_transparent_process", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_startup_office_flex_lease",
    type: "RULE",
    canonicalName: "Startup Office Flex Lease Rule",
    definition: "WHEN audience IS Startup Founders THEN REQUIRE Belonging AND Flex Lease Growth Guarantee mechanism.",
    purpose: "Prevent startups getting trapped in rigid long leases.",
    useCases: ["Co-working space marketing"],
    antiPatterns: ["Strict 10-year lock-in lease contracts"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_belonging", relationshipType: "REQUIRES", confidence: 0.9 },
      { targetItemId: "mechanism_smart_choice", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_emergency_repair_instant_dispatch",
    type: "RULE",
    canonicalName: "Emergency Repair Instant Dispatch Rule",
    definition: "WHEN service IS Emergency Maintenance THEN REQUIRE Urgency AND 60-Min Dispatch Guarantee mechanism.",
    purpose: "Guarantee rapid home technician arrival.",
    useCases: ["Plumbing emergency dispatch"],
    antiPatterns: ["Vague arrival time windows"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_urgency", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_time_compression", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_anniversary_dining_vip_reserve",
    type: "RULE",
    canonicalName: "Anniversary Dining VIP Reserve Rule",
    definition: "WHEN occasion IS Special Anniversary THEN REQUIRE Identity Signaling AND VIP Celebration Reserve mechanism.",
    purpose: "Guarantee flawless celebratory dining experiences.",
    useCases: ["Fine dining anniversary package"],
    antiPatterns: ["Standard noisy casual dining tables"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_vip_celebration_reserve", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_traveler_express_grooming",
    type: "RULE",
    canonicalName: "Traveler Express Grooming Rule",
    definition: "WHEN audience IS Frequent Business Travelers THEN REQUIRE Effort Reduction AND Express Traveler Grooming mechanism.",
    purpose: "Serve transit customers with fast 30-min touchups.",
    useCases: ["Airport salon campaigns"],
    antiPatterns: ["Requiring 2-hour treatment commitments"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.91 },
      { targetItemId: "mechanism_time_compression", relationshipType: "REQUIRES", confidence: 0.9 }
    ]
  },
  {
    id: "rule_spa_wellness_digital_detox",
    type: "RULE",
    canonicalName: "Spa Wellness Digital Detox Rule",
    definition: "WHEN audience IS Corporate IT Professionals AND service IS Spa THEN REQUIRE Anticipation AND Digital Detox Spa Package mechanism.",
    purpose: "Sell mental reset retreats to stressed tech workers.",
    useCases: ["Day spa retreat marketing"],
    antiPatterns: ["Fast discount voucher atmosphere"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.91 },
      { targetItemId: "mechanism_relief_from_hassle", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_school_admission_housing_guide",
    type: "RULE",
    canonicalName: "School Admission Housing Guide Rule",
    definition: "WHEN situation IS School Admission Season THEN REQUIRE Contrast AND School Cluster Housing Guide mechanism.",
    purpose: "Target relocating families near top schools.",
    useCases: ["Residential apartment sales"],
    antiPatterns: ["Ignoring educational institution proximity data"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_contrast", relationshipType: "REQUIRES", confidence: 0.9 },
      { targetItemId: "mechanism_guided_tour", relationshipType: "REQUIRES", confidence: 0.91 }
    ]
  },
  {
    id: "rule_post_workout_protein_pickup",
    type: "RULE",
    canonicalName: "Post-Workout Protein Pickup Rule",
    definition: "WHEN audience IS Fitness Health Enthusiasts THEN REQUIRE Urgency AND Protein Express Pickup mechanism.",
    purpose: "Supply post-gym fresh protein bowls fast.",
    useCases: ["Health cafe delivery"],
    antiPatterns: ["High-calorie junk food messaging"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_urgency", relationshipType: "REQUIRES", confidence: 0.9 },
      { targetItemId: "mechanism_protein_express_pickup", relationshipType: "REQUIRES", confidence: 0.9 }
    ]
  },
  {
    id: "rule_senior_housing_accessibility",
    type: "RULE",
    canonicalName: "Senior Housing Accessibility Rule",
    definition: "WHEN audience IS Senior Citizens THEN REQUIRE Effort Reduction AND Senior-Friendly Comfort Suite mechanism.",
    purpose: "Highlight ramp access and quiet spaces.",
    useCases: ["Retirement villa sales"],
    antiPatterns: ["Loud music and steep staircases"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.89 },
      { targetItemId: "mechanism_decision_relief", relationshipType: "REQUIRES", confidence: 0.89 }
    ]
  },
  {
    id: "rule_kids_birthday_all_inclusive",
    type: "RULE",
    canonicalName: "Kids Birthday All-Inclusive Rule",
    definition: "WHEN event IS Kids Birthday THEN REQUIRE Effort Reduction AND All-Inclusive Party Box mechanism.",
    purpose: "Remove party planning burden from parents.",
    useCases: ["Kids party cafe packages"],
    antiPatterns: ["Selling food only without decor coordination"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "mechanism_one_stop_solution", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_bogo_flash_delivery_window",
    type: "RULE",
    canonicalName: "BOGO Flash Delivery Window Rule",
    definition: "WHEN mechanism IS Buy-One-Get-One THEN REQUIRE Loss Aversion AND Flash Sale Voucher offer.",
    purpose: "Drive urgent high-volume food orders.",
    useCases: ["Pizza delivery flash sales"],
    antiPatterns: ["Continuous perpetual BOGO sales"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_loss_aversion", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "offer_buy_one_get_one_free", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_16hr_bridal_makeup_guarantee",
    type: "RULE",
    canonicalName: "16hr Bridal Makeup Guarantee Rule",
    definition: "WHEN service IS Bridal Makeup THEN REQUIRE Authority AND 16hr HD Airbrush Guarantee mechanism.",
    purpose: "Provide sweat-proof long wear assurance.",
    useCases: ["Bridal makeup studio campaigns"],
    antiPatterns: ["Standard non-longwear daily makeup"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_authority", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_risk_reversal_guarantee", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_fine_dining_valet_parking",
    type: "RULE",
    canonicalName: "Fine Dining Valet Parking Rule",
    definition: "WHEN segment IS Fine Dining THEN REQUIRE Identity Signaling AND Covered VIP Valet Service mechanism.",
    purpose: "Eliminate parking friction for luxury diners.",
    useCases: ["Fine dining restaurant launches"],
    antiPatterns: ["Unmanaged street parking"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "mechanism_insider_access", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_unlimited_buffet_anchoring",
    type: "RULE",
    canonicalName: "Unlimited Buffet Anchoring Rule",
    definition: "WHEN offer IS Unlimited Tasting THEN REQUIRE Anchoring AND Curated Family Set mechanism.",
    purpose: "Demonstrate massive culinary value.",
    useCases: ["Weekend buffet campaigns"],
    antiPatterns: ["Slow kitchen replenishment"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_anchoring", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_curated_family_set", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_hyderabadi_biryani_heritage_authenticity",
    type: "RULE",
    canonicalName: "Hyderabadi Biryani Heritage Authenticity Rule",
    definition: "WHEN city IS Hyderabad AND dish IS Biryani THEN REQUIRE Authority AND Slow-Cooked Dum Biryani mechanism.",
    purpose: "Respect local Hyderabadi culinary heritage.",
    useCases: ["Hyderabadi restaurant campaigns"],
    antiPatterns: ["Calling fast pressure cooked rice authentic dum biryani"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.96,
    relationships: [
      { targetItemId: "psychology_authority", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "story_behind_the_curtain_craftsmanship", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_bangalore_it_work_cafe_wifi",
    type: "RULE",
    canonicalName: "Bangalore IT Work Cafe Wi-Fi Rule",
    definition: "WHEN city IS Bangalore AND venue IS Work Cafe THEN REQUIRE Effort Reduction AND Work & Brew Day Pass mechanism.",
    purpose: "Address tech freelancer amenity requirements in Bangalore.",
    useCases: ["Bangalore cafe marketing"],
    antiPatterns: ["Spotty Wi-Fi with no power plugs"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_effortless_ordering", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_mumbai_monsoon_delivery_speed",
    type: "RULE",
    canonicalName: "Mumbai Monsoon Delivery Speed Rule",
    definition: "WHEN city IS Mumbai AND weather IS Monsoon THEN REQUIRE Anticipation AND Monsoon Comfort Combo mechanism.",
    purpose: "Provide hot comfort food during Mumbai downpours.",
    useCases: ["Mumbai cloud kitchen campaigns"],
    antiPatterns: ["Promoting ice cream during heavy rains"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "mechanism_seasonal_peak", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_delhi_wedding_gifting_luxury",
    type: "RULE",
    canonicalName: "Delhi Wedding Gifting Luxury Rule",
    definition: "WHEN city IS Delhi AND occasion IS Wedding Gifting THEN REQUIRE Identity Signaling AND Curated Festive Hamper mechanism.",
    purpose: "Match high status expectations in Delhi wedding gifting.",
    useCases: ["Delhi luxury hamper campaigns"],
    antiPatterns: ["Plain cheap plastic gift boxes"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_curated_festive_hamper", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_chennai_heritage_filter_coffee",
    type: "RULE",
    canonicalName: "Chennai Heritage Filter Coffee Rule",
    definition: "WHEN city IS Chennai AND product IS Coffee THEN REQUIRE Social Proof AND Heritage Roots story.",
    purpose: "Honor traditional South Indian filter coffee culture.",
    useCases: ["Chennai cafe campaigns"],
    antiPatterns: ["Ignoring traditional brass degree coffee roots"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_social_proof", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "story_local_heritage_roots", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_pune_student_pocket_combo",
    type: "RULE",
    canonicalName: "Pune Student Pocket Combo Rule",
    definition: "WHEN city IS Pune AND audience IS College Students THEN REQUIRE Anchoring AND Tiered Volume Discount offer.",
    purpose: "Serve student budget requirements in Pune campus areas.",
    useCases: ["Pune student cafe campaigns"],
    antiPatterns: ["High-end fine dining pricing"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_anchoring", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "offer_tiered_volume_discount", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_first_time_home_buyer_rera_proof",
    type: "RULE",
    canonicalName: "First-Time Home Buyer RERA Proof Rule",
    definition: "WHEN industry IS Real Estate AND stage IS Pre-Launch THEN REQUIRE Risk Reduction AND Clear Title Verification.",
    purpose: "Provide mandatory legal RERA trust proof upfront.",
    useCases: ["Real estate project pre-launch"],
    antiPatterns: ["Hiding RERA registration number"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.96,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.96 },
      { targetItemId: "story_the_stress_free_guarantee_walkthrough", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_restaurant_chef_table_exclusivity",
    type: "RULE",
    canonicalName: "Restaurant Chef Table Exclusivity Rule",
    definition: "WHEN mechanism IS Solo Chef Counter Table THEN REQUIRE Identity Signaling AND Warm Cinematic Visual.",
    purpose: "Maintain premium visual mood for private chef counters.",
    useCases: ["Gourmet restaurant ads"],
    antiPatterns: ["Bright flat fluorescent lighting"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "visual_warm_cinematic_lighting", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_gated_community_amenity_overview",
    type: "RULE",
    canonicalName: "Gated Community Amenity Overview Rule",
    definition: "WHEN asset IS Gated Community THEN REQUIRE Identity Signaling AND Aerial Drone Visual.",
    purpose: "Highlight expansive clubhouse, pool, and park acreage.",
    useCases: ["Real estate township marketing"],
    antiPatterns: ["Cropped tight photos hiding township scale"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "visual_aerial_drone_perspective", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_corporate_catering_bulk_discount",
    type: "RULE",
    canonicalName: "Corporate Catering Bulk Discount Rule",
    definition: "WHEN audience IS Corporate IT Professionals AND service IS Catering THEN REQUIRE Effort Reduction AND Tiered Volume Discount offer.",
    purpose: "Drive large order corporate catering bookings.",
    useCases: ["Corporate event catering"],
    antiPatterns: ["Inflexible single portion pricing"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "offer_tiered_volume_discount", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_organic_cafe_farm_transparency",
    type: "RULE",
    canonicalName: "Organic Cafe Farm Transparency Rule",
    definition: "WHEN positioning IS Farm To Table THEN REQUIRE Authority AND Sustainable Sourcing Story.",
    purpose: "Authenticate organic farm origins.",
    useCases: ["Organic cafe campaigns"],
    antiPatterns: ["Greenwashing without farm names"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_authority", relationshipType: "REQUIRES", confidence: 0.91 },
      { targetItemId: "story_sustainable_sourcing_journey", relationshipType: "REQUIRES", confidence: 0.91 }
    ]
  },
  {
    id: "rule_high_ticket_interior_staggered_pay",
    type: "RULE",
    canonicalName: "High Ticket Interior Staggered Pay Rule",
    definition: "WHEN ticketSize IS High AND industry IS Interior Design THEN REQUIRE Risk Reduction AND Staggered Payment Milestone Offer.",
    purpose: "Alleviate cash flow worry for complete home interior redesigns.",
    useCases: ["Luxury apartment interior design"],
    antiPatterns: ["Demanding 100% cash upfront"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "offer_staggered_payment_milestone", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_luxury_spa_digital_detox_quiet",
    type: "RULE",
    canonicalName: "Luxury Spa Digital Detox Quiet Rule",
    definition: "WHEN service IS Luxury Spa THEN REQUIRE Anticipation AND Relaxing Water Botanical Visual.",
    purpose: "Induce visual calm in spa promotional creative.",
    useCases: ["Day spa retreat campaigns"],
    antiPatterns: ["Fast motion frantic video clips"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.92 },
      { targetItemId: "visual_relaxing_water_botanical_element", relationshipType: "REQUIRES", confidence: 0.92 }
    ]
  },
  {
    id: "rule_bridal_airbrush_longwear_guarantee",
    type: "RULE",
    canonicalName: "Bridal Airbrush Longwear Guarantee Rule",
    definition: "WHEN service IS Bridal Airbrush THEN REQUIRE Risk Reduction AND 16hr HD Airbrush Guarantee mechanism.",
    purpose: "Guarantee sweat-proof makeup for long ceremonies.",
    useCases: ["Bridal beauty studio"],
    antiPatterns: ["Standard daily makeup products without longwear claims"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_risk_reduction", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "mechanism_risk_reversal_guarantee", relationshipType: "REQUIRES", confidence: 0.94 }
    ]
  },
  {
    id: "rule_emergency_plumbing_whatsapp_direct",
    type: "RULE",
    canonicalName: "Emergency Plumbing WhatsApp Direct Rule",
    definition: "WHEN service IS Emergency Maintenance THEN REQUIRE Urgency AND Order On WhatsApp CTA.",
    purpose: "Provide fastest one-click dispatch communication channel.",
    useCases: ["Emergency electrician and plumber ads"],
    antiPatterns: ["Slow email contact forms"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [
      { targetItemId: "psychology_urgency", relationshipType: "REQUIRES", confidence: 0.95 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "REQUIRES", confidence: 0.96 }
    ]
  },
  {
    id: "rule_co_working_flex_desk_pass",
    type: "RULE",
    canonicalName: "Co-Working Flex Desk Pass Rule",
    definition: "WHEN workspace IS Co-Working THEN REQUIRE Effort Reduction AND Work & Brew Day Pass mechanism.",
    purpose: "Offer flexible day passes for freelancers.",
    useCases: ["Co-working space promos"],
    antiPatterns: ["Mandatory 1-year desk lock-in contracts"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [
      { targetItemId: "psychology_effort_reduction", relationshipType: "REQUIRES", confidence: 0.91 },
      { targetItemId: "mechanism_effortless_ordering", relationshipType: "REQUIRES", confidence: 0.91 }
    ]
  },
  {
    id: "rule_late_night_kitchen_24hr_delivery",
    type: "RULE",
    canonicalName: "Late-Night Kitchen 24hr Delivery Rule",
    definition: "WHEN time IS Past Midnight THEN REQUIRE Urgency AND Midnight Express Kitchen mechanism.",
    purpose: "Capture midnight cravings.",
    useCases: ["24/7 cloud kitchen delivery"],
    antiPatterns: ["Closed kitchens or long delivery delays"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_urgency", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "mechanism_time_compression", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  },
  {
    id: "rule_festive_spin_the_wheel_gamification",
    type: "RULE",
    canonicalName: "Festive Spin-The-Wheel Gamification Rule",
    definition: "WHEN campaign IS Festive Week THEN REQUIRE Curiosity AND Festive Reward Offer.",
    purpose: "Gamify customer engagement during festival weeks.",
    useCases: ["Festive dining rewards"],
    antiPatterns: ["Rigged non-winning wheels"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [
      { targetItemId: "psychology_curiosity", relationshipType: "REQUIRES", confidence: 0.9 },
      { targetItemId: "offer_festive_spin_the_wheel_reward", relationshipType: "REQUIRES", confidence: 0.9 }
    ]
  },
  {
    id: "rule_monsoon_tea_comfort_urgency",
    type: "RULE",
    canonicalName: "Monsoon Tea Comfort Urgency Rule",
    definition: "WHEN weather IS Rain THEN REQUIRE Anticipation AND Instant WhatsApp Order CTA.",
    purpose: "Capture instant hot beverage delivery cravings during downpours.",
    useCases: ["Chai & pakora delivery"],
    antiPatterns: ["Promoting cold drinks in monsoon"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [
      { targetItemId: "psychology_anticipation", relationshipType: "REQUIRES", confidence: 0.94 },
      { targetItemId: "cta_order_on_whatsapp", relationshipType: "REQUIRES", confidence: 0.95 }
    ]
  },
  {
    id: "rule_luxury_penthouse_aerial_view",
    type: "RULE",
    canonicalName: "Luxury Penthouse Aerial View Rule",
    definition: "WHEN asset IS Luxury Penthouse THEN REQUIRE Identity Signaling AND Aerial Drone Visual.",
    purpose: "Showcase grandeur of luxury penthouse real estate.",
    useCases: ["Luxury property launch"],
    antiPatterns: ["Tight cropped low-light photos"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [
      { targetItemId: "psychology_identity_signaling", relationshipType: "REQUIRES", confidence: 0.93 },
      { targetItemId: "visual_aerial_drone_perspective", relationshipType: "REQUIRES", confidence: 0.93 }
    ]
  }
];

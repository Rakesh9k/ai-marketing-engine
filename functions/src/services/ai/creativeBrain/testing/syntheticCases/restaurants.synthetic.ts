/**
 * PHASE 10.39 — Synthetic Test Cases: Restaurant Vertical (5 Cases)
 */

import type { SyntheticCampaignCase } from "../creativeIntelligenceTest.types";

export const RESTAURANT_SYNTHETIC_CASES: SyntheticCampaignCase[] = [
  {
    id: "synth_rest_01_weekend_family",
    name: "Restaurant — Weekend Family Dinner",
    industry: "restaurant",
    businessContext: {
      businessName: "Spicy Route Biryani & Family Kitchen",
      location: "Kondapur",
      subVertical: "Casual Dining",
      positioning: "Authentic local family dining experience",
    },
    campaignIntent: {
      objective: "ACQUISITION",
      product: "₹799 Family Combo",
      offer: "₹799 All-Inclusive Feast",
      audience: "Young urban families with children",
      situation: "Weekend family meal decision friction",
      timing: "Weekend",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_choice_simplification", "psychology_cognitive_ease"], reason: "Eliminates family decision friction" },
      { category: "MECHANISM", expected: ["mechanism_curated_family_set", "mechanism_decision_relief"], reason: "Bundled curated set for family meal" },
      { category: "CTA", expected: ["cta_reserve_table_now", "cta_order_on_whatsapp"], reason: "Actionable dining action" },
    ],
    expectedMechanisms: ["mechanism_curated_family_set", "mechanism_decision_relief"],
    expectedRecipes: ["recipe_restaurant_weekend_family"],
    expectedPsychologies: ["psychology_choice_simplification", "psychology_cognitive_ease"],
  },
  {
    id: "synth_rest_02_office_lunch",
    name: "Restaurant — Corporate Office Lunch",
    industry: "restaurant",
    businessContext: {
      businessName: "Bawarchi Express Cloud Kitchen",
      location: "HITEC City",
      subVertical: "Cloud Kitchen",
      positioning: "Fast corporate desk lunch delivery",
    },
    campaignIntent: {
      objective: "ACQUISITION",
      product: "Express IT Park Thali Box",
      offer: "15-Min Fast Desk Delivery",
      audience: "Corporate IT office professionals",
      situation: "Weekday desk lunch time crunch",
      timing: "Weekday Afternoon",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_cognitive_ease", "psychology_effort_reduction"], reason: "Speed and zero effort during work hours" },
      { category: "MECHANISM", expected: ["mechanism_express_lunch_box", "mechanism_time_compression"], reason: "Pre-packed fast lunch box" },
    ],
    expectedMechanisms: ["mechanism_express_lunch_box", "mechanism_time_compression"],
    expectedRecipes: ["recipe_restaurant_lunch_convenience"],
    expectedPsychologies: ["psychology_cognitive_ease", "psychology_effort_reduction"],
  },
  {
    id: "synth_rest_03_rainy_snack",
    name: "Restaurant — Rainy Day Monsoon Craving",
    industry: "restaurant",
    businessContext: {
      businessName: "Chai & Samosa Lounge",
      location: "Gachibowli",
      subVertical: "Chai & Snacks Cafe",
      positioning: "Cozy neighborhood hot tea & snack joint",
    },
    campaignIntent: {
      objective: "PROMOTION",
      product: "Monsoon Chai & Pakora Combo",
      offer: "Buy 1 Get 1 Hot Chai",
      audience: "Rain-bound home & office workers",
      situation: "Monsoon rain food craving",
      timing: "Rainy Afternoon",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_priming_effect", "psychology_instant_gratification"], reason: "Weather sensory trigger" },
      { category: "MECHANISM", expected: ["mechanism_monsoon_comfort_combo"], reason: "Hot beverage monsoon comfort" },
    ],
    expectedMechanisms: ["mechanism_monsoon_comfort_combo"],
    expectedRecipes: ["recipe_restaurant_rainy_day"],
    expectedPsychologies: ["psychology_priming_effect"],
  },
  {
    id: "synth_rest_04_chef_signature",
    name: "Restaurant — Chef Signature New Dish Launch",
    industry: "restaurant",
    businessContext: {
      businessName: "Olive & Spice Gourmet Bistro",
      location: "Jubilee Hills",
      subVertical: "Fine Dining",
      positioning: "Artisanal chef-driven gourmet restaurant",
    },
    campaignIntent: {
      objective: "AWARENESS",
      product: "Chef Special Smoked Lamb Biryani",
      audience: "Discerning foodies and gourmet diners",
      situation: "Novelty seeking weekend dining",
      timing: "Weekend Night",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_curiosity", "psychology_authority"], reason: "Culinary craft curiosity" },
      { category: "MECHANISM", expected: ["mechanism_solo_chef_counter_table", "mechanism_open_kitchen_ingredient_proof"], reason: "Chef craft demonstration" },
    ],
    expectedMechanisms: ["mechanism_solo_chef_counter_table", "mechanism_open_kitchen_ingredient_proof"],
    expectedRecipes: ["recipe_restaurant_new_dish"],
    expectedPsychologies: ["psychology_curiosity", "psychology_authority"],
  },
  {
    id: "synth_rest_05_festive_gifting",
    name: "Restaurant — Festive Diwali Hamper",
    industry: "restaurant",
    businessContext: {
      businessName: "Grand Sweets & Royal Feast",
      location: "Abids",
      subVertical: "Sweet Shop & Bakery",
      positioning: "Traditional heritage festive sweets",
    },
    campaignIntent: {
      objective: "PROMOTION",
      product: "Royal Diwali Gourmet Sweet Hamper",
      offer: "10% Corporate Bulk Pre-Order Discount",
      audience: "Families and corporate gifting managers",
      situation: "Holiday festive reunion & client gifting",
      timing: "Festive Season",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_priming_effect", "psychology_belonging"], reason: "Generosity and festive reunion" },
      { category: "MECHANISM", expected: ["mechanism_curated_festive_hamper"], reason: "Curated gift hamper bundle" },
    ],
    expectedMechanisms: ["mechanism_curated_festive_hamper"],
    expectedRecipes: ["recipe_restaurant_festival"],
    expectedPsychologies: ["psychology_priming_effect", "psychology_belonging"],
  },
];

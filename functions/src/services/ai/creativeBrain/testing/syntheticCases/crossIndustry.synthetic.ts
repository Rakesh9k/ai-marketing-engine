/**
 * PHASE 10.39 — Synthetic Test Cases: Cross-Industry & Metamorphic Contrast Cases
 * Verifies strategic differentiation across identical price points, same businesses under different contexts, and no-offer scenarios.
 */

import type { SyntheticCampaignCase } from "../creativeIntelligenceTest.types";

export const CROSS_INDUSTRY_CONTRAST_CASES: SyntheticCampaignCase[] = [
  // 1. Same Offer Contrast Case: ₹799 Restaurant vs ₹799 Salon vs ₹799 Real Estate incentive
  {
    id: "synth_contrast_01_salon_799",
    name: "Cross-Industry Contrast — ₹799 Salon Express Facial",
    industry: "salon",
    businessContext: {
      businessName: "Glow Express Facial Lounge",
      location: "Kondapur",
      subVertical: "Beauty Lounge",
      positioning: "Quick lunchtime skincare lounge",
    },
    campaignIntent: {
      objective: "ACQUISITION",
      product: "₹799 Express Hydration Facial",
      offer: "₹799 Special Facial Pass",
      audience: "Working women seeking skin glow",
      situation: "Midweek skin fatigue",
      timing: "Midweek",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_risk_reversal", "psychology_transformation"], reason: "Skincare transformation not hunger relief" },
      { category: "MECHANISM", expected: ["mechanism_priority_slot_guarantee"], reason: "Priority slot guarantee" },
    ],
    expectedMechanisms: ["mechanism_priority_slot_guarantee"],
    expectedRecipes: ["recipe_salon_transformation"],
  },

  // 2. Same-Business Contrast Case: Restaurant Weekend Family vs Restaurant Weekday Office Lunch
  {
    id: "synth_contrast_02_same_restaurant_office",
    name: "Same-Business Contrast — Restaurant Weekday Office Lunch",
    industry: "restaurant",
    businessContext: {
      businessName: "Spicy Route Biryani & Family Kitchen", // Same restaurant as Case 01
      location: "Kondapur",
      subVertical: "Casual Dining",
      positioning: "Authentic local family dining experience",
    },
    campaignIntent: {
      objective: "ACQUISITION",
      product: "₹799 Family Combo", // Same offer as Case 01!
      offer: "Express Desk Delivery Box",
      audience: "IT office team lunch groups",
      situation: "Weekday office team meal delivery",
      timing: "Weekday Lunch",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_cognitive_ease", "psychology_effort_reduction"], reason: "Office convenience over weekend family gathering" },
      { category: "MECHANISM", expected: ["mechanism_express_lunch_box", "mechanism_all_inclusive_party_box"], reason: "Office group lunch box" },
    ],
    expectedMechanisms: ["mechanism_express_lunch_box", "mechanism_all_inclusive_party_box"],
    expectedRecipes: ["recipe_restaurant_lunch_convenience", "recipe_restaurant_office_lunch"],
  },

  // 3. No-Offer Scenario: Organic Farm-to-Table Restaurant (No discount, no urgency)
  {
    id: "synth_contrast_03_no_offer_restaurant",
    name: "No-Offer Scenario — Farm-To-Table Organic Kitchen",
    industry: "restaurant",
    businessContext: {
      businessName: "Earth & Plate Organic Bistro",
      location: "Jubilee Hills",
      subVertical: "Clean Eating Restaurant",
      positioning: "100% Organic, farm-to-table dining",
    },
    campaignIntent: {
      objective: "AWARENESS",
      product: "Open Kitchen Harvest Bowl",
      audience: "Health-conscious organic foodies",
      situation: "Seeking authentic chemical-free food",
      timing: "Weekend Lunch",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_authority", "psychology_trust"], reason: "Ingredient proof and clean sourcing authority" },
      { category: "MECHANISM", expected: ["mechanism_open_kitchen_ingredient_proof"], reason: "Open kitchen proof" },
    ],
    expectedMechanisms: ["mechanism_open_kitchen_ingredient_proof"],
    expectedRecipes: ["recipe_restaurant_local_pride"],
  },
];

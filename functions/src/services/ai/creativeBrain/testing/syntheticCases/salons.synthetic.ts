/**
 * PHASE 10.39 — Synthetic Test Cases: Salon Vertical (5 Cases)
 */

import type { SyntheticCampaignCase } from "../creativeIntelligenceTest.types";

export const SALON_SYNTHETIC_CASES: SyntheticCampaignCase[] = [
  {
    id: "synth_salon_01_wedding_makeover",
    name: "Salon — Pre-Wedding Event Glow Makeover",
    industry: "salon",
    businessContext: {
      businessName: "Aura Luxe Hair & Skin Lounge",
      location: "Gachibowli",
      subVertical: "Bridal Studio",
      positioning: "Premium neighborhood hair styling & skin sanctuary",
    },
    campaignIntent: {
      objective: "BOOKINGS",
      product: "₹1,499 Event Readiness Glow Package",
      offer: "₹1,499 Pre-Wedding Glow Makeover",
      audience: "Bridesmaids & event guests",
      situation: "Upcoming wedding event prep",
      timing: "Wedding Season",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_transformation", "psychology_urgency"], reason: "Event-readiness transformation" },
      { category: "MECHANISM", expected: ["mechanism_multi_session_beauty_plan", "mechanism_priority_slot_guarantee"], reason: "Multi-session skin prep plan" },
      { category: "CTA", expected: ["cta_book_free_consultation"], reason: "Book appointment action" },
    ],
    expectedMechanisms: ["mechanism_multi_session_beauty_plan", "mechanism_priority_slot_guarantee"],
    expectedRecipes: ["recipe_salon_before_event", "recipe_salon_transformation"],
    expectedPsychologies: ["psychology_transformation", "psychology_urgency"],
  },
  {
    id: "synth_salon_02_self_care_spa",
    name: "Salon — Weekend Stress Relief Self-Care Spa",
    industry: "salon",
    businessContext: {
      businessName: "Zenith Body & Mind Day Spa",
      location: "Koramangala",
      subVertical: "Day Spa",
      positioning: "Restorative urban wellness and massage spa",
    },
    campaignIntent: {
      objective: "ACQUISITION",
      product: "Digital Detox Aromatherapy Massage",
      offer: "Complimentary Head Massage with Spa",
      audience: "Overworked corporate managers",
      situation: "Mental burnout & weekend stress reset",
      timing: "Weekend",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_priming_effect", "psychology_cognitive_ease"], reason: "Tranquility and mental reset" },
      { category: "MECHANISM", expected: ["mechanism_digital_detox_spa_package"], reason: "Restorative detox package" },
    ],
    expectedMechanisms: ["mechanism_digital_detox_spa_package"],
    expectedRecipes: ["recipe_salon_self_care"],
    expectedPsychologies: ["psychology_priming_effect", "psychology_cognitive_ease"],
  },
  {
    id: "synth_salon_03_new_look_color",
    name: "Salon — Seasonal New Look Hair Color Refresh",
    industry: "salon",
    businessContext: {
      businessName: "Vogue Color Studio",
      location: "Indiranagar",
      subVertical: "Hair Styling Lounge",
      positioning: "Trendsetting hair balayage and color studio",
    },
    campaignIntent: {
      objective: "AWARENESS",
      product: "Ammonia-Free Balayage Makeover",
      audience: "Fashion-conscious young women",
      situation: "Style refresh for new job or birthday",
      timing: "New Season",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_identity_signaling", "psychology_curiosity"], reason: "Personal identity and style expression" },
      { category: "MECHANISM", expected: ["mechanism_ammonia_free_color_trial"], reason: "Zero-damage color trial" },
    ],
    expectedMechanisms: ["mechanism_ammonia_free_color_trial"],
    expectedRecipes: ["recipe_salon_new_look"],
    expectedPsychologies: ["psychology_identity_signaling"],
  },
  {
    id: "synth_salon_04_hair_damage_revival",
    name: "Salon — Corrective Hair Damage Repair",
    industry: "salon",
    businessContext: {
      businessName: "KeraFix Hair Clinic",
      location: "Bandra",
      subVertical: "Hair Lab",
      positioning: "Clinical corrective hair and scalp repair",
    },
    campaignIntent: {
      objective: "BOOKINGS",
      product: "Keraplex Hair Bond Restoration",
      offer: "Free Microscopic Scalp Analysis",
      audience: "Clients with bleached or heat-damaged hair",
      situation: "Distress over damaged hair texture",
      timing: "Anytime",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_transformation", "psychology_risk_reversal"], reason: "Damage repair reassurance" },
      { category: "MECHANISM", expected: ["mechanism_risk_reversal_guarantee", "mechanism_ammonia_free_color_trial"], reason: "Risk-free consultation" },
    ],
    expectedMechanisms: ["mechanism_risk_reversal_guarantee", "mechanism_ammonia_free_color_trial"],
    expectedRecipes: ["recipe_salon_confidence"],
    expectedPsychologies: ["psychology_transformation", "psychology_risk_reversal"],
  },
  {
    id: "synth_salon_05_express_grooming",
    name: "Salon — Urgent Slot Express Grooming",
    industry: "salon",
    businessContext: {
      businessName: "Express Grooming Barbershop",
      location: "Cyber City",
      subVertical: "Express Salon",
      positioning: "Fast 20-min executive grooming",
    },
    campaignIntent: {
      objective: "BOOKINGS",
      product: "20-Min Executive Haircut & Beard Touchup",
      offer: "Priority VIP Slot Pass",
      audience: "Busy executives before meetings",
      situation: "Last-minute grooming requirement",
      timing: "Weekday Lunch Hour",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_urgency", "psychology_effort_reduction"], reason: "Speed and instant availability" },
      { category: "MECHANISM", expected: ["mechanism_express_traveler_grooming", "mechanism_priority_slot_guarantee"], reason: "Express slot guarantee" },
    ],
    expectedMechanisms: ["mechanism_express_traveler_grooming", "mechanism_priority_slot_guarantee"],
    expectedRecipes: ["recipe_salon_appointment_urgency"],
    expectedPsychologies: ["psychology_urgency", "psychology_effort_reduction"],
  },
];

/**
 * PHASE 10.39 — Synthetic Test Cases: Real Estate Vertical (5 Cases)
 */

import type { SyntheticCampaignCase } from "../creativeIntelligenceTest.types";

export const REAL_ESTATE_SYNTHETIC_CASES: SyntheticCampaignCase[] = [
  {
    id: "synth_re_01_family_upgrade",
    name: "Real Estate — 3BHK Family Space Upgrade",
    industry: "real_estate",
    businessContext: {
      businessName: "Skyline Infra Developers",
      location: "Kokapet",
      subVertical: "Suburban Residential Apartments",
      positioning: "Transparent, RERA-approved family township developer",
    },
    campaignIntent: {
      objective: "ENQUIRIES",
      product: "Spacious 3BHK Gated Apartments",
      offer: "Zero Down Payment & Staggered EMI Milestone",
      audience: "Young urban families outgrowing 2BHKs",
      situation: "Need larger home near top international schools",
      timing: "School Admission Season",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_belonging", "psychology_progress_momentum"], reason: "Family space growth & future planning" },
      { category: "MECHANISM", expected: ["mechanism_school_cluster_housing_guide", "mechanism_fixed_price_timeline_contract"], reason: "School cluster guide & contract" },
      { category: "CTA", expected: ["cta_schedule_site_visit", "cta_download_brochure_floorplan"], reason: "Schedule visit / floorplan download" },
    ],
    expectedMechanisms: ["mechanism_school_cluster_housing_guide", "mechanism_fixed_price_timeline_contract"],
    expectedRecipes: ["recipe_real_estate_family_upgrade", "recipe_real_estate_first_home"],
    expectedPsychologies: ["psychology_belonging", "psychology_progress_momentum"],
  },
  {
    id: "synth_re_02_commute_convenience",
    name: "Real Estate — Tech Park Commute Convenience",
    industry: "real_estate",
    businessContext: {
      businessName: "CyberCity Smart Living",
      location: "Financial District",
      subVertical: "Tech Park Housing",
      positioning: "Walk-to-work modern tech apartments",
    },
    campaignIntent: {
      objective: "ENQUIRIES",
      product: "2BHK / 3BHK Smart Apartments",
      offer: "5-Min Metro Walk Connectivity",
      audience: "IT professionals tired of daily 1-hr commute",
      situation: "Traffic commute stress & lost family time",
      timing: "Immediate",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_effort_reduction", "psychology_cognitive_ease"], reason: "Time-saving & traffic stress relief" },
      { category: "MECHANISM", expected: ["mechanism_commute_time_calculator", "mechanism_time_compression"], reason: "Commute calculator mechanism" },
    ],
    expectedMechanisms: ["mechanism_commute_time_calculator", "mechanism_time_compression"],
    expectedRecipes: ["recipe_real_estate_commute"],
    expectedPsychologies: ["psychology_effort_reduction"],
  },
  {
    id: "synth_re_03_nri_investment",
    name: "Real Estate — NRI High-ROI Commercial & Plot Investment",
    industry: "real_estate",
    businessContext: {
      businessName: "Prestige Capital Commercial",
      location: "Outer Ring Road Corridor",
      subVertical: "Commercial Office Spaces",
      positioning: "High-yield commercial property investments for NRIs",
    },
    campaignIntent: {
      objective: "ENQUIRIES",
      product: "Pre-Leased Commercial Office Suites",
      offer: "Guaranteed Rental Yield Concierge",
      audience: "Non-resident Indian investors",
      situation: "Diversifying offshore wealth into real estate",
      timing: "Q4 Year-End",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_anchoring", "psychology_status_signaling"], reason: "Financial yield math & status" },
      { category: "MECHANISM", expected: ["mechanism_nri_concierge_desk", "mechanism_flex_lease_growth_guarantee"], reason: "NRI concierge desk" },
    ],
    expectedMechanisms: ["mechanism_nri_concierge_desk", "mechanism_flex_lease_growth_guarantee"],
    expectedRecipes: ["recipe_real_estate_investment", "recipe_real_estate_lifestyle"],
    expectedPsychologies: ["psychology_anchoring", "psychology_status_signaling"],
  },
  {
    id: "synth_re_04_first_home",
    name: "Real Estate — First-Time Homebuyer Rent vs Buy",
    industry: "real_estate",
    businessContext: {
      businessName: "Urban Nest Starter Homes",
      location: "Tellapur",
      subVertical: "Affordable Housing",
      positioning: "Accessible first home ownership for couples",
    },
    campaignIntent: {
      objective: "ENQUIRIES",
      product: "Compact 2BHK Starter Apartments",
      offer: "Pay Rent as EMI Option",
      audience: "Couples currently paying high monthly house rent",
      situation: "Frustration over paying rent money to landlord",
      timing: "New Year",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_risk_reversal", "psychology_cognitive_ease"], reason: "Financing relief & rent conversion" },
      { category: "MECHANISM", expected: ["mechanism_fixed_price_timeline_contract", "mechanism_decision_relief"], reason: "Fixed price contract" },
    ],
    expectedMechanisms: ["mechanism_fixed_price_timeline_contract", "mechanism_decision_relief"],
    expectedRecipes: ["recipe_real_estate_first_home"],
    expectedPsychologies: ["psychology_risk_reversal"],
  },
  {
    id: "synth_re_05_sample_flat_tour",
    name: "Real Estate — Sample Flat Walkthrough Site Visit",
    industry: "real_estate",
    businessContext: {
      businessName: "Elegance Heights",
      location: "Gachibowli",
      subVertical: "Under-Construction Residential Projects",
      positioning: "Premium architectural design gated community",
    },
    campaignIntent: {
      objective: "BOOKINGS",
      product: "Completed Sample Flat Walkthrough",
      offer: "Free Valet & Weekend Site Visit Tour",
      audience: "Buyers in final shortlisting decision phase",
      situation: "Evaluating actual carpet area & finish quality",
      timing: "Weekend",
    },
    expectedStrategicCharacteristics: [
      { category: "PSYCHOLOGY", expected: ["psychology_endowment_effect", "psychology_trust"], reason: "Tactile sample flat experience" },
      { category: "MECHANISM", expected: ["mechanism_transparent_process"], reason: "Transparent construction proof" },
    ],
    expectedMechanisms: ["mechanism_transparent_process"],
    expectedRecipes: ["recipe_real_estate_property_tour", "recipe_real_estate_trust"],
    expectedPsychologies: ["psychology_endowment_effect", "psychology_trust"],
  },
];

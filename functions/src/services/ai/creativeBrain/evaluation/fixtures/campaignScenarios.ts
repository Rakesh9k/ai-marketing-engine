/**
 * Phase 29 — Canonical Campaign Scenarios & Evaluation Cases
 * Mitra by BrainWise
 */

import type { CreativeEvaluationCase } from '../evaluation.types';
import { CANONICAL_TEST_BUSINESSES } from './testBusinesses';

export const CANONICAL_EVALUATION_CASES: CreativeEvaluationCase[] = [
  // ==========================================
  // 1. HYDERABAD BIRYANI RESTAURANT SCENARIOS
  // ==========================================
  {
    id: 'case_biryani_weekend_family',
    businessId: 'hyderabad_biryani',
    name: 'Hyderabad Biryani — Weekend Family Feast',
    description: 'Targeting families for Sunday lunch feast in restaurant dining room.',
    category: 'INDUSTRY_FIT',
    campaignIntent: {
      objective: 'drive_foot_traffic',
      targetAudience: 'families with kids',
      timeframe: 'weekend',
      coreProduct: 'family biryani pack'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.hyderabad_biryani.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'OCCASION', isRequired: true },
      { dimension: 'AUDIENCE', isRequired: true },
      { dimension: 'PRODUCT', isRequired: false }
    ],
    expectedOpportunity: {
      expectedAudienceSegment: 'families',
      expectedStrategicFocus: 'family_togetherness_and_relief',
      minSpecificityScore: 80
    },
    expectedMechanisms: ['mech_decision_relief_dining', 'mech_family_moment', 'mech_craving_trigger'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 85
    },
    version: '1.0.0'
  },
  {
    id: 'case_biryani_lunch_rush',
    businessId: 'hyderabad_biryani',
    name: 'Hyderabad Biryani — Weekday Office Lunch',
    description: 'Promoting express single-portion biryani for tech park lunch orders.',
    category: 'QUESTIONING',
    campaignIntent: {
      objective: 'increase_order_volume',
      targetAudience: 'office workers',
      timeframe: 'weekday_lunch',
      coreProduct: 'mini biryani combo'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.hyderabad_biryani.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'TIME', isRequired: true },
      { dimension: 'VALUE', isRequired: true }
    ],
    expectedMechanisms: ['mech_unexpected_value', 'mech_craving_trigger'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 80
    },
    version: '1.0.0'
  },
  {
    id: 'case_biryani_brand_story',
    businessId: 'hyderabad_biryani',
    name: 'Hyderabad Biryani — Authentic Dum Heritage',
    description: 'Brand building around 24-hr slow dum spice infusion process.',
    category: 'TRUTH_DISCIPLINE',
    campaignIntent: {
      objective: 'brand_awareness',
      coreProduct: 'mutton dum biryani'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.hyderabad_biryani.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'HERITAGE', isRequired: true }
    ],
    expectedMechanisms: ['mech_food_story', 'mech_local_ritual'],
    forbiddenQuestionPatterns: ['unsupported heritage claims before 1995'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 80
    },
    version: '1.0.0'
  },

  // ==========================================
  // 2. PREMIUM CAFÉ SCENARIOS
  // ==========================================
  {
    id: 'case_cafe_weekend_experience',
    businessId: 'premium_cafe',
    name: 'Premium Café — Weekend Aesthetic Experience',
    description: 'Positioning café as weekend relaxation & brunch haven.',
    category: 'CONCEPT_DIFFERENTIATION',
    campaignIntent: {
      objective: 'drive_foot_traffic',
      targetAudience: 'young professionals & couples',
      timeframe: 'weekend_brunch'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.premium_cafe.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'EXPERIENCE', isRequired: true },
      { dimension: 'AMBIENCE', isRequired: true }
    ],
    expectedMechanisms: ['mech_routine_ritual_beauty', 'mech_unexpected_contrast', 'mech_behind_the_scenes_craft'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 88,
      forbiddenPatterns: ['cheap 50% off banner']
    },
    version: '1.0.0'
  },
  {
    id: 'case_cafe_discount_tension',
    businessId: 'premium_cafe',
    name: 'Premium Café — Aggressive Discount Request (Strategic Tension)',
    description: 'User requests a 50% cheap discount flyer for a premium design café.',
    category: 'STRATEGIC_TENSION',
    campaignIntent: {
      objective: 'quick_sales',
      offer: '50% off all drinks'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.premium_cafe.snapshot,
    expectedQuestionDimensions: [],
    expectedStrategicTensions: [
      {
        conflictType: 'PREMIUM_POSITIONING_VS_DISCOUNT',
        expectedState: 'STRATEGIC_TENSION',
        expectedOptions: ['Lead with price', 'Protect premium experience', 'Show me both']
      }
    ],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 85
    },
    version: '1.0.0'
  },

  // ==========================================
  // 3. CLOUD KITCHEN SCENARIOS
  // ==========================================
  {
    id: 'case_cloud_late_night',
    businessId: 'cloud_kitchen',
    name: 'Cloud Kitchen — Late-Night Craving Rush',
    description: 'Targeting students and tech workers for midnight food delivery.',
    category: 'INDUSTRY_FIT',
    campaignIntent: {
      objective: 'increase_order_volume',
      targetAudience: 'late night coders & students',
      timeframe: 'midnight_to_3am',
      coreProduct: 'loaded burger combo'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.cloud_kitchen.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'TIME', isRequired: true },
      { dimension: 'CONVENIENCE', isRequired: true }
    ],
    expectedMechanisms: ['mech_craving_trigger', 'mech_shared_local_experience', 'mech_scarcity_with_integrity'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 82
    },
    version: '1.0.0'
  },

  // ==========================================
  // 4. PREMIUM WOMEN'S SALON SCENARIOS
  // ==========================================
  {
    id: 'case_salon_hair_makeover',
    businessId: 'premium_womens_salon',
    name: 'Premium Salon — Balayage Transformation Reveal',
    description: 'Showcasing high-impact before/after balayage color corrections.',
    category: 'CONCEPT_DIFFERENTIATION',
    campaignIntent: {
      objective: 'high_ticket_bookings',
      targetAudience: 'women 22-45',
      coreProduct: 'balayage color package'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.premium_womens_salon.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'TRANSFORMATION', isRequired: true },
      { dimension: 'EXPERTISE', isRequired: true }
    ],
    expectedMechanisms: ['mech_transformation_reveal', 'mech_expert_diagnosis', 'mech_confidence_shift'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 90
    },
    version: '1.0.0'
  },
  {
    id: 'case_salon_cheap_trim_tension',
    businessId: 'premium_womens_salon',
    name: 'Premium Salon — Cheap Haircut Request (Strategic Tension)',
    description: 'User asks for ₹99 express haircut poster for high-ticket luxury salon.',
    category: 'STRATEGIC_TENSION',
    campaignIntent: {
      objective: 'foot_traffic',
      offer: '₹99 express haircut'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.premium_womens_salon.snapshot,
    expectedStrategicTensions: [
      {
        conflictType: 'PREMIUM_SALON_VS_CHEAP_SERVICE',
        expectedState: 'STRATEGIC_TENSION'
      }
    ],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 80
    },
    version: '1.0.0'
  },

  // ==========================================
  // 5. BUDGET UNISEX SALON SCENARIOS
  // ==========================================
  {
    id: 'case_budget_everyday_cut',
    businessId: 'budget_unisex_salon',
    name: 'Budget Salon — Express Walk-In Haircut',
    description: 'Promoting fast, wallet-friendly everyday haircut convenience.',
    category: 'PROGRESSIVE_DISCLOSURE',
    campaignIntent: {
      objective: 'increase_foot_traffic',
      targetAudience: 'neighborhood residents',
      coreProduct: 'express haircut'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.budget_unisex_salon.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'CONVENIENCE', isRequired: true },
      { dimension: 'VALUE', isRequired: true }
    ],
    expectedMechanisms: ['mech_unexpected_value', 'mech_neighborhood_identity'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 80
    },
    version: '1.0.0'
  },

  // ==========================================
  // 6. MID-RANGE APARTMENTS SCENARIOS
  // ==========================================
  {
    id: 'case_re_first_time_buyer',
    businessId: 'midrange_apartments',
    name: 'Real Estate — First-Time Family Home',
    description: 'Positioning 2BHK/3BHK apartments for young family home seekers.',
    category: 'OPPORTUNITY_QUALITY',
    campaignIntent: {
      objective: 'generate_leads',
      targetAudience: 'first-time home buyers',
      coreProduct: '2BHK / 3BHK apartment'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.midrange_apartments.snapshot,
    expectedQuestionDimensions: [
      { dimension: 'LIFE_STAGE', isRequired: true },
      { dimension: 'LOCATION', isRequired: true }
    ],
    expectedMechanisms: ['mech_future_self_real_estate', 'mech_location_story', 'mech_decision_relief_real_estate'],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 88
    },
    version: '1.0.0'
  },
  {
    id: 'case_re_fake_roi_truth_conflict',
    businessId: 'midrange_apartments',
    name: 'Real Estate — Unsupported 25% Guaranteed ROI Claim (Truth Conflict)',
    description: 'User requests ad claiming "25% guaranteed annual rental returns".',
    category: 'TRUTH_DISCIPLINE',
    campaignIntent: {
      objective: 'investor_leads',
      unsupportedClaim: '25% guaranteed annual ROI'
    },
    initialBusinessBrain: CANONICAL_TEST_BUSINESSES.midrange_apartments.snapshot,
    adversarial: true,
    expectedStrategicTensions: [
      {
        conflictType: 'UNSUPPORTED_TRUTH_CLAIM',
        expectedState: 'STRATEGIC_TENSION'
      }
    ],
    expectedConcept: {
      minConceptsCount: 3,
      minDifferentiationScore: 85
    },
    version: '1.0.0'
  }
];

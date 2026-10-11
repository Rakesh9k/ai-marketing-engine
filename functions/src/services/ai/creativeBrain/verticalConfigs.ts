import type { CanonicalCreativeBrainState } from './stateMachineTypes';

export interface CreativeBrainVerticalConfig {
  readonly vertical: string;
  readonly priorityStates: readonly CanonicalCreativeBrainState[];
  readonly relevantEvidence: readonly string[];
  readonly territoryFamilies: readonly string[];
  readonly audienceDimensions: readonly string[];
  readonly customerInsightDimensions: readonly string[];
  readonly opportunityPatterns: readonly string[];
  readonly conceptDiversityDimensions: readonly string[];
}

export const CREATIVE_BRAIN_VERTICAL_CONFIGS: Record<string, CreativeBrainVerticalConfig> = {
  restaurant: {
    vertical: 'restaurant',
    priorityStates: [
      'INIT',
      'CAMPAIGN_INTENT',
      'CAMPAIGN_CONTEXT',
      'CUSTOMER_INSIGHT',
      'CREATIVE_TERRITORY',
      'OPPORTUNITY',
      'CONCEPT_GENERATION',
      'BLUEPRINT_LOCKED',
      'EXECUTION',
    ],
    relevantEvidence: ['product_name', 'offer_price', 'delivery_radius', 'localities', 'occasion'],
    territoryFamilies: ['craving', 'occasion', 'local_pride', 'value', 'convenience', 'celebration', 'discovery'],
    audienceDimensions: ['local_food_lovers', 'weekend_diners', 'families', 'office_lunch_groups'],
    customerInsightDimensions: ['craving_satisfaction', 'queue_avoidance', 'family_gathering', 'budget_value'],
    opportunityPatterns: ['weekend_feast', 'instant_delivery', 'special_dish_spotlight'],
    conceptDiversityDimensions: ['product_led', 'image_led', 'offer_led'],
  },
  // Any business that is not a restaurant, a salon or a property seller (yoga studio, pottery class, tutor...).
  // Deliberately neutral: it used to fall back to the restaurant's territories (craving, local pride, delivery radius).
  general: {
    vertical: 'general',
    priorityStates: [
      'INIT',
      'CAMPAIGN_INTENT',
      'CAMPAIGN_CONTEXT',
      'CUSTOMER_INSIGHT',
      'CREATIVE_TERRITORY',
      'OPPORTUNITY',
      'CONCEPT_GENERATION',
      'BLUEPRINT_LOCKED',
      'EXECUTION',
    ],
    relevantEvidence: ['product_name', 'offer_price', 'localities', 'occasion'],
    territoryFamilies: ['value', 'trust', 'convenience', 'experience', 'discovery', 'occasion'],
    audienceDimensions: ['local_customers', 'families', 'working_professionals', 'first_time_customers'],
    customerInsightDimensions: ['trust_in_provider', 'value_for_money', 'convenience', 'visible_results'],
    opportunityPatterns: ['new_customer_welcome', 'service_spotlight', 'limited_time_offer'],
    conceptDiversityDimensions: ['product_led', 'image_led', 'offer_led'],
  },
  salon: {
    vertical: 'salon',
    priorityStates: [
      'INIT',
      'CAMPAIGN_INTENT',
      'CAMPAIGN_CONTEXT',
      'CUSTOMER_INSIGHT',
      'CREATIVE_TERRITORY',
      'OPPORTUNITY',
      'CONCEPT_GENERATION',
      'USER_SELECTION',
      'BLUEPRINT_LOCKED',
      'EXECUTION',
    ],
    relevantEvidence: ['service_name', 'offer_price', 'booking_slots', 'treatment_benefits'],
    territoryFamilies: ['transformation', 'confidence', 'expertise', 'self_expression', 'experience', 'trust', 'occasion'],
    audienceDimensions: ['brides', 'event_attendees', 'working_professionals', 'self_care_customers'],
    customerInsightDimensions: ['visible_glow', 'pre_event_confidence', 'relaxing_pampering', 'organic_trust'],
    opportunityPatterns: ['bridal_glow_discount', 'weekend_pampering', 'limited_slot_booking'],
    conceptDiversityDimensions: ['transformation_story', 'serene_pampering', 'savings_spotlight'],
  },
  real_estate: {
    vertical: 'real_estate',
    priorityStates: [
      'INIT',
      'CAMPAIGN_INTENT',
      'CAMPAIGN_CONTEXT',
      'AUDIENCE_DISCOVERY',
      'OBJECTIVE_DISCOVERY',
      'CUSTOMER_INSIGHT',
      'CREATIVE_TERRITORY',
      'OPPORTUNITY',
      'CONCEPT_GENERATION',
      'USER_SELECTION',
      'CONCEPT_REFINEMENT',
      'BLUEPRINT_LOCKED',
      'EXECUTION',
    ],
    relevantEvidence: ['property_type', 'price_lakhs', 'locality', 'amenities', 'commute_time'],
    territoryFamilies: ['better_life', 'family_future', 'upgrade', 'location', 'investment_confidence', 'convenience', 'trust'],
    audienceDimensions: ['first_time_homebuyers', 'upgrading_families', 'it_professionals', 'investors'],
    customerInsightDimensions: ['lifestyle_upgrade', 'commute_reduction', 'gated_security', 'price_transparency'],
    opportunityPatterns: ['open_house_event', 'commute_advantage', 'launch_price_spotlight'],
    conceptDiversityDimensions: ['lifestyle_aspirational', 'location_roi', 'property_price_spotlight'],
  },
};

export function getCreativeBrainVerticalConfig(vertical?: string): CreativeBrainVerticalConfig {
  const normalized = (vertical || 'general').toLowerCase();
  return (
    CREATIVE_BRAIN_VERTICAL_CONFIGS[normalized] || {
      ...CREATIVE_BRAIN_VERTICAL_CONFIGS['general']!,
      vertical: normalized,
    }
  );
}

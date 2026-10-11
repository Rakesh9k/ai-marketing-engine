import type { IndustryCreativeKnowledge } from './industryKnowledge.types';

export const GENERIC_LOCAL_BUSINESS_KNOWLEDGE: IndustryCreativeKnowledge = {
  industryId: 'generic_local_business',
  displayName: 'Generic Local Business',
  description: 'Universal fallback creative knowledge model for general local businesses, services, and retail',

  subtypes: [
    {
      id: 'retail',
      displayName: 'Local Retail & Store',
      description: 'Physical retail stores, boutiques, and local merchant shops',
      keywords: ['store', 'shop', 'retail', 'boutique', 'merchant', 'mart'],
      relevantDimensions: ['value', 'trust', 'convenience', 'quality'],
      relevantObjectives: ['increase_orders', 'promote_offer', 'increase_footfall'],
      defaultTerritories: ['value', 'convenience', 'trust'],
    },
    {
      id: 'service_provider',
      displayName: 'Local Service Provider',
      description: 'Professional local service providers, home services, repairs, and consultations',
      keywords: ['service', 'repair', 'consultant', 'agency', 'provider', 'specialist'],
      relevantDimensions: ['trust', 'expertise', 'convenience', 'quality'],
      relevantObjectives: ['increase_orders', 'promote_service', 'build_trust'],
      defaultTerritories: ['trust', 'expertise', 'convenience'],
    },
  ],

  marketingObjectives: [
    {
      id: 'promote_offer',
      label: 'Promote Special Offer / Deal',
      description: 'Promote discounts, seasonal offers, or promotional deals',
      priorityScore: 90,
      primaryCreativeTerritories: ['value', 'convenience', 'trust'],
    },
    {
      id: 'increase_orders',
      label: 'Increase Customer Orders / Inquiries',
      description: 'Drive immediate customer calls, orders, or booking inquiries',
      priorityScore: 95,
      primaryCreativeTerritories: ['convenience', 'value', 'trust'],
    },
    {
      id: 'increase_footfall',
      label: 'Increase Local Store Footfall',
      description: 'Attract nearby neighborhood customers to visit in person',
      priorityScore: 85,
      primaryCreativeTerritories: ['convenience', 'trust', 'experience'],
    },
    {
      id: 'promote_service',
      label: 'Promote Primary Product / Service',
      description: 'Highlight features and benefits of key service offering',
      priorityScore: 80,
      primaryCreativeTerritories: ['expertise', 'trust', 'quality'],
    },
    {
      id: 'build_trust',
      label: 'Build Local Business Reputation',
      description: 'Establish community trust, verified quality, and local standing',
      priorityScore: 75,
      primaryCreativeTerritories: ['trust', 'quality'],
    },
  ],

  customerDimensions: [
    {
      id: 'value',
      label: 'Product / Service Value',
      description: 'Fair pricing, savings, discount value, and cost worthiness',
      decisionImpact: 90,
      creativeRelevance: 90,
      typicalUncertainty: 30,
    },
    {
      id: 'trust',
      label: 'Local Business Trust & Reliability',
      description: 'Verified business standing, local reviews, and dependable service',
      decisionImpact: 90,
      creativeRelevance: 90,
      typicalUncertainty: 30,
    },
    {
      id: 'convenience',
      label: 'Location & Ease of Service',
      description: 'Nearby location, fast response time, zero hassle WhatsApp contact',
      decisionImpact: 85,
      creativeRelevance: 85,
      typicalUncertainty: 30,
    },
    {
      id: 'quality',
      label: 'Quality & Craftsmanship',
      description: 'High product quality, durable materials, and expert service delivery',
      decisionImpact: 85,
      creativeRelevance: 85,
      typicalUncertainty: 40,
    },
    {
      id: 'occasion',
      label: 'Need or Buying Occasion',
      description: 'Timely need, seasonal buying occasion, or immediate requirement',
      decisionImpact: 80,
      creativeRelevance: 80,
      typicalUncertainty: 50,
    },
  ],

  creativeDimensions: [
    {
      id: 'value_proposition',
      label: 'Clear Value Proposition',
      decisionImpact: 90,
      creativeRelevance: 90,
      description: 'Highlight key customer benefit, savings, or special offer',
    },
    {
      id: 'brand_trust',
      label: 'Verified Local Reputation',
      decisionImpact: 85,
      creativeRelevance: 85,
      description: 'Emphasize verified local business service and customer satisfaction',
    },
  ],

  offerPatterns: [
    {
      id: 'percentage_discount',
      label: 'Percentage Discount (e.g. 20% OFF)',
      urgencyPotential: 85,
      valuePotential: 90,
      trustSensitivity: 30,
    },
    {
      id: 'flat_discount',
      label: 'Flat Price Savings',
      urgencyPotential: 80,
      valuePotential: 85,
      trustSensitivity: 25,
    },
    {
      id: 'special_deal',
      label: 'Limited Time Deal',
      urgencyPotential: 90,
      valuePotential: 85,
      trustSensitivity: 35,
    },
  ],

  creativeTerritories: [
    {
      id: 'value',
      label: 'Unbeatable Local Value',
      family: 'smart_savings',
      description: 'Highlight attractive pricing, great value, and savings',
      emotionalDriver: 'smart choice',
      strategicRole: 'Remove price barrier for budget-conscious local customers',
    },
    {
      id: 'trust',
      label: 'Verified & Trusted Local Service',
      family: 'safety_reassurance',
      description: 'Emphasize verified quality, customer reviews, and local reliability',
      emotionalDriver: 'peace of mind',
      strategicRole: 'Build trust with first-time neighborhood buyers',
    },
    {
      id: 'convenience',
      label: 'Effortless Doorstep Convenience',
      family: 'effortless_convenience',
      description: 'Highlight nearby location, quick service, and instant contact',
      emotionalDriver: 'effortless ease',
      strategicRole: 'Capture immediate local intent',
    },
    {
      id: 'quality',
      label: 'Premium Service Quality',
      family: 'craftsmanship',
      description: 'Focus on high product quality, skilled execution, and attention to detail',
      emotionalDriver: 'quality satisfaction',
      strategicRole: 'Position business above cheap low-quality alternatives',
    },
  ],

  audiencePatterns: [
    {
      id: 'local_residents',
      label: 'Local Neighborhood Residents',
      description: 'Nearby residents seeking trustworthy local goods and services',
      typicalNeed: 'Nearby convenience, fair pricing, verified service',
    },
    {
      id: 'general_customers',
      label: 'General Customers',
      description: 'Customers seeking specific products or services in the locality',
      typicalNeed: 'Reliable service, clear pricing, fast response',
    },
  ],

  occasionPatterns: [
    { id: 'immediate_need', label: 'Immediate Need / Requirement', urgencyLevel: 'high' },
    { id: 'weekend', label: 'Weekend Shopping', urgencyLevel: 'medium' },
  ],

  trustSignals: [
    {
      id: 'verified_business',
      label: 'Verified Local Business',
      sensitivity: 90,
      description: 'Verified neighborhood business with established local presence',
    },
    {
      id: 'customer_satisfaction',
      label: 'Satisfied Customer Reputation',
      sensitivity: 85,
      description: 'Proven customer satisfaction and positive word-of-mouth',
    },
  ],

  questionCandidates: [
    {
      id: 'q_generic_audience',
      dimensionKey: 'target_audience',
      category: 'audience',
      promptTemplate: 'Who are you most trying to reach with {{productName}}?',
      options: ['Local Neighborhood Residents', 'Working Professionals in the Area', 'Families', 'General Local Customers'],
      contextReason: 'Materially clarifies target audience segment for copy and offer framing.',
      decisionImpact: 85,
      creativeRelevance: 90,
      userEffort: 20,
      affectsStates: ['AUDIENCE_DISCOVERY', 'CUSTOMER_INSIGHT', 'CREATIVE_TERRITORY', 'CONCEPT_GENERATION'],
    },
    {
      id: 'q_generic_motivation',
      dimensionKey: 'customer_motivation',
      category: 'motivation',
      promptTemplate: 'What is the primary motivation for customers choosing {{productName}}?',
      options: ['Great Value / Affordable Price', 'Trust & Reliable Quality', 'Fast & Convenient Service', 'Special Promotional Offer'],
      contextReason: 'Materially influences strategic territory selection between value vs trust vs convenience.',
      decisionImpact: 80,
      creativeRelevance: 85,
      userEffort: 20,
      affectsStates: ['CUSTOMER_INSIGHT', 'CREATIVE_TERRITORY', 'OPPORTUNITY'],
    },
  ],

  formatAffinities: [
    { format: 'poster', affinityScore: 90 },
    { format: 'story', affinityScore: 90 },
    { format: 'carousel', affinityScore: 85 },
    { format: 'reel', affinityScore: 85 },
  ],

  metadata: {
    version: '1.0.0',
    status: 'ACTIVE',
    updatedAt: '2026-10-05T11:30:00Z',
  },
};

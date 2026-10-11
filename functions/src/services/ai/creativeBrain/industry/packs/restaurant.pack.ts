/**
 * PHASE 27 — Restaurant Creative Intelligence Pack (restaurant.v1)
 * Deep domain intelligence for restaurants, QSR, Biryani, Cafés, Cloud Kitchens, Family Dining, and Bakeries.
 */

import type { IndustryCreativePack } from '../industryPack.types';

export const RESTAURANT_PACK_V1: IndustryCreativePack = {
  id: 'pack_restaurant_v1',
  industry: 'RESTAURANT',
  version: '1.0.0',
  status: 'ACTIVE',
  description: 'Deep domain intelligence for restaurant dining, QSR, Biryani, Cafés, Cloud Kitchens, and Bakeries.',
  subIndustries: [
    { id: 'sub_qsr', name: 'QSR', description: 'Fast casual, speed, convenience, and high volume.', focusAttributes: ['Speed', 'Portability', 'Value'] },
    { id: 'sub_biryani', name: 'Biryani', description: 'Authentic regional rice dishes, generosity, and family feasts.', focusAttributes: ['Aroma', 'Authenticity', 'Generosity'] },
    { id: 'sub_cafe', name: 'Café', description: 'Coffee, light eats, third-place ambience, and work/social hangouts.', focusAttributes: ['Ambience', 'Craft Coffee', 'Relaxed Vibe'] },
    { id: 'sub_cloud_kitchen', name: 'Cloud Kitchen', description: 'Delivery-first food brands with focus on packaging and speed.', focusAttributes: ['Delivery Speed', 'Packaging', 'Visual Appeal'] },
    { id: 'sub_family_restaurant', name: 'Family Restaurant', description: 'Multi-cuisine dining for groups and decision relief.', focusAttributes: ['Togetherness', 'Variety', 'Dine-in Experience'] },
    { id: 'sub_bakery', name: 'Bakery & Dessert', description: 'Cakes, pastries, sweet treats, and celebration gifts.', focusAttributes: ['Visual Indulgence', 'Fresh Baking', 'Celebration'] },
  ],
  audienceSituations: [
    { id: 'sit_rest_1', name: 'Hungry After Work', context: 'Exhausted after long workday', triggerEvent: 'Evening commute', emotionalNeed: 'Instant relief & comfort' },
    { id: 'sit_rest_2', name: 'Weekend Family Decision', context: 'Family arguing over food options', triggerEvent: 'Friday/Saturday evening', emotionalNeed: 'Peaceful consensus & fun' },
    { id: 'sit_rest_3', name: 'Late Night Craving', context: 'Midnight snack desire', triggerEvent: 'Late night streaming/work', emotionalNeed: 'Guilty indulgence' },
    { id: 'sit_rest_4', name: 'Office Lunch Break', context: 'Limited 30-min lunch window', triggerEvent: 'Midday break', emotionalNeed: 'Fast, filling, reliable' },
  ],
  creativeMechanisms: [
    { id: 'mech_rest_1', globalMechanismId: 'DECISION_RELIEF', industryExpression: 'Eliminating family dinner debate with one crowd-pleasing combo.' },
    { id: 'mech_rest_2', globalMechanismId: 'SENSORY_REVEAL', industryExpression: 'Cinematic close-up of steaming biryani or melting cheese.' },
    { id: 'mech_rest_3', globalMechanismId: 'VALUE_REVEAL', industryExpression: 'Juxtaposing chef-crafted quality with a surprisingly accessible ₹299 price.' },
  ],
  conceptPatterns: [
    {
      id: 'cp_rest_weekend_decision',
      name: 'The Weekend Decision',
      situation: 'Family deciding where to eat after a long week.',
      tension: 'Everyone wants something different.',
      mechanism: 'DECISION_RELIEF',
      emotionalOutcome: 'Relief & Togetherness',
    },
    {
      id: 'cp_rest_craving_trigger',
      name: 'The Craving Trigger',
      situation: 'Customer commuting home unprepared for dinner.',
      tension: 'Too tired to cook.',
      mechanism: 'SENSORY_REVEAL',
      emotionalOutcome: 'Immediate appetite desire',
    },
  ],
  visualPrinciples: [
    { id: 'vis_rest_1', rule: 'Hero Food Visual Dominance', rationale: 'Food must take up at least 60% of canvas with vibrant warm lighting.' },
    { id: 'vis_rest_2', rule: 'Freshness & Texture Emphasis', rationale: 'Show steam, garnishes, or crispy textures to trigger appetite.' },
  ],
  copyPrinciples: [
    {
      id: 'copy_rest_1',
      preferredPatterns: ['Finally, a dinner everyone agrees on.', 'Hot, fresh, and at your door in 25 mins.'],
      avoidPatterns: ['Best food in town', 'Delicious food for everyone', 'Unforgettable taste'],
    },
  ],
  proofTypes: [
    { id: 'proof_rest_reviews', name: 'Customer Review Rating', description: '4.8★ rated by 2,000+ local foodies.' },
    { id: 'proof_rest_signature', name: 'Signature Dish History', description: 'Serving our original recipe since 2012.' },
  ],
  offerPatterns: [
    { id: 'off_rest_combo', name: 'Family Feast Combo', strategicRole: 'Provides complete dinner solution at fixed value price.' },
  ],
  ctaPatterns: [
    { id: 'cta_rest_order', text: 'Order Now for Fast Delivery', journeyStage: 'Immediate Conversion' },
    { id: 'cta_rest_reserve', text: 'Reserve Your Family Table', journeyStage: 'Consideration / Booking' },
  ],
  antiPatterns: [
    { id: 'anti_rest_stock', pattern: 'Generic Stock Food Photos', warningReason: 'Lacks local authenticity and builds distrust.' },
    { id: 'anti_rest_unsubstantiated', pattern: 'Unverified "Best Biryani" Claims', warningReason: 'Fails Truth Check and damages brand credibility.' },
  ],
  strategicTensions: [
    {
      id: 'ten_rest_premium_price',
      businessPositioning: 'Premium Fine Dining',
      requestedDirection: 'Cheap Discount Poster',
      tradeOffExplanation: 'Leading heavily with discount price may dilute premium brand positioning.',
    },
  ],
  truthRules: [
    { id: 'truth_rest_best', claimType: 'Best in City Claim', requiredEvidence: 'Official Award or Verified Newspaper Review link.' },
  ],
  creativeBankMappings: [
    {
      industryPackId: 'pack_restaurant_v1',
      bankEntryId: 'bank_decision_relief',
      relevanceScore: 0.95,
      applicableSubIndustries: ['sub_family_restaurant', 'sub_qsr'],
      applicableAudienceSituations: ['sit_rest_2'],
      compatibleMechanisms: ['mech_rest_1'],
    },
  ],
};

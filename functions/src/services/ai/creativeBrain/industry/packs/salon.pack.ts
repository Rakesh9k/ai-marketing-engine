/**
 * PHASE 27 — Salon & Beauty Creative Intelligence Pack (salon.v1)
 * Deep domain intelligence for Salons, Beauty Clinics, Unisex Parlors, Bridal Makeup, and Grooming.
 */

import type { IndustryCreativePack } from '../industryPack.types';

export const SALON_PACK_V1: IndustryCreativePack = {
  id: 'pack_salon_v1',
  industry: 'SALON',
  version: '1.0.0',
  status: 'ACTIVE',
  description: 'Deep domain intelligence for Salons, Beauty Clinics, Bridal Studios, and Grooming.',
  subIndustries: [
    { id: 'sub_salon_unisex', name: 'Unisex Salon', description: 'Full-service hair and beauty for men and women.', focusAttributes: ['Versatility', 'Convenience', 'Family Grooming'] },
    { id: 'sub_salon_womens', name: 'Womens Salon', description: 'Hair styling, skin care, spa, and beauty treatments.', focusAttributes: ['Pampering', 'Skin Glow', 'Hair Repair'] },
    { id: 'sub_salon_mens', name: 'Mens Barber & Grooming', description: 'Beard sculpting, hair styling, and men spa.', focusAttributes: ['Precision Shave', 'Beard Care', 'Sharp Look'] },
    { id: 'sub_salon_bridal', name: 'Bridal & Event Studio', description: 'High-end bridal makeup, saree draping, and event prep.', focusAttributes: ['Flawless Finish', 'HD Makeup', 'Event Glow'] },
  ],
  audienceSituations: [
    { id: 'sit_salon_1', name: 'Important Event Approaching', context: 'Wedding, party, or interview in 3 days', triggerEvent: 'Upcoming event date', emotionalNeed: 'Confidence & looking best' },
    { id: 'sit_salon_2', name: 'Damaged Hair Dilemma', context: 'Frizzy, unmanageable, or dry hair', triggerEvent: 'Frustration in morning routine', emotionalNeed: 'Expert repair & relief' },
    { id: 'sit_salon_3', name: 'Routine Self-care Maintenance', context: 'Monthly haircut, manicure, or facial', triggerEvent: '30 days since last visit', emotionalNeed: 'Rejuvenation' },
  ],
  creativeMechanisms: [
    { id: 'mech_salon_1', globalMechanismId: 'TRANSFORMATION_REVEAL', industryExpression: 'Showing real authentic client before and after glow.' },
    { id: 'mech_salon_2', globalMechanismId: 'EXPERT_DIAGNOSIS', industryExpression: 'Senior stylist analyzing hair structure to recommend custom care.' },
  ],
  conceptPatterns: [
    {
      id: 'cp_salon_transformation',
      name: 'The Confidence Transformation',
      situation: 'Customer frustrated with unmanageable hair.',
      tension: 'Afraid of trying new salons after bad past experience.',
      mechanism: 'TRANSFORMATION_REVEAL',
      emotionalOutcome: 'Radiant Self-Confidence',
    },
  ],
  visualPrinciples: [
    { id: 'vis_salon_1', rule: 'Authentic Human Faces & Hair Detail', rationale: 'Real hair texture and skin glow build 10x more trust than stock models.' },
    { id: 'vis_salon_2', rule: 'Avoid Over-retouched Plastic Skin', rationale: 'Fake filters trigger customer skepticism and lower booking rates.' },
  ],
  copyPrinciples: [
    {
      id: 'copy_salon_1',
      preferredPatterns: ['Say goodbye to morning frizz.', 'Expert hair repair tailored to your hair type.'],
      avoidPatterns: ['Look beautiful', 'Pamper yourself', 'World class salon'],
    },
  ],
  proofTypes: [
    { id: 'proof_salon_before_after', name: 'Authentic Before/After Photos', description: 'Real unedited client hair/skin results.' },
    { id: 'proof_salon_stylist', name: 'Certified Stylist Credentials', description: 'L\'Oréal & Schwarzkopf Certified Master Stylists.' },
  ],
  offerPatterns: [
    { id: 'off_salon_glow_pkg', name: 'Head-to-Toe Glow Package', strategicRole: 'Bundles haircut, facial, and spa at attractive rate.' },
  ],
  ctaPatterns: [
    { id: 'cta_salon_book', text: 'Book Your Appointment Now', journeyStage: 'Immediate Conversion' },
    { id: 'cta_salon_consult', text: 'Consult a Master Stylist', journeyStage: 'Consideration' },
  ],
  antiPatterns: [
    { id: 'anti_salon_ai_faces', pattern: 'AI-generated fake faces presented as real clients', warningReason: 'Destroys trust when real results don\'t match.' },
  ],
  strategicTensions: [
    {
      id: 'ten_salon_luxury_discount',
      businessPositioning: 'Luxury Boutique Salon',
      requestedDirection: '50% OFF Poster',
      tradeOffExplanation: 'Leading heavily with 50% OFF discount may undermine luxury prestige positioning.',
    },
  ],
  truthRules: [
    { id: 'truth_salon_photo', claimType: 'Client Transformation Photo', requiredEvidence: 'Must be authentic photo of client taken in salon.' },
  ],
  creativeBankMappings: [
    {
      industryPackId: 'pack_salon_v1',
      bankEntryId: 'bank_transformation',
      relevanceScore: 0.98,
      applicableSubIndustries: ['sub_salon_womens', 'sub_salon_bridal'],
      applicableAudienceSituations: ['sit_salon_2'],
      compatibleMechanisms: ['mech_salon_1'],
    },
  ],
};

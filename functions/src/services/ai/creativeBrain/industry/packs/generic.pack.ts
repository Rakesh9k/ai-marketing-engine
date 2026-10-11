/**
 * PHASE 27 — Generic Local Business Fallback Pack (generic.v1)
 * Fallback intelligence pack for unmapped local business categories.
 */

import type { IndustryCreativePack } from '../industryPack.types';

export const GENERIC_LOCAL_PACK_V1: IndustryCreativePack = {
  id: 'pack_generic_local_v1',
  industry: 'GENERIC_LOCAL',
  version: '1.0.0',
  status: 'ACTIVE',
  description: 'Generic local business fallback pack for unmapped service and retail categories.',
  subIndustries: [
    { id: 'sub_generic_service', name: 'Local Service', description: 'General home, personal, or repair services.', focusAttributes: ['Reliability', 'Convenience', 'Trust'] },
  ],
  audienceSituations: [
    { id: 'sit_gen_1', name: 'Immediate Need', context: 'Customer needs local service today', triggerEvent: 'Breakdown or immediate requirement', emotionalNeed: 'Fast solution' },
  ],
  creativeMechanisms: [
    { id: 'mech_gen_1', globalMechanismId: 'TRUST_BUILDER', industryExpression: 'Showing local customer reviews and years in service.' },
  ],
  conceptPatterns: [
    {
      id: 'cp_gen_local_trust',
      name: 'The Local Solution',
      situation: 'Customer looking for reliable local help.',
      tension: 'Worrying about quality.',
      mechanism: 'TRUST_BUILDER',
      emotionalOutcome: 'Reassurance',
    },
  ],
  visualPrinciples: [
    { id: 'vis_gen_1', rule: 'Clear Product / Service Focus', rationale: 'Show what the business does clearly.' },
  ],
  copyPrinciples: [
    {
      id: 'copy_gen_1',
      preferredPatterns: ['Your trusted local neighborhood partner.'],
      avoidPatterns: ['#1 in the world'],
    },
  ],
  proofTypes: [
    { id: 'proof_gen_reviews', name: 'Customer Ratings', description: 'Local star rating.' },
  ],
  offerPatterns: [
    { id: 'off_gen_welcome', name: 'First-time Customer Offer', strategicRole: 'Lowering trial barrier.' },
  ],
  ctaPatterns: [
    { id: 'cta_gen_contact', text: 'Call or Visit Today', journeyStage: 'Immediate Conversion' },
  ],
  antiPatterns: [
    { id: 'anti_gen_unsubstantiated', pattern: 'Unverified superlative claims', warningReason: 'Fails Truth Check.' },
  ],
  strategicTensions: [],
  truthRules: [],
  creativeBankMappings: [],
};

/**
 * PHASE 27 — Real Estate Creative Intelligence Pack (realEstate.v1)
 * Deep domain intelligence for Residential Apartments, Villas, Plotted Developments, and Commercial Spaces.
 */

import type { IndustryCreativePack } from '../industryPack.types';

export const REAL_ESTATE_PACK_V1: IndustryCreativePack = {
  id: 'pack_real_estate_v1',
  industry: 'REAL_ESTATE',
  version: '1.0.0',
  status: 'ACTIVE',
  description: 'Deep domain intelligence for Residential, Villas, Plotted Land, and Commercial Property.',
  subIndustries: [
    { id: 'sub_re_apartments', name: 'Residential Apartments', description: 'Gated community apartments, 2 & 3 BHK homes.', focusAttributes: ['Amenities', 'Security', 'Connectivity'] },
    { id: 'sub_re_villas', name: 'Luxury Villas', description: 'Independent villas, private gardens, and high-end living.', focusAttributes: ['Exclusivity', 'Private Space', 'Architecture'] },
    { id: 'sub_re_plotted', name: 'Plotted Developments', description: 'HMDA/DTCP approved plots for investment and custom building.', focusAttributes: ['Land Value Growth', 'Clear Title', 'Location'] },
    { id: 'sub_re_commercial', name: 'Commercial Spaces', description: 'Office spaces, retail shops, and high-yield commercial investments.', focusAttributes: ['Rental Yield', 'Footfall', 'ROI'] },
  ],
  audienceSituations: [
    { id: 'sit_re_1', name: 'Growing Family Needing Space', context: 'Current 2BHK feels cramped with kids', triggerEvent: 'Second child born', emotionalNeed: 'Space, safety & future security' },
    { id: 'sit_re_2', name: 'First-time Home Buyer', context: 'Tired of paying monthly rent', triggerEvent: 'Rent escalation notice', emotionalNeed: 'Pride of ownership & stability' },
    { id: 'sit_re_3', name: 'Strategic Investor', context: 'Looking for capital appreciation & rental yield', triggerEvent: 'New IT corridor announcement', emotionalNeed: 'High ROI & low risk' },
  ],
  creativeMechanisms: [
    { id: 'mech_re_1', globalMechanismId: 'LIFESTYLE_PROJECTION', industryExpression: 'Visualizing children playing in 5-acre clubhouse parks.' },
    { id: 'mech_re_2', globalMechanismId: 'LOCATION_STORY', industryExpression: 'Highlighting 10-minute commute to major IT hubs.' },
  ],
  conceptPatterns: [
    {
      id: 'cp_re_family_upgrade',
      name: 'The Space Upgrade',
      situation: 'Family living in cramped rented flat.',
      tension: 'Worrying if home purchase is financially wise.',
      mechanism: 'LIFESTYLE_PROJECTION',
      emotionalOutcome: 'Pride of Family Ownership',
    },
  ],
  visualPrinciples: [
    { id: 'vis_re_1', rule: 'Architecture & Clubhouse Dominance', rationale: 'Home buyers want to see actual building design, amenities, and green open space.' },
    { id: 'vis_re_2', rule: 'Clear RERA & Possession Display', rationale: 'Legal compliance builds essential trust for high-value decisions.' },
  ],
  copyPrinciples: [
    {
      id: 'copy_re_1',
      preferredPatterns: ['10 mins to Financial District.', 'Spacious 3BHK homes with 75% open green area.'],
      avoidPatterns: ['Dream home', 'Guaranteed returns', 'Once in a lifetime offer'],
    },
  ],
  proofTypes: [
    { id: 'proof_re_rera', name: 'RERA Registration Number', description: 'Government RERA verified project.' },
    { id: 'proof_re_construction', name: 'Construction Milestone Photos', description: 'Actual construction progress update.' },
  ],
  offerPatterns: [
    { id: 'off_re_modular_kitchen', name: 'Modular Kitchen Included', strategicRole: 'Eliminates post-possession interior hassle.' },
  ],
  ctaPatterns: [
    { id: 'cta_re_site_visit', text: 'Schedule a Private Site Visit', journeyStage: 'Consideration & Discovery' },
    { id: 'cta_re_floor_plan', text: 'Download Floor Plan & Price Sheet', journeyStage: 'Lead Capture' },
  ],
  antiPatterns: [
    { id: 'anti_re_guaranteed_returns', pattern: 'Promising "Guaranteed 200% ROI"', warningReason: 'Violates legal advertising rules and triggers buyer distrust.' },
  ],
  strategicTensions: [
    {
      id: 'ten_re_luxury_cheap',
      businessPositioning: 'Ultra-Luxury Gated Villas',
      requestedDirection: 'Cheapest Property Ad',
      tradeOffExplanation: 'Leading with "cheapest price" damages luxury exclusivity perception.',
    },
  ],
  truthRules: [
    { id: 'truth_re_rera', claimType: 'Property Advertising', requiredEvidence: 'Valid RERA Registration ID.' },
  ],
  creativeBankMappings: [
    {
      industryPackId: 'pack_real_estate_v1',
      bankEntryId: 'bank_lifestyle',
      relevanceScore: 0.96,
      applicableSubIndustries: ['sub_re_apartments', 'sub_re_villas'],
      applicableAudienceSituations: ['sit_re_1'],
      compatibleMechanisms: ['mech_re_1'],
    },
  ],
};

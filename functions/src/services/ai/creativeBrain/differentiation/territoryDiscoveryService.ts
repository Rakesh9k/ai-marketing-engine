/**
 * PHASE 14 — Territory Discovery Service
 * Identifies unrepresented or missing strategic creative territories for a campaign.
 * Synthesizes new distinct concepts when candidate concepts collide or lack strategic variety.
 */

import type { CreativeConcept, ConceptSynthesisInput } from '../synthesis/synthesis.types';

export class TerritoryDiscoveryService {
  /**
   * Evaluates available strategic territories and synthesizes alternative concepts
   * if current concept candidates suffer from territory collision.
   */
  public static discoverAlternativeTerritories(
    existingConcepts: CreativeConcept[],
    input: ConceptSynthesisInput
  ): CreativeConcept[] {
    const existingTerritories = new Set(
      existingConcepts.map((c) => c.emotionalResponse.primary.toLowerCase())
    );

    const bizName = input.businessBrain.name || 'Our Business';
    const subVertical = input.businessBrain.subVertical || input.businessBrain.industry || 'local_business';
    const audience = input.campaignIntent.targetAudience || 'Local customers';
    const offerTitle = input.campaignIntent.offerDetails?.offerTitle || 'Special Offer';

    const alternatives: CreativeConcept[] = [];

    // Check Territory A: LOCAL IDENTITY / BELONGING (if not present)
    if (!existingTerritories.has('belonging') && !existingTerritories.has('local identity')) {
      const city = (input.businessBrain as any).location || (input.businessBrain as any).city || 'Local';
      alternatives.push({
        id: `concept_alt_${input.campaignId}_belonging`,
        name: `${city} Weekend Ritual`,
        oneLineIdea: `Position ${bizName} as an authentic local ${subVertical} ritual that brings the neighborhood together.`,
        humanInsight: `${audience} feel pride and belonging in authentic local experiences that represent their community.`,
        whyThisBusiness: `${bizName} is a rooted local staple known for authentic community service.`,
        whyThisAudience: `${audience} value experiences that feel genuinely local rather than commercial.`,
        emotionalResponse: {
          primary: 'Belonging',
          secondary: 'Pride',
        },
        hook: `There is a reason locals in ${city} make this their weekly tradition.`,
        creativeMechanism: {
          id: 'mechanism_local_belonging',
          name: 'Local Identity Framing',
          explanation: 'Frames product consumption as participating in a proud local community ritual.',
        },
        visualDirection: `Authentic editorial imagery showcasing local guests and staff in a warm, welcoming environment.`,
        storyDirection: 'Scene 1: Local atmosphere → Scene 2: Community arrival → Scene 3: Signature dish/service → Scene 4: Neighborhood call.',
        offerIntegration: `${offerTitle} serves as the welcoming invitation to join the local ritual.`,
        cta: `Experience our local tradition at ${bizName}.`,
        recommendedFormat: {
          primary: 'Carousel / Editorial Post',
          alternatives: ['Short Reel'],
        },
        recommendedPlatform: {
          primary: 'Instagram',
          secondary: ['Facebook', 'Google Business'],
        },
        requiredAssets: {
          required: ['Local business photo', 'Offer details'],
          recommended: ['Neighborhood landmark photo'],
          optional: ['Customer testimonial'],
        },
        whyMitraRecommendsIt: 'Unlocks a high-loyalty local belonging territory distinct from price or convenience.',
        score: { total: 85, strategicRelevance: 17, audienceRelevance: 14, businessFit: 14, humanInsight: 13, creativeDistinctiveness: 14, emotionalStrength: 8, executionFeasibility: 3, offerIntegration: 2 },
        evidence: {
          businessBrain: [`Business: ${bizName}`],
          creativeBrain: [`Audience: ${audience}`],
          creativeOpportunity: ['Local community connection'],
          creativeBank: ['psychology_social_proof'],
        },
        creativeBankReferences: ['psychology_social_proof'],
        status: 'recommended',
      });
    }

    // Check Territory B: UNEXPECTED VALUE / SURPRISE (if not present)
    if (!existingTerritories.has('surprise') && !existingTerritories.has('unexpected value')) {
      alternatives.push({
        id: `concept_alt_${input.campaignId}_surprise`,
        name: 'Unexpected Value Shock',
        oneLineIdea: `Challenge customer assumptions about ${subVertical} pricing by revealing ${bizName}'s premium package.`,
        humanInsight: `${audience} assume premium ${subVertical} quality always comes with an exorbitant price tag.`,
        whyThisBusiness: `${bizName} delivers high-tier quality while maintaining transparent, accessible pricing.`,
        whyThisAudience: `${audience} love discovering high-value deals they can boast about to friends.`,
        emotionalResponse: {
          primary: 'Surprise',
          secondary: 'Excitement',
        },
        hook: `You won't believe what is included in this ${subVertical} package.`,
        creativeMechanism: {
          id: 'mechanism_price_contrast',
          name: 'Unexpected Value Contrast',
          explanation: 'Contrasts perceived high luxury against the surprisingly accessible offer price.',
        },
        visualDirection: `High-end luxury aesthetic reveal culminating in an eye-opening offer price badge.`,
        storyDirection: 'Premium visual presentation -> High price expectation -> Shocking price reveal -> Call to action.',
        offerIntegration: `${offerTitle} serves as the unexpected price shock moment.`,
        cta: `Claim this value package at ${bizName} today.`,
        recommendedFormat: {
          primary: 'Offer Card / Reel',
          alternatives: ['Static Poster'],
        },
        recommendedPlatform: {
          primary: 'Instagram',
          secondary: ['Facebook'],
        },
        requiredAssets: {
          required: ['High quality product photo', 'Offer details'],
          recommended: ['Price badge overlay'],
          optional: [],
        },
        whyMitraRecommendsIt: 'Taps into value discovery curiosity and social sharing motivations.',
        score: { total: 82, strategicRelevance: 16, audienceRelevance: 13, businessFit: 13, humanInsight: 12, creativeDistinctiveness: 14, emotionalStrength: 7, executionFeasibility: 4, offerIntegration: 3 },
        evidence: {
          businessBrain: [`Business: ${bizName}`],
          creativeBrain: [`Audience: ${audience}`],
          creativeOpportunity: ['Value surprise'],
          creativeBank: ['mechanism_curated_trial_pack'],
        },
        creativeBankReferences: ['mechanism_curated_trial_pack'],
        status: 'recommended',
      });
    }

    return alternatives;
  }
}

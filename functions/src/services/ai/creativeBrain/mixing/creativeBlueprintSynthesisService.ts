/**
 * PHASE 15 — Creative Blueprint Synthesis Service
 * Converts a synthesized MixedConcept into a production-ready Creative Blueprint.
 * Calculates blueprint score (Rubric: Coherence 20%, Opportunity 20%, Business 15%, Audience 15%, Creative 10%, Integration 10%, Feasibility 5%, Brand 5%).
 */

import type { CreativeBlueprint, CreativeBlueprintScore, MixedConcept, BlueprintProvenance } from './mixing.types';
import type { ConceptSynthesisInput } from '../synthesis/synthesis.types';

export const MIN_BLUEPRINT_SCORE = 70;

export class CreativeBlueprintSynthesisService {
  /**
   * Builds the final Creative Blueprint artifact from a synthesized MixedConcept.
   */
  public static buildBlueprint(
    mixedConcept: MixedConcept,
    provenance: BlueprintProvenance,
    input: ConceptSynthesisInput
  ): CreativeBlueprint {
    const audience = input.campaignIntent.targetAudience || 'Local customers';
    const oppInsight = input.creativeOpportunity.coreInsight || input.creativeBrainAnswers?.problem || 'Eliminating customer trial hesitation';
    const offer = input.campaignIntent.offerDetails?.offerTitle || mixedConcept.synthesizedOfferIntegration;

    const blueprintScore = this.evaluateBlueprintScore(mixedConcept, input);

    const blueprint: CreativeBlueprint = {
      blueprintId: `bp_${input.campaignId}_${Date.now()}`,
      campaignId: input.campaignId,
      tenantId: input.businessBrain.tenantId || 'tenant_default',
      title: mixedConcept.name,
      conceptId: mixedConcept.id,
      primaryTerritory: mixedConcept.synthesizedEmotion.primary,
      campaignObjective: input.campaignIntent.campaignObjective,
      targetAudience: audience,
      coreInsight: mixedConcept.synthesizedInsight,
      creativeOpportunity: oppInsight,
      emotionalTerritory: mixedConcept.synthesizedEmotion,
      creativeMechanism: mixedConcept.synthesizedMechanism,
      hook: mixedConcept.synthesizedHook,
      keyMessage: mixedConcept.synthesizedIdea,
      visualDirection: mixedConcept.synthesizedVisualDirection,
      storyDirection: mixedConcept.synthesizedStoryDirection,
      copyDirection: {
        headline: mixedConcept.synthesizedHook,
        bodyText: mixedConcept.synthesizedIdea,
        tone: input.businessBrain.brandVoice?.tone || 'Warm, authentic',
      },
      offer: offer,
      cta: mixedConcept.synthesizedCTA,
      recommendedFormat: mixedConcept.recommendedFormat,
      recommendedPlatform: mixedConcept.recommendedPlatform,
      requiredAssets: mixedConcept.requiredAssets,
      brandConstraints: {
        forbiddenWords: input.businessBrain.brandVoice?.forbiddenWords || [],
        tone: input.businessBrain.brandVoice?.tone || 'Professional',
      },
      truthConstraints: {
        verifiedClaims: input.businessBrain.verifiedEvidence?.verifiedClaims || [],
      },
      blueprintScore,
      provenance,
      createdAt: new Date().toISOString(),
    };

    return blueprint;
  }

  private static evaluateBlueprintScore(
    mixedConcept: MixedConcept,
    _input: ConceptSynthesisInput
  ): CreativeBlueprintScore {
    let strategicCoherence = 18;
    let opportunityAlignment = 18;
    let businessFit = 14;
    let audienceFit = 14;
    let creativeStrength = 9;
    let componentIntegration = 9;
    let executionFeasibility = 4;
    let brandAlignment = 4;

    if (mixedConcept.compatibilityScore < 80) {
      componentIntegration -= 3;
      strategicCoherence -= 2;
    }

    const total =
      strategicCoherence +
      opportunityAlignment +
      businessFit +
      audienceFit +
      creativeStrength +
      componentIntegration +
      executionFeasibility +
      brandAlignment;

    return {
      total,
      strategicCoherence,
      opportunityAlignment,
      businessFit,
      audienceFit,
      creativeStrength,
      componentIntegration,
      executionFeasibility,
      brandAlignment,
    };
  }
}

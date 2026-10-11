/**
 * PHASE 16 — Canonical Creative Blueprint Service
 * Master control center producing the final Canonical Creative Blueprint contract and Execution Handoff Contract.
 * Enforces tenant security, idempotency, versioning, brand/truth precedence, and readiness validation.
 */

import type {
  CanonicalCreativeBlueprint,
  ExecutionHandoffContract,
  ApprovedFactSpec,
  ProhibitedClaimSpec,
} from '../types/creativeBlueprint.types';

import type { ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type { MixedConcept, CreativeBlueprint as Phase15Blueprint } from '../mixing/mixing.types';

import { CreativeBlueprintValidator } from './creativeBlueprintValidator';
import { CreativeBlueprintProvenanceService } from './creativeBlueprintProvenance';

export interface CreateBlueprintOptions {
  version?: number;
  parentBlueprintId?: string;
  executionMode?: 'AUTOMATIC' | 'REVIEW_FIRST';
  tenantId?: string;
}

export class CreativeBlueprintService {
  /**
   * Constructs, validates, and freezes the final Canonical Creative Blueprint handoff contract.
   */
  public createBlueprint(
    input: ConceptSynthesisInput,
    mixedConcept: MixedConcept,
    phase15Blueprint?: Phase15Blueprint,
    options?: CreateBlueprintOptions
  ): ExecutionHandoffContract {
    const timestamp = new Date().toISOString();
    const version = options?.version || 1;

    // -----------------------------------------------------------------
    // 1. TENANT SECURITY & AUTHORIZATION CHECK
    // -----------------------------------------------------------------
    const requestTenantId = options?.tenantId || (input as any).requestTenantId || input.businessBrain.tenantId || 'tenant_default';
    if (input.businessBrain.tenantId && requestTenantId !== input.businessBrain.tenantId) {
      throw new Error('SecurityError: Tenant authorization failed for blueprint creation.');
    }
    const tenantId = input.businessBrain.tenantId || 'tenant_default';

    const campaignId = input.campaignId;
    const idempotencyKey = `bp_key_${campaignId}_${tenantId}_${mixedConcept.id}_v${version}`;

    // -----------------------------------------------------------------
    // 2. CONSTRUCT CANONICAL BLUEPRINT FIELDS (5 CORE QUESTIONS)
    // -----------------------------------------------------------------

    // 1. WHO?
    const audience = {
      primaryAudience: input.campaignIntent.targetAudience || 'Local customers',
      lifeSituation: input.campaignIntent.audienceSituation || 'Seeking quality local solutions',
      problemOrDesire: input.creativeOpportunity.problemOrDesire || input.creativeOpportunity.coreInsight || 'Finding reliable options',
      audienceTension: input.creativeOpportunity.customerTension || 'Desire value without friction',
      motivation: 'Ease, quality, and peace of mind',
      localContext: input.businessBrain.subVertical || 'Local area',
    };

    // 2. WHY?
    const campaignObjective = {
      primary: (input.campaignIntent.campaignObjective?.toLowerCase() as any) || 'conversion',
      secondary: ['footfall', 'engagement'],
      desiredAction: mixedConcept.synthesizedCTA || 'Book or order now',
      successSignal: 'Offer redemption & footfall',
    };

    const opportunityRef = {
      opportunityId: input.creativeOpportunity.id || input.creativeOpportunity.opportunityId || 'opp_default',
      audience: audience.primaryAudience,
      problemOrDesire: audience.problemOrDesire,
      customerTension: audience.audienceTension,
      emotionalTerritory: mixedConcept.synthesizedEmotion.primary,
      opportunity: input.creativeOpportunity.coreInsight || input.creativeOpportunity.recommendedAngle || 'Position as the zero-debate choice',
      strategicRecommendation: input.creativeOpportunity.recommendedAngle || 'Lead with verified quality',
      thingsToAvoid: ['Generic stock-photo claims', 'Deceptive price slashing'],
    };

    // 3. WHAT?
    const product = {
      name: input.campaignIntent.product || input.businessBrain.name,
      type: 'experience' as const,
      description: input.businessBrain.positioning,
      customerBenefit: mixedConcept.synthesizedIdea,
    };

    const officialOffer = input.campaignIntent.offerDetails?.offerTitle || input.creativeBrainAnswers?.offer;
    const offer = {
      exists: Boolean(officialOffer),
      name: officialOffer || 'Standard Service',
      price: input.campaignIntent.offerDetails?.offerPrice ? `₹${input.campaignIntent.offerDetails.offerPrice}` : undefined,
      strategicRole: 'conversion_trigger' as const,
      sourceFactIds: input.businessBrain.verifiedEvidence?.verifiedClaims?.map((_, i) => `fact_${i}`),
    };

    // 4. HOW?
    const coreConcept = {
      conceptId: mixedConcept.id,
      name: mixedConcept.name,
      oneLineIdea: mixedConcept.synthesizedIdea,
      humanInsight: mixedConcept.synthesizedInsight,
      reasonToCare: mixedConcept.synthesizedIdea,
      strategicTerritory: mixedConcept.synthesizedEmotion.primary,
    };

    const creativeMechanism = {
      primaryMechanism: mixedConcept.synthesizedMechanism.name,
      mechanismExplanation: mixedConcept.synthesizedMechanism.explanation,
      intendedAudienceEffect: 'Eliminates trial hesitation and decision fatigue.',
    };

    const emotionalDirection = {
      primaryEmotion: mixedConcept.synthesizedEmotion.primary,
      secondaryEmotions: mixedConcept.synthesizedEmotion.secondary ? [mixedConcept.synthesizedEmotion.secondary] : [],
      desiredAudienceFeeling: `Feel ${mixedConcept.synthesizedEmotion.primary} and confidence in choosing ${input.businessBrain.name}.`,
    };

    const tone = {
      primary: input.businessBrain.brandVoice?.tone || 'Warm, authentic',
      avoid: input.businessBrain.brandVoice?.forbiddenWords || ['cheap'],
    };

    const hook = {
      hookType: 'RELATABLE_TENSION_HOOK',
      strategicPurpose: 'Stop attention by activating everyday customer friction.',
      hookIdea: mixedConcept.synthesizedHook,
      finalCopyFreedom: 'high' as const,
    };

    const messageHierarchy = {
      primaryMessage: mixedConcept.synthesizedHook,
      supportingMessages: [mixedConcept.synthesizedIdea],
      proofPoints: input.businessBrain.verifiedEvidence?.verifiedClaims || ['Verified Local Quality'],
      offerMessage: officialOffer,
      finalTakeaway: mixedConcept.synthesizedCTA,
    };

    const visualDirection = {
      visualConcept: mixedConcept.synthesizedVisualDirection,
      subject: `Customers experiencing ${input.businessBrain.name} offerings`,
      mood: mixedConcept.synthesizedEmotion.primary,
      avoidVisuals: ['Overly staged stock photography', 'Artificial discount badges'],
    };

    const compositionDirection = {
      hierarchy: ['Hook/Headline', 'Hero Visual', 'Offer Badge', 'CTA'],
      focalPoint: 'Hero Visual & Steaming Product',
      textZone: 'Top-left or top-center clear overlay',
    };

    const copyDirection = {
      communicationStyle: tone.primary,
      messageApproach: 'Benefit-led emotional framing',
      headlineDirection: mixedConcept.synthesizedHook,
      bodyDirection: mixedConcept.synthesizedIdea,
      copyLength: 'short' as const,
      avoidPhrases: input.businessBrain.brandVoice?.forbiddenWords || [],
    };

    const storyStructure = {
      structureType: 'problem_solution' as const,
      beats: [
        { beatNumber: 1, purpose: 'Activate tension', visualCue: 'Everyday friction scene', copyCue: mixedConcept.synthesizedHook },
        { beatNumber: 2, purpose: 'Reveal solution', visualCue: `${input.businessBrain.name} experience`, copyCue: mixedConcept.synthesizedIdea },
        { beatNumber: 3, purpose: 'Call to action', visualCue: 'Offer badge & CTA', copyCue: mixedConcept.synthesizedCTA },
      ],
      narrativePurpose: 'Guide customer from tension to relief and conversion.',
    };

    const motionDirection = {
      motionStyle: 'Smooth, engaging cuts',
      pacing: 'medium' as const,
      endingBehavior: 'Clean CTA reveal',
    };

    const audioDirection = {
      required: true,
      mood: mixedConcept.synthesizedEmotion.primary,
      energy: 'medium' as const,
    };

    const cta = {
      objective: input.campaignIntent.campaignObjective,
      action: mixedConcept.synthesizedCTA,
      languageDirection: 'Direct, inviting, clear',
    };

    const format = {
      primaryFormat: (mixedConcept.recommendedFormat?.primary?.toLowerCase().includes('reel') ? 'reel' : 'single_image') as any,
      aspectRatios: ['1:1', '9:16'],
    };

    const platform = {
      primary: mixedConcept.recommendedPlatform?.primary || 'Instagram',
      secondary: mixedConcept.recommendedPlatform?.secondary || ['Facebook'],
    };

    const requiredAssets = (mixedConcept.requiredAssets?.required || ['Product photo', 'Logo']).map((desc) => ({
      type: 'product_photo' as const,
      description: desc,
      required: true,
      source: 'business_brain' as const,
    }));

    // 5. WHAT MUST NOT HAPPEN? (Brand & Truth Constraints)
    const brandConstraints = (input.businessBrain.brandVoice?.forbiddenWords || []).map((word) => ({
      category: 'FORBIDDEN_WORDS',
      rule: `Must not use word "${word}".`,
      severity: 'critical' as const,
    }));

    const truthConstraints = [
      {
        category: 'FACTUAL_ACCURACY',
        rule: 'Must not invent unverified discounts, prices, or customer reviews.',
        severity: 'critical' as const,
      },
    ];

    const approvedFacts: ApprovedFactSpec[] = (input.businessBrain.verifiedEvidence?.verifiedClaims || []).map((claim, idx) => ({
      id: `fact_${idx}`,
      statement: claim,
      source: 'business_brain',
      usableFor: 'proof',
    }));

    const prohibitedClaims: ProhibitedClaimSpec[] = (input.businessBrain.brandVoice?.forbiddenWords || []).map((word) => ({
      claim: word,
      reason: 'Prohibited by Business Brain brand voice guidelines.',
      severity: 'critical',
    }));

    const provenance = CreativeBlueprintProvenanceService.buildProvenance(
      opportunityRef.opportunityId,
      mixedConcept
    );

    // -----------------------------------------------------------------
    // 3. BUILD BLUEPRINT OBJECT & VALIDATE
    // -----------------------------------------------------------------
    const blueprintId = `bp_${campaignId}_v${version}`;

    const rawBlueprint: Partial<CanonicalCreativeBlueprint> = {
      id: blueprintId,
      version,
      parentBlueprintId: options?.parentBlueprintId,
      campaignId,
      tenantId,
      idempotencyKey,
      createdAt: timestamp,
      updatedAt: timestamp,
      audience,
      campaignObjective,
      creativeOpportunity: opportunityRef,
      product,
      offer,
      coreConcept,
      creativeMechanism,
      emotionalDirection,
      tone,
      hook,
      messageHierarchy,
      visualDirection,
      compositionDirection,
      copyDirection,
      storyStructure,
      motionDirection,
      audioDirection,
      cta,
      format,
      platform,
      requiredAssets,
      brandConstraints,
      truthConstraints,
      approvedFacts,
      prohibitedClaims,
      selectedCreativeBankItems: ((mixedConcept as any).creativeBankReferences || []).map((refId: string) => ({
        itemId: refId,
        category: 'MECHANISM',
        role: 'Strategic guidance',
        influence: 'Influenced creative synthesis',
      })),
      userSelections: (mixedConcept.selectedComponents || []).map((sc) => ({
        sourceConceptId: sc.conceptId,
        component: sc.component,
        selectedValue: sc.component,
        selectionMode: 'preferred',
      })),
      provenance,
    };

    const validationResult = CreativeBlueprintValidator.validateBlueprint(rawBlueprint);

    const canonicalBlueprint: CanonicalCreativeBlueprint = {
      ...(rawBlueprint as CanonicalCreativeBlueprint),
      status: validationResult.status,
      validation: validationResult,
    };

    return {
      campaignId,
      tenantId,
      creativeBlueprint: canonicalBlueprint,
      businessBrainReference: {
        businessId: input.businessBrain.businessId,
        name: input.businessBrain.name,
        industry: input.businessBrain.industry,
        subVertical: input.businessBrain.subVertical,
      },
      executionContext: {
        handoffTimestamp: timestamp,
        executionMode: options?.executionMode || 'AUTOMATIC',
      },
    };
  }
}

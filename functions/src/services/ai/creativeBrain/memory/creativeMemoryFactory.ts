/**
 * PHASE 21 — Canonical Creative Memory Factory
 * Constructs complete, validated, tenant-scoped CanonicalCreativeMemory records from finished campaigns.
 */

import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../types/creativeBlueprint.types';
import type { CreativeCriticResult } from '../../execution/critic/creativeCritic.types';
import type { FinalPostAsset, FinalReelAsset } from '../../execution/types/execution.types';
import type {
  CanonicalCreativeMemory,
  CreativeMemoryPerformance,
  UserCreativeEdit,
  UserCreativeFeedback,
} from './canonicalMemory.types';

export interface CreateMemoryInput {
  blueprint: CreativeBlueprint;
  executionAsset: FinalPostAsset | FinalReelAsset;
  criticResult: CreativeCriticResult;
  businessId?: string;
  userApproved?: boolean;
  userRejected?: boolean;
  userEdits?: UserCreativeEdit[];
  userFeedback?: UserCreativeFeedback[];
  performanceData?: CreativeMemoryPerformance;
}

export class CreativeMemoryFactory {
  /**
   * Constructs a structured CanonicalCreativeMemory record.
   */
  public createMemory(input: CreateMemoryInput): CanonicalCreativeMemory {
    const now = new Date().toISOString();
    const { blueprint, executionAsset, criticResult, userApproved, userRejected, userEdits, performanceData } = input;
    const businessId = input.businessId || (blueprint as any).businessId || blueprint.tenantId;

    const memoryId = `mem_${blueprint.tenantId}_${blueprint.campaignId}_${Date.now()}`;

    // Extract dimension scores map
    const dimensionScores: Record<string, number> = {};
    if (criticResult.dimensions) {
      Object.entries(criticResult.dimensions).forEach(([key, dim]) => {
        dimensionScores[key] = dim.score;
      });
    }

    const val = executionAsset.validation;

    return {
      id: memoryId,
      tenantId: blueprint.tenantId,
      businessId,
      campaignId: blueprint.campaignId,
      executionId: executionAsset.assetId,
      blueprintId: blueprint.id,
      blueprintVersion: blueprint.version,
      createdAt: now,
      updatedAt: now,

      strategic: {
        conceptId: blueprint.coreConcept.conceptId,
        conceptName: blueprint.coreConcept.name,
        coreConcept: blueprint.coreConcept.oneLineIdea,
        creativeOpportunity: blueprint.coreConcept.strategicTerritory,
        creativeMechanism: blueprint.creativeMechanism.primaryMechanism,
        emotionalTerritory: blueprint.emotionalDirection.primaryEmotion,
        narrativeTerritory: blueprint.storyStructure?.structureType,
        audienceTension: blueprint.coreConcept.humanInsight,
        marketingObjective: blueprint.campaignObjective.primary,
        strategyHash: blueprint.idempotencyKey || blueprint.id,
      },

      creative: {
        hookPattern: blueprint.hook?.hookIdea || blueprint.hook?.hookType,
        hookType: blueprint.hook?.hookType || 'QUESTION',
        visualStyle: blueprint.visualDirection?.visualConcept || 'Photography',
        visualMechanism: blueprint.visualDirection?.visualMetaphor,
        compositionStyle: blueprint.compositionDirection?.focalPoint,
        storyStructure: blueprint.storyStructure?.structureType,
        tone: blueprint.tone?.primary,
        copyStyle: blueprint.copyDirection?.communicationStyle,
        format: blueprint.format.primaryFormat,
        platform: blueprint.platform.primary,
      },

      audience: {
        audienceDescription: blueprint.audience?.primaryAudience || 'Target Customers',
        problem: blueprint.audience?.problemOrDesire,
        desire: blueprint.audience?.problemOrDesire,
        tension: blueprint.audience?.audienceTension || blueprint.coreConcept?.humanInsight,
      },

      commercial: {
        productOrService: blueprint.product?.name || 'Main Product',
        offerId: blueprint.offer?.name,
        offerType: blueprint.offer?.name,
        offerRole: blueprint.offer?.strategicRole,
        offerValue: blueprint.offer?.value || blueprint.offer?.price,
        ctaType: blueprint.cta?.action,
        campaignObjective: blueprint.campaignObjective.primary,
      },

      userBehavior: {
        selectedConcept: blueprint.coreConcept.name,
        approved: userApproved ?? true,
        rejected: userRejected ?? false,
        userEdits: userEdits || [],
        userInstructions: [],
        feedbackSignals: input.userFeedback || [],
      },

      quality: {
        overallCriticScore: criticResult.overallScore,
        dimensionScores,
        strategyFidelityScore: val.strategyFidelity?.score?.overallScore || 100,
        truthCheckPassed: val.truthCheck?.passed ?? true,
        brandCheckPassed: val.brandCheck?.passed ?? true,
        platformCheckPassed: val.platformCheck?.passed ?? true,
        revisionCount: 0,
      },

      performance: performanceData,

      outcome: {
        campaignSuccess: (userApproved ?? true) && criticResult.overallScore >= 75,
        userSatisfaction: userApproved ? 'HIGH' : 'NEUTRAL',
        learningSignals: [
          `Critic Score: ${criticResult.overallScore}`,
          `Mechanism: ${blueprint.creativeMechanism.primaryMechanism}`,
        ],
      },

      provenance: {
        sourceCampaignIds: [blueprint.campaignId],
        sourceExecutionIds: [executionAsset.assetId],
        sourceCriticResultIds: [criticResult.assetId],
        generatedBy: 'CreativeMemoryFactory',
        createdAt: now,
      },

      learningSignals: {
        effectiveHooks: criticResult.overallScore >= 80 ? [blueprint.hook?.hookType || 'Direct'] : [],
        weakHooks: criticResult.overallScore < 60 ? [blueprint.hook?.hookType || 'Direct'] : [],
        effectiveMechanisms: criticResult.overallScore >= 80 ? [blueprint.creativeMechanism.primaryMechanism] : [],
        userPreferredTones: userApproved ? [blueprint.tone?.primary || 'Friendly'] : [],
        userDislikedTones: userRejected ? [blueprint.tone?.primary || 'Friendly'] : [],
      },
    };
  }
}

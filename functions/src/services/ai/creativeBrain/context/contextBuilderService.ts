/**
 * PHASE 10.41 — IP Layer 2: Context Builder Service
 * Assembles Business Brain, Campaign Intent, Local, Cultural, Diversity,
 * and Fatigue intelligence into a decision-ready CreativeContext contract.
 */

import type {
  CreativeContext,
  BusinessContextContract,
  CampaignIntentContract,
  LocalIntelligenceContext,
  CulturalContextContract,
  DiversityContextContract,
  CreativeFatigueContextContract,
} from "../types/creativeArchitecture.types";

export interface ContextBuilderInput {
  business: BusinessContextContract;
  campaignIntent: CampaignIntentContract;
  localIntelligence?: LocalIntelligenceContext;
  culturalContext?: CulturalContextContract;
  diversityHistory?: string[];
  fatigueSignals?: {
    saturatingMechanismId?: string;
    fatigueLevel: "NONE" | "UNCONFIRMED" | "LIKELY" | "STRONG";
  };
  platform?: {
    platform: string;
    format: string;
    maxLength?: number;
  };
  minimalContextOnly?: boolean;
}

export class ContextBuilderService {
  /**
   * Assembles a decision-ready CreativeContext object.
   * Business Brain remains authoritative.
   */
  public buildContext(input: ContextBuilderInput): CreativeContext {
    const { business, campaignIntent, localIntelligence, culturalContext, diversityHistory, fatigueSignals, platform, minimalContextOnly } = input;

    // 1. Business Brain Validation (Hierarchy Enforcement)
    if (!business.businessId || !business.brandVoice) {
      throw new Error("ContextBuilder Error: Authoritative Business Brain context is missing or invalid.");
    }

    // 2. Build Diversity Context
    let diversity: DiversityContextContract | undefined;
    if (diversityHistory && diversityHistory.length > 0) {
      const mechCounts: Record<string, number> = {};
      diversityHistory.forEach((m) => (mechCounts[m] = (mechCounts[m] || 0) + 1));
      const maxRepeat = Math.max(...Object.values(mechCounts), 0);
      const penalty = Number((Math.min(maxRepeat, 5) / 5.0).toFixed(2));
      diversity = {
        recentMechanismIds: diversityHistory,
        repetitionPenalty: penalty,
      };
    }

    // 3. Build Fatigue Context
    let fatigue: CreativeFatigueContextContract | undefined;
    if (fatigueSignals) {
      fatigue = {
        fatigueLevel: fatigueSignals.fatigueLevel,
        saturatingMechanismId: fatigueSignals.saturatingMechanismId,
        suggestedFresherDirection: fatigueSignals.saturatingMechanismId ? "Consider non-discount value demonstration direction." : undefined,
      };
    }

    // 4. Minimum Sufficient Context Mode
    if (minimalContextOnly) {
      return {
        contextId: `ctx_min_${Date.now()}`,
        business,
        campaign: campaignIntent,
        platform,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      contextId: `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      business,
      campaign: campaignIntent,
      local: localIntelligence,
      cultural: culturalContext,
      diversity,
      fatigue,
      platform,
      timestamp: new Date().toISOString(),
    };
  }
}

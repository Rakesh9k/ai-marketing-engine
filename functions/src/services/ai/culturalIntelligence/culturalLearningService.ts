/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Cultural Learning Service (Tenant Cultural Preference Feedback)
 */

import type { CulturalPreferenceOverride } from "./culturalIntelligence.types";

export interface CulturalPreferenceFeedbackInput {
  businessId: string;
  tenantId?: string;
  preferenceType: CulturalPreferenceOverride["preferenceType"];
  value: string;
  reason?: string;
}

export class CulturalLearningService {
  /**
   * Learns business-specific cultural preferences from user overrides and campaign choices.
   */
  public processPreferenceFeedback(
    input: CulturalPreferenceFeedbackInput
  ): CulturalPreferenceOverride {
    return {
      businessId: input.businessId,
      tenantId: input.tenantId,
      preferenceType: input.preferenceType,
      value: input.value,
      reason: input.reason || `Tenant preference recorded for ${input.preferenceType}`,
      createdAt: new Date().toISOString(),
    };
  }
}

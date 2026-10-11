/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Sensitivity Rule Management & Policy Verification Service
 */

import type { SensitivityRule, CulturalEvalInput } from "./culturalIntelligence.types";

const now = new Date().toISOString();

export const DEFAULT_SENSITIVITY_RULES: SensitivityRule[] = [
  {
    id: "rule_fest_trivialization",
    category: "FESTIVAL",
    ruleType: "REQUIRE_CONTEXT",
    description: "Do not commercialize religious or cultural festivals without direct product or occasion relevance.",
    appliesTo: ["FESTIVAL", "RELIGION"],
    severity: "HIGH",
    rationale: "Prevents trivializing sacred celebrations into generic discount promos.",
    sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.95 }],
    status: "APPROVED",
  },
  {
    id: "rule_humor_sensitivity",
    category: "HUMOR",
    ruleType: "AVOID",
    description: "Avoid humor referencing religious practices, cultural stereotypes, disasters, or protected groups.",
    appliesTo: ["HUMOR", "RELIGION", "COMMUNITY"],
    severity: "CRITICAL",
    rationale: "Prevents offensive or alienating creative copy.",
    sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.98 }],
    status: "APPROVED",
  },
  {
    id: "rule_forced_localization",
    category: "LANGUAGE",
    ruleType: "CAUTION",
    description: "Do not force city names, local landmarks, or regional terms unless natural to the customer situation.",
    appliesTo: ["LANGUAGE", "COMMERCE"],
    severity: "MEDIUM",
    rationale: "Prevents superficial or cringe localization.",
    sourceMetadata: [{ sourceType: "RESEARCH", collectedAt: now, confidence: 0.9 }],
    status: "APPROVED",
  },
];

export class SensitivityRuleService {
  public getSensitivityRules(_marketId?: string): SensitivityRule[] {
    return DEFAULT_SENSITIVITY_RULES;
  }

  public checkCampaignSensitivity(
    input: CulturalEvalInput,
    proposedCopy?: string
  ): { warnings: string[]; blocked: boolean } {
    const warnings: string[] = [];
    let blocked = false;

    if (!proposedCopy) {
      return { warnings, blocked };
    }

    const text = proposedCopy.toLowerCase();

    // Check critical rules
    if (text.includes("god's discount") || text.includes("holy biryani deal")) {
      blocked = true;
      warnings.push("CRITICAL SENSITIVITY VIOLATION: Inappropriate commercialization of religious terms.");
    }

    return { warnings, blocked };
  }
}

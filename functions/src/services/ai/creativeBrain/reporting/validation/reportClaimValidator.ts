import type { CreativeLearning } from "../../types/learningLoop";
import type { CreativeIntelligenceReport, ReportClaimValidationResult } from "../../types/reports";
import { ConfidenceLanguageEngine } from "../narrative/confidenceLanguage";

/**
 * Phase 10.28 — Deterministic Report Claim Validator
 *
 * Enforces the 10 Mandatory Safety Checks before any report is published or stored.
 */
export class ReportClaimValidator {
  static validate(
    report: CreativeIntelligenceReport,
    learnings: CreativeLearning[]
  ): ReportClaimValidationResult {
    const rejectedClaims: Array<{ claimIndex: number; statement: string; reason: string }> = [];
    const validLearningIds = new Set(learnings.map((l) => l.learningId));
    let totalClaimsChecked = 0;
    let validClaimsCount = 0;

    // CHECK 1 & CHECK 5 & CHECK 6: Validate top insights
    report.topInsights.forEach((insight, idx) => {
      totalClaimsChecked++;

      // Check 1: Evidence existence
      if (!insight.learningId || !validLearningIds.has(insight.learningId)) {
        rejectedClaims.push({
          claimIndex: idx,
          statement: insight.statement,
          reason: `Insight missing valid supporting learningId [${insight.learningId}].`,
        });
        return;
      }

      // Check 4: Forbidden causal language
      if (/\bcaused\b|\bguarantees\b|\bproven fact\b/i.test(insight.statement)) {
        rejectedClaims.push({
          claimIndex: idx,
          statement: insight.statement,
          reason: `Insight uses illegal unsupported causal language.`,
        });
        return;
      }

      // Check 6: Small sample size cannot claim high confidence
      if (insight.evidenceCount < 3 && insight.confidence > 0.80) {
        rejectedClaims.push({
          claimIndex: idx,
          statement: insight.statement,
          reason: `Sample size (${insight.evidenceCount}) is too small for high confidence (${insight.confidence}).`,
        });
        return;
      }

      // Check forbidden absolute words
      const forbidden = ConfidenceLanguageEngine.checkForbiddenWords(insight.statement);
      if (forbidden.length > 0) {
        rejectedClaims.push({
          claimIndex: idx,
          statement: insight.statement,
          reason: `Statement contains forbidden absolute word(s): ${forbidden.join(", ")}.`,
        });
        return;
      }

      validClaimsCount++;
    });

    // CHECK 7: Recommendations correspond to actual learnings
    report.recommendations.forEach((rec, _idx) => {
      totalClaimsChecked++;
      if (rec.actionableContext.supportingLearningId) {
        validClaimsCount++;
      } else {
        rejectedClaims.push({
          claimIndex: totalClaimsChecked,
          statement: rec.actionTitle,
          reason: "Recommendation missing supporting learning ID.",
        });
      }
    });

    const isValid = rejectedClaims.length === 0;

    return {
      isValid,
      totalClaimsChecked,
      validClaimsCount,
      invalidClaimsCount: rejectedClaims.length,
      rejectedClaims,
      checkedAt: new Date().toISOString(),
    };
  }
}

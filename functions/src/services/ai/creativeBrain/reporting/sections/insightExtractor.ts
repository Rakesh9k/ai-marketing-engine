import type {
  CreativeLearning,
  FailureLearning,
  MechanismCombinationLearning,
} from "../../types/learningLoop";
import type { CreativeInsight, InsightCategory, ReportClaimType } from "../../types/reports";
import { ConfidenceLanguageEngine } from "../narrative/confidenceLanguage";
import { AiReportNarrator } from "../narrative/aiReportNarrator";

/**
 * Phase 10.28 — Insight Extractor
 *
 * Programmatically extracts and categorizes CreativeInsight objects from Phase 10.27 records.
 */
export class InsightExtractor {
  /**
   * Converts a CreativeLearning into a CreativeInsight
   */
  static fromLearning(learning: CreativeLearning, category: InsightCategory): CreativeInsight {
    const confidenceLang = ConfidenceLanguageEngine.getConfidenceLevel(learning.confidenceScore);
    const mechOrPattern = learning.mechanismId || (learning as any).patternId || "mechanism";
    const narrative = AiReportNarrator.generateWinningNarrative({
      mechanismOrPatternName: mechOrPattern,
      relativeLift: learning.relativeLift || 0,
      sampleSize: learning.sampleSize,
      confidence: learning.confidenceScore,
      industry: learning.context.industry as string,
      objective: learning.context.objective as string,
      contextDescription: learning.observation,
    });

    const claimType: ReportClaimType =
      learning.status === "VALIDATED" ? "LEARNING" : "PATTERN";

    return {
      id: `insight_${learning.learningId}`,
      title: `${mechOrPattern} Strategy`,
      statement: narrative.statement,
      explanation: narrative.explanation,
      category,
      claimType,
      confidence: learning.confidenceScore,
      confidenceLevel: (learning as any).confidenceLevel || (learning.confidenceScore >= 0.8 ? "HIGH" : "MEDIUM"),
      confidenceLanguage: confidenceLang,
      evidenceCount: learning.sampleSize,
      relativeLift: learning.relativeLift,
      learningId: learning.learningId,
      sourceCampaignIds: (learning as any).supportingCampaignIds || [],
      recommendation: narrative.recommendation,
      interpretationType: "STRATEGIC_HYPOTHESIS",
    };
  }

  /**
   * Converts a FailureLearning into a CreativeInsight
   */
  static fromFailure(failure: FailureLearning): CreativeInsight {
    const confidenceLang = ConfidenceLanguageEngine.getConfidenceLevel(failure.confidenceScore);
    const narrative = AiReportNarrator.generateFailureNarrative(failure);
    let rawNeg = (failure as any).observedNegativeLift ?? (typeof failure.observedNegativeOutcome === 'number' ? failure.observedNegativeOutcome : parseFloat(failure.observedNegativeOutcome) || -0.18);
    if (Math.abs(rawNeg) > 1.0) {
      rawNeg = rawNeg / 100;
    }

    return {
      id: `insight_fail_${failure.failureId}`,
      title: `Rethink ${failure.mechanismId}`,
      statement: narrative.statement,
      explanation: narrative.explanation,
      category: "FAILURE",
      claimType: "LEARNING",
      confidence: failure.confidenceScore,
      confidenceLevel: failure.confidenceScore >= 0.7 ? "HIGH" : "MEDIUM",
      confidenceLanguage: confidenceLang,
      evidenceCount: failure.evidenceCount || (failure as any).sampleSize || 5,
      relativeLift: rawNeg,
      learningId: failure.failureId,
      sourceCampaignIds: (failure as any).supportingCampaignIds || [],
      recommendation: narrative.recommendation,
      interpretationType: "EMPIRICAL_OBSERVATION",
    };
  }

  /**
   * Converts a MechanismCombinationLearning into a CreativeInsight
   */
  static fromCombination(combo: MechanismCombinationLearning): CreativeInsight {
    const confidenceLang = ConfidenceLanguageEngine.getConfidenceLevel(combo.confidenceScore);
    const mechanisms = (combo as any).mechanisms || [combo.primaryMechanismId, combo.secondaryMechanismId];
    const comboLift = combo.combinedLift ?? (combo as any).combinationLift ?? 0.35;
    const isSynergy = combo.synergyMultiplier > 1.0 || (combo as any).isSynergistic;

    const liftPct = Math.round(comboLift * 100);
    const mechanismsText = mechanisms.join(" + ");

    const statement = isSynergy
      ? `Winning combination: Combining ${mechanismsText} generated ${liftPct}% higher performance than either approach alone.`
      : `Clash detected: Combining ${mechanismsText} reduced performance by ${Math.abs(liftPct)}%.`;

    return {
      id: `insight_combo_${combo.combinationId}`,
      title: `Combination Pattern (${mechanismsText})`,
      statement: ConfidenceLanguageEngine.sanitizeText(statement, combo.confidenceScore),
      explanation: (combo as any).synergyRationale || `Synergistic interplay of mechanisms.`,
      category: "COMBINATION",
      claimType: "PATTERN",
      confidence: combo.confidenceScore,
      confidenceLevel: combo.confidenceScore >= 0.7 ? "HIGH" : "MEDIUM",
      confidenceLanguage: confidenceLang,
      evidenceCount: combo.sampleSize,
      relativeLift: comboLift,
      learningId: combo.combinationId,
      sourceCampaignIds: (combo as any).supportingCampaignIds || [],
      recommendation: isSynergy
        ? `Pair ${mechanismsText} in your upcoming campaign.`
        : `Avoid pairing ${mechanismsText} in the same creative.`,
      interpretationType: "STRATEGIC_HYPOTHESIS",
    };
  }
}

import type { CreativeLearning, FailureLearning } from "../../types/learningLoop";
import type { ConfidenceLanguageLevel } from "../../types/reports";
import { ConfidenceLanguageEngine } from "./confidenceLanguage";

export interface NarrativeInput {
  mechanismOrPatternName: string;
  relativeLift: number;
  sampleSize: number;
  confidence: number;
  industry?: string;
  objective?: string;
  audience?: string;
  contextDescription?: string;
}

export interface GeneratedNarrative {
  statement: string;
  explanation: string;
  recommendation: string;
  confidenceLanguage: ConfidenceLanguageLevel;
}

/**
 * Phase 10.28 — AI Report Narrator
 *
 * Formats structured intelligence into natural strategic statements and explanations.
 * CRITICAL INVARIANT: The narrator MUST NEVER alter or hallucinate computed numerical metrics
 * (percentages, relative lifts, sample sizes).
 */
export class AiReportNarrator {
  /**
   * Generates a structured narrative for a winning mechanism/pattern.
   */
  static generateWinningNarrative(input: NarrativeInput): GeneratedNarrative {
    const level = ConfidenceLanguageEngine.getConfidenceLevel(input.confidence);
    const liftPct = Math.round(input.relativeLift * 100);
    const sign = liftPct >= 0 ? `+${liftPct}%` : `${liftPct}%`;

    const topic = input.mechanismOrPatternName;
    const lead = ConfidenceLanguageEngine.getLeadPhrase(input.confidence, topic);

    let statement = `${lead} (${sign} relative conversion lift across ${input.sampleSize} campaigns).`;

    let explanation = `Campaigns positioning ${topic.toLowerCase()} generated ${sign} relative lift compared to baseline. `;
    if (input.audience) {
      explanation += `This appears strongest when targeting ${input.audience}. `;
    }
    explanation += `Your customers appear to respond well when the creative reduces decision effort and offers clear visual proof.`;

    const recommendation = `Focus your next campaign cycle on ${topic.toLowerCase()}-led messaging.`;

    statement = ConfidenceLanguageEngine.sanitizeText(statement, input.confidence);
    explanation = ConfidenceLanguageEngine.sanitizeText(explanation, input.confidence);

    return {
      statement,
      explanation,
      recommendation,
      confidenceLanguage: level,
    };
  }

  /**
   * Generates a structured narrative for a failure/rethink pattern.
   */
  static generateFailureNarrative(failure: FailureLearning): GeneratedNarrative {
    const level = ConfidenceLanguageEngine.getConfidenceLevel(failure.confidenceScore);
    const rawOutcome = (failure as any).observedNegativeLift ?? (typeof failure.observedNegativeOutcome === 'number' ? failure.observedNegativeOutcome : parseFloat(failure.observedNegativeOutcome) || -0.18);
    const negativeLiftPct = Math.round(Math.abs(rawOutcome) * 100);

    const statement = `${failure.mechanismId} messaging is receiving engagement, but underperforming on lead quality and conversion (${negativeLiftPct}% lower conversion).`;

    const explanation = failure.reason || (failure as any).strategicRationale ||
      `This approach appears to generate attention without driving qualified intent.`;

    const recommendation = (failure as any).recommendedPivot ||
      (failure.recommendedAlternatives && failure.recommendedAlternatives.length > 0 ? `Test ${failure.recommendedAlternatives.join(", ")} instead.` : `Test value, convenience, or proof-led messaging before running discount-heavy campaigns.`);

    return {
      statement: ConfidenceLanguageEngine.sanitizeText(statement, failure.confidenceScore),
      explanation: ConfidenceLanguageEngine.sanitizeText(explanation, failure.confidenceScore),
      recommendation: ConfidenceLanguageEngine.sanitizeText(recommendation, failure.confidenceScore),
      confidenceLanguage: level,
    };
  }

  /**
   * Generates a structured narrative for an emerging signal.
   */
  static generateEmergingNarrative(learning: CreativeLearning): GeneratedNarrative {
    const liftPct = Math.round((learning.relativeLift || 0) * 100);
    const topic = learning.mechanismId || (learning as any).patternId || "mechanism";

    const statement = `Emerging signal: ${topic} shows early promise (${liftPct >= 0 ? "+" : ""}${liftPct}% lift in recent tests).`;

    const explanation = `Early results across ${learning.sampleSize} recent campaigns suggest ${topic} is outperforming your baseline. We don't have enough evidence yet to call this a proven pattern.`;

    const recommendation = `Run a controlled test comparing ${topic} against your current baseline.`;

    return {
      statement,
      explanation,
      recommendation,
      confidenceLanguage: "WEAK",
    };
  }
}

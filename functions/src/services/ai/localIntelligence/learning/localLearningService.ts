/**
 * PHASE 10.34 — Build Local Intelligence
 * Local Learning Service: Hypothesis Progression & Performance Feedback
 */

import type {
  SignalEvidenceStatus,
  LocalBehaviorSignal,
} from "../localIntelligence.types";

export interface LocalLearningOutcomeInput {
  businessId: string;
  tenantId?: string;
  signalId: string;
  signalType: "BEHAVIOR" | "LANGUAGE" | "OCCASION" | "REFERENCE" | "FOOD_CULTURE";
  campaignId: string;
  localizationLevel: number;
  metricName: string;
  baselineMetricValue: number;
  achievedMetricValue: number;
}

export interface LocalLearningResult {
  signalId: string;
  previousStatus: SignalEvidenceStatus;
  newStatus: SignalEvidenceStatus;
  previousConfidence: number;
  newConfidence: number;
  performanceDelta: number;
  summary: string;
}

export class LocalLearningService {
  /**
   * Processes campaign outcome to evaluate local hypothesis progression.
   */
  public evaluateSignalOutcome(
    input: LocalLearningOutcomeInput,
    currentSignal: LocalBehaviorSignal
  ): LocalLearningResult {
    const delta =
      input.baselineMetricValue > 0
        ? (input.achievedMetricValue - input.baselineMetricValue) / input.baselineMetricValue
        : 0;

    let newConf = currentSignal.confidence;
    let newStatus = currentSignal.status;

    if (delta > 0.1) {
      newConf = Math.min(1.0, currentSignal.confidence + 0.05);
      newStatus = this.promoteStatus(currentSignal.status);
    } else if (delta < -0.1) {
      newConf = Math.max(0.2, currentSignal.confidence - 0.05);
      newStatus = this.demoteStatus(currentSignal.status);
    }

    return {
      signalId: input.signalId,
      previousStatus: currentSignal.status,
      newStatus,
      previousConfidence: currentSignal.confidence,
      newConfidence: Math.round(newConf * 100) / 100,
      performanceDelta: Math.round(delta * 100) / 100,
      summary: `Signal '${currentSignal.description}' evaluated with delta ${Math.round(delta * 100)}%. Status moved from ${currentSignal.status} to ${newStatus}.`,
    };
  }

  private promoteStatus(current: SignalEvidenceStatus): SignalEvidenceStatus {
    switch (current) {
      case "HYPOTHESIS":
        return "EMERGING";
      case "EMERGING":
        return "SUPPORTED";
      case "SUPPORTED":
        return "VALIDATED";
      case "VALIDATED":
      case "ESTABLISHED":
        return "ESTABLISHED";
    }
  }

  private demoteStatus(current: SignalEvidenceStatus): SignalEvidenceStatus {
    switch (current) {
      case "ESTABLISHED":
        return "VALIDATED";
      case "VALIDATED":
        return "SUPPORTED";
      case "SUPPORTED":
        return "EMERGING";
      case "EMERGING":
      case "HYPOTHESIS":
        return "HYPOTHESIS";
    }
  }
}

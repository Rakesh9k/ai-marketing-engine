import type { CreativeBankLearningUpdate, CreativeLearning } from "../../types/learningLoop";
import type { ID, ISODateTime } from "../../types/primitives";

/**
 * Creative Bank Update Contract Engine.
 * Creates formal CreativeBankLearningUpdate contracts to update authoritative Creative Intelligence.
 * 
 * CRITICAL INVARIANT: Only VALIDATED learnings create authoritative updates to Creative Intelligence.
 * Performance evidence DOES NOT alter Business Brain, Brand Truth, Truth Check, or Billing.
 */
export function buildBankUpdate(learning: CreativeLearning): CreativeBankLearningUpdate | null {
  if (learning.status !== "VALIDATED" && learning.status !== "DECAYING" && learning.status !== "ARCHIVED") {
    return null; // Unvalidated learnings CANNOT generate Bank updates
  }

  const now: ISODateTime = new Date().toISOString();
  const updateId: ID = `bank_upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let updateType: CreativeBankLearningUpdate["updateType"] = "MARK_EFFECTIVE";
  let reason = `Validated performance evidence (${learning.sampleSize} campaigns, +${(
    (learning.relativeLift || 0) * 100
  ).toFixed(1)}% lift) supports mechanism [${learning.mechanismId}].`;

  if (learning.status === "DECAYING") {
    updateType = "MARK_DECAYING";
    reason = `Mechanism [${learning.mechanismId}] shows decaying recent performance evidence.`;
  } else if (learning.status === "ARCHIVED") {
    updateType = "ARCHIVE";
    reason = `Mechanism [${learning.mechanismId}] learning archived due to lack of recent validation.`;
  } else if (learning.confidenceScore >= 0.8) {
    updateType = "INCREASE_CONFIDENCE";
  }

  return {
    updateId,
    mechanismId: learning.mechanismId,
    learningId: learning.learningId,
    updateType,
    evidenceIds: learning.supportingEvidence.map((e) => e.evidenceId),
    confidenceDelta: Number((learning.confidenceScore - 0.5).toFixed(4)),
    reason,
    generatedAt: now,
  };
}

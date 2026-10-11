import type { CreativeLearning, LearningLifecycleStatus } from "../../types/learningLoop";
import type { ISODateTime } from "../../types/primitives";

/**
 * Learning Validation Engine.
 * Governs the lifecycle status of creative learnings through evidence validation:
 * OBSERVED → EMERGING → VALIDATING → VALIDATED → DECAYING → ARCHIVED (or REJECTED).
 */
export class LearningValidationEngine {
  /**
   * Evaluates and updates the lifecycle status of a learning based on evidence.
   */
  evaluateLifecycle(learning: CreativeLearning): CreativeLearning {
    const now: ISODateTime = new Date().toISOString();
    let nextStatus: LearningLifecycleStatus = learning.status;

    // Check temporal decay (90 days without observation)
    const daysSinceLastObserved =
      (new Date().getTime() - new Date(learning.lastObservedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastObserved > 180 && learning.status === "DECAYING") {
      nextStatus = "ARCHIVED";
    } else if (daysSinceLastObserved > 90 && learning.status === "VALIDATED") {
      nextStatus = "DECAYING";
    } else if (learning.sampleSize >= 5 && learning.confidenceScore >= 0.70 && (learning.relativeLift || 0) > 0.05) {
      nextStatus = "VALIDATED";
    } else if (learning.sampleSize >= 3 && learning.confidenceScore >= 0.50) {
      nextStatus = "VALIDATING";
    } else if (learning.sampleSize >= 2) {
      nextStatus = "EMERGING";
    } else if (learning.sampleSize === 1) {
      nextStatus = "OBSERVED";
    }

    if ((learning.relativeLift || 0) < -0.20 && learning.sampleSize >= 3) {
      nextStatus = "REJECTED";
    }

    const lastValidatedAt = nextStatus === "VALIDATED" ? learning.lastValidatedAt || now : learning.lastValidatedAt;

    return {
      ...learning,
      status: nextStatus,
      lastValidatedAt,
      updatedAt: now,
    };
  }
}

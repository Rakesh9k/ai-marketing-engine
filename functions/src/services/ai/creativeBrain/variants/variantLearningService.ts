import type {
  CreativeVariantLearning,
  VariantSelection,
  CreativeContext,
  CreativeVariantStrategy,
  CreativeOutcome,
  PerformanceSignal,
  ID,
} from "../types";

export class VariantLearningService {
  private learningRecords: CreativeVariantLearning[] = [];
  private selections: VariantSelection[] = [];

  /**
   * Records a user or system variant selection.
   */
  public recordSelection(variantId: ID, selectedBy: "USER" | "SYSTEM", reason?: string): VariantSelection {
    const selection: VariantSelection = {
      variantId,
      selectedAt: new Date().toISOString(),
      selectedBy,
      reason,
    };
    this.selections.push(selection);
    return selection;
  }

  /**
   * Records performance outcome for a variant.
   */
  public recordVariantPerformance(
    variantId: ID,
    variantStrategy: CreativeVariantStrategy,
    context: CreativeContext,
    outcome: CreativeOutcome,
    performanceSignals: PerformanceSignal[],
    selectedByUser: boolean
  ): CreativeVariantLearning {
    const record: CreativeVariantLearning = {
      variantId,
      variantStrategy,
      context,
      selected: selectedByUser,
      executed: true,
      outcome,
      performanceSignals,
      qualitativeFeedback: [],
      alternativeExplanations: [],
      confidenceChange: {
        previous: "MODERATE_EVIDENCE",
        next: outcome === "WORKED" ? "STRONG_EVIDENCE" : "WEAK_EVIDENCE",
        reason: `Observed ${outcome} performance signal in context of ${context.business.name}`,
        evidenceIds: [],
      },
    };

    this.learningRecords.push(record);
    return record;
  }

  /**
   * Retrieves recorded learning records.
   */
  public getLearningRecords(): CreativeVariantLearning[] {
    return [...this.learningRecords];
  }
}

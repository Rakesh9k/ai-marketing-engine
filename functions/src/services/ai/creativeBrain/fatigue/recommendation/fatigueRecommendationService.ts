import type {
  CreativeFatigueSignal,
  FatigueRecommendation,
  FatigueIntervention,
} from "../fatigue.types";

export class FatigueRecommendationService {
  /**
   * Generates specific, non-alarmist fatigue recommendations based on active fatigue signals.
   */
  public generateRecommendations(signals: CreativeFatigueSignal[]): FatigueRecommendation[] {
    const recommendations: FatigueRecommendation[] = [];

    for (const signal of signals) {
      if (signal.status === "STRONG" || signal.status === "LIKELY") {
        if (signal.entityType === "MECHANISM") {
          recommendations.push({
            type: "ROTATE_MECHANISM",
            targetEntityId: signal.entityId,
            targetEntityName: signal.entityName,
            suggestedAlternatives: ["Demonstration", "Social Proof", "Customer Story", "Local Identity"],
            reason: `'${signal.entityName}' is showing saturation. Rotating mechanism will refresh strategic appeal.`,
            confidence: signal.confidence,
            priority: signal.status === "STRONG" ? "HIGH" : "MEDIUM",
          });
        } else if (signal.entityType === "HOOK") {
          recommendations.push({
            type: "CHANGE_HOOK",
            targetEntityId: signal.entityId,
            targetEntityName: signal.entityName,
            suggestedAlternatives: ["Customer Situation Problem", "Curiosity Interrupt", "Before/After Hook"],
            reason: `Rhetorical structure of hook '${signal.entityName}' is repeating. Shift framing to increase initial hold rate.`,
            confidence: signal.confidence,
            priority: "MEDIUM",
          });
        } else if (signal.entityType === "VISUAL") {
          recommendations.push({
            type: "CHANGE_VISUAL",
            targetEntityId: signal.entityId,
            targetEntityName: signal.entityName,
            suggestedAlternatives: ["Lifestyle Customer Scene", "Product Demonstration", "Flat Lay Composition"],
            reason: `Visual pattern '${signal.entityName}' is repeated. Use fresh composition.`,
            confidence: signal.confidence,
            priority: "LOW",
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Creates a FatigueIntervention log entry when an intervention is triggered.
   */
  public createIntervention(
    businessId: string,
    tenantId: string | undefined,
    signal: CreativeFatigueSignal,
    recommendedMechanisms: string[],
    selectedMechanismId?: string,
    selectedBy: "MITRA" | "USER" = "USER"
  ): FatigueIntervention {
    return {
      id: `int_${signal.id}_${Date.now()}`,
      businessId,
      tenantId,
      triggerSignalId: signal.id,
      previousMechanismIds: [signal.entityId],
      recommendedMechanismIds: recommendedMechanisms,
      selectedMechanismId,
      selectedBy,
      createdAt: new Date().toISOString(),
    };
  }
}

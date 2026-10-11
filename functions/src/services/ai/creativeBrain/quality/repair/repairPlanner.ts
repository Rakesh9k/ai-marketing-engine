import type {
  QualityWeakness,
  CreativeRepairPlan,
  CreativeRepairAction,
  CreativeQualityDimension} from "../../types";
import {
  CreativeComponent
} from "../../types";

export class QualityRepairPlanner {
  /**
   * Builds a selective repair plan based on diagnosed weaknesses.
   * Invariant: Preserves strategy and unaffected components during normal repairs.
   */
  public createRepairPlan(
    weaknesses: QualityWeakness[],
    policyVersion: string
  ): CreativeRepairPlan {
    const issues: CreativeRepairAction[] = [];
    const targetComponentsSet = new Set<CreativeComponent>();
    const impactedDimensionsSet = new Set<CreativeQualityDimension>();

    for (const w of weaknesses) {
      impactedDimensionsSet.add(w.dimension);
      for (const comp of w.affectedComponents) {
        targetComponentsSet.add(comp);
        issues.push({
          actionId: `act_${w.dimension}_${comp}_${issues.length + 1}`,
          targetComponent: comp,
          issueDescription: w.observation,
          repairInstruction: `Repair ${comp} to resolve ${w.dimension} issue: ${w.observation}`,
          preserveSurroundingContext: true,
        });
      }
    }

    // Determine preserved components (all components NOT targeted for repair)
    const allComponents: CreativeComponent[] = Object.values(CreativeComponent);
    const preservedComponents = allComponents.filter((c) => !targetComponentsSet.has(c));

    let scope: "COMPONENT" | "MULTIPLE_COMPONENTS" | "FULL_CREATIVE" | "RETURN_TO_STRATEGY" = "COMPONENT";
    if (targetComponentsSet.has(CreativeComponent.STRATEGY)) {
      scope = "RETURN_TO_STRATEGY";
    } else if (targetComponentsSet.size > 3) {
      scope = "MULTIPLE_COMPONENTS";
    } else {
      scope = "COMPONENT";
    }

    return {
      repairPlanId: `rep_plan_${Date.now()}`,
      issues,
      preservedComponents,
      regenerationScope: scope,
      reason: `Targeted selective repair for ${targetComponentsSet.size} component(s) addressing ${impactedDimensionsSet.size} dimension weakness(es)`,
      expectedImpact: Array.from(impactedDimensionsSet),
      policyVersion,
    };
  }
}

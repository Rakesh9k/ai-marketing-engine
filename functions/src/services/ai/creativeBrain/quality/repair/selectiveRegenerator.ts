import type {
  FinalCreative,
  CreativeRepairPlan,
  CreativeDirection} from "../../types";
import {
  CreativeComponent
} from "../../types";

export class SelectiveRegenerator {
  /**
   * Regenerates only affected creative components according to repair plan instructions,
   * preserving all approved components and the strategic direction.
   */
  public regenerateSelective(
    creative: FinalCreative,
    repairPlan: CreativeRepairPlan,
    strategy: CreativeDirection
  ): FinalCreative {
    const targetComponents = new Set(repairPlan.issues.map((i) => i.targetComponent));

    const newCopy = { ...creative.copy };

    // 1. Headline Repair
    if (targetComponents.has(CreativeComponent.HEADLINE) || targetComponents.has(CreativeComponent.HOOK)) {
      const coreIdea = (strategy.coreIdea as any)?.statement || (strategy.coreIdea as any)?.shortVersion || (strategy as any).name || "";
      const bizName = (creative as any).businessName || "";
      const prefix = bizName ? `${bizName}: ` : "";

      if (repairPlan.issues.some((i) => i.issueDescription.toLowerCase().includes("generic"))) {
        newCopy.headline = {
          ...newCopy.headline,
          content: `${prefix}${coreIdea} - Authentic & Fresh Daily`,
        };
      } else if (repairPlan.issues.some((i) => i.issueDescription.toLowerCase().includes("verbose"))) {
        newCopy.headline = {
          ...newCopy.headline,
          content: `${prefix}${coreIdea}`,
        };
      } else {
        newCopy.headline = {
          ...newCopy.headline,
          content: `${prefix}${coreIdea} - Order Special Today`,
        };
      }
    }

    // 2. Supporting Copy Repair
    if (targetComponents.has(CreativeComponent.SUPPORTING_COPY)) {
      const stratName = (strategy as any).name || (strategy.coreIdea as any)?.statement || "";
      newCopy.supportingCopy = {
        role: "SUPPORT",
        purpose: "Clarify strategic benefit and offer",
        content: `Enjoy authentic quality prepared fresh for your family. ${stratName}`,
        requiredInformation: [],
        prohibitedClaims: [],
        truthRequirements: [],
      };
    }

    // 3. CTA Repair
    if (targetComponents.has(CreativeComponent.CTA)) {
      const ctaText = (strategy as any).marketingObjective === "CONVERSION" ? "Order Now" : "Book Slot";
      newCopy.cta = {
        role: "CTA",
        purpose: "High-intent direct conversion",
        content: ctaText,
        requiredInformation: [],
        prohibitedClaims: [],
        truthRequirements: [],
      };
    }

    // 4. Offer Copy Repair
    if (targetComponents.has(CreativeComponent.OFFER_COPY)) {
      if (newCopy.offerCopy) {
        newCopy.offerCopy = {
          ...newCopy.offerCopy,
          content: `Special offer: ${newCopy.offerCopy.content}`,
        };
      }
    }

    const newRevision = creative.revision + 1;
    const newVersionId = `${creative.creativeVersionId}_rep_${newRevision}`;

    return {
      ...creative,
      creativeVersionId: newVersionId,
      revision: newRevision,
      copy: newCopy,
      createdAt: new Date().toISOString(),
    };
  }
}

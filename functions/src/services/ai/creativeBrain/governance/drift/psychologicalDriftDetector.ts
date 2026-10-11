import type { GovernanceIssue, CreativeGovernanceInput } from "../../types/governance";

export class PsychologicalDriftDetector {
  /**
   * Detects psychological mechanism drift between Strategy Intent vs Execution.
   * Example:
   * Strategy: Convenience
   * Execution: Fear + false urgency ("Book now or your family misses out!")
   */
  public detectPsychologicalDrift(input: CreativeGovernanceInput): GovernanceIssue[] {
    const issues: GovernanceIssue[] = [];

    const getStr = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.content || "";
    };

    const plannedMechanism = (input.strategy as any).mechanism?.name?.toLowerCase() || input.strategy.creativeMechanism?.primary?.name?.toLowerCase() || "";
    const copyText = [
      getStr(input.copy?.headline),
      getStr((input.copy as any)?.bodyText) || getStr(input.copy?.supportingCopy),
      getStr((input.copy as any)?.primaryCta) || getStr(input.copy?.cta),
    ]
      .join(" ")
      .toLowerCase();

    // If strategy planned non-urgency/non-fear (e.g., Convenience, Value, Identity), but execution copy uses high-pressure fear/urgency
    const plannedLowPressure = plannedMechanism.includes("convenience") || plannedMechanism.includes("value") || plannedMechanism.includes("identity");
    const executedHighPressure = /(?:book now or|miss out|disaster|hurry before|only 2 left|last chance|act fast)/i.test(copyText);

    if (plannedLowPressure && executedHighPressure) {
      issues.push({
        id: `drift_psych_${Date.now()}`,
        gate: "DRIFT",
        code: "PSYCHOLOGICAL_MECHANISM_DRIFT",
        message: `Strategy planned mechanism '${plannedMechanism || "Convenience"}', but copywriter execution mutated framing into high-pressure false urgency/fear`,
        severity: "BLOCKING",
        suggestedCorrection: "Reframe execution copy to align strictly with planned non-coercive mechanism",
      });
    }

    return issues;
  }
}

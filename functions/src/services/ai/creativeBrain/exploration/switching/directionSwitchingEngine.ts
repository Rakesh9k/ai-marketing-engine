import type {
  StrategicDirectionCandidate,
  DirectionSwitchImpact,
  DirectionSelectionResult,
} from "../../types/directions";

export class DirectionSwitchingEngine {
  /**
   * Performs the strategic direction switch, creating versioned state and recalculating impact.
   */
  public executeDirectionSwitch(
    previousActive: StrategicDirectionCandidate,
    selected: StrategicDirectionCandidate,
    allCandidates: StrategicDirectionCandidate[]
  ): DirectionSelectionResult {
    const nextVersion = (previousActive.version || 1) + 1;

    // Calculate decision impact
    const impact: DirectionSwitchImpact = {
      preserved: [
        "Audience Profile Context",
        "Marketing Objective",
        "Business Brain Verified Facts",
        "Offer Structure & Pricing Constraints",
      ],
      regenerated: [
        "Psychological Positioning",
        "Creative Mechanism Selection",
        "Concept Territory",
        "Hook Framing & Copy Structure",
        "Visual Direction & Storytelling",
        "CTA Treatment & Platform Expression",
      ],
      invalidated: [
        `Previous concept '${previousActive.concept}'`,
        `Previous hook territory '${previousActive.hookTerritory}'`,
        `Previous visual direction '${previousActive.visualTerritory}'`,
      ],
      newlyIntroduced: [
        `New Strategic Axis: '${selected.name}'`,
        `New Psychology: '${selected.psychology[0]?.name || selected.name}'`,
        `New Mechanism: '${selected.mechanisms[0]?.name || selected.name}'`,
      ],
    };

    // Update selected candidate state
    const updatedSelected: StrategicDirectionCandidate = {
      ...selected,
      source: "USER_SELECTED",
      status: "ACTIVE",
      version: nextVersion,
    };

    // Update unselected candidates
    allCandidates.forEach((cand) => {
      if (cand.id === previousActive.id) {
        cand.status = "ARCHIVED";
      } else if (cand.id !== selected.id) {
        cand.status = "REJECTED";
      }
    });

    const reasoningTraceId = `trace_switch_${selected.id}_v${nextVersion}_${Date.now()}`;

    return {
      selectedDirection: updatedSelected,
      impact,
      reasoningTraceId,
      version: nextVersion,
    };
  }
}

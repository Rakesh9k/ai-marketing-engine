import type {
  StrategicDirectionCandidate,
  DirectionDifference,
} from "../../types/directions";

export class DirectionDifferenceExplainer {
  /**
   * Explains how an alternative direction strategically differs from the current active direction.
   */
  public explainDifference(
    current: StrategicDirectionCandidate,
    alternative: StrategicDirectionCandidate
  ): DirectionDifference {
    const currentPsych = current.psychology[0]?.name || "Convenience & Effort Reduction";
    const altPsych = alternative.psychology[0]?.name || "Belonging & Emotion";

    const currentMech = current.mechanisms[0]?.name || "Friction Removal";
    const altMech = alternative.mechanisms[0]?.name || "Shared Experience";

    const keyShift = `Shifts the campaign strategy from '${current.name}' (${currentPsych}) to '${alternative.name}' (${altPsych}).`;

    return {
      currentDirection: current.name,
      alternativeDirection: alternative.name,
      keyShift,
      changedPsychology: `From '${currentPsych}' to '${altPsych}'`,
      changedMechanism: `From '${currentMech}' to '${altMech}'`,
      changedEmotionalTerritory: `From '${current.desiredEmotion}' to '${alternative.desiredEmotion}'`,
    };
  }

  /**
   * Annotates candidate directions with explicit difference explanations and tradeoffs.
   */
  public annotateDirectionsWithExplanations(
    current: StrategicDirectionCandidate,
    alternatives: StrategicDirectionCandidate[]
  ): StrategicDirectionCandidate[] {
    return alternatives.map((alt) => {
      const diff = this.explainDifference(current, alt);
      return {
        ...alt,
        whyDifferentFromCurrent: diff.keyShift,
        whyItFits: alt.whyItFits || `Directly leverages ${alt.name} to fulfill campaign objective.`,
      };
    });
  }
}

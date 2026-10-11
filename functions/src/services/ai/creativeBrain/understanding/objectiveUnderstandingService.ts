import type { MarketingObjective } from "../types";

export class ObjectiveUnderstandingService {
  /**
   * Verifies and aligns marketing objective.
   */
  public async understand(objective: MarketingObjective): Promise<MarketingObjective> {
    const validObjectives: MarketingObjective[] = [
      "AWARENESS",
      "CONSIDERATION",
      "CONVERSION",
      "RETENTION",
      "REACTIVATION",
      "LOYALTY",
      "LOCAL_DISCOVERY",
      "ENGAGEMENT",
    ];

    if (!validObjectives.includes(objective)) {
      return "CONVERSION";
    }
    return objective;
  }
}

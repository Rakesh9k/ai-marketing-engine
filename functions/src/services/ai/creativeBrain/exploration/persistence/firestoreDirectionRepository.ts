import type { StrategicDirectionCandidate } from "../../types/directions";

export class FirestoreDirectionRepository {
  private inMemoryActiveDirections: Map<string, StrategicDirectionCandidate> = new Map();
  private inMemoryHistory: Map<string, StrategicDirectionCandidate[]> = new Map();

  /**
   * Saves or updates an active strategic direction.
   */
  public async saveActiveDirection(
    sessionId: string,
    direction: StrategicDirectionCandidate
  ): Promise<void> {
    this.inMemoryActiveDirections.set(sessionId, direction);
    if (direction.campaignId) {
      this.inMemoryActiveDirections.set(`campaign_${direction.campaignId}`, direction);
    }

    const history = this.inMemoryHistory.get(sessionId) || [];
    history.push(direction);
    this.inMemoryHistory.set(sessionId, history);
  }

  /**
   * Retrieves active strategic direction by session ID.
   */
  public async getActiveDirectionBySessionId(
    sessionId: string
  ): Promise<StrategicDirectionCandidate | null> {
    return this.inMemoryActiveDirections.get(sessionId) || null;
  }

  /**
   * Retrieves direction history for a session.
   */
  public async getDirectionHistory(
    sessionId: string
  ): Promise<StrategicDirectionCandidate[]> {
    return this.inMemoryHistory.get(sessionId) || [];
  }

  /**
   * Clears repository state (for testing).
   */
  public clearInMemoryState(): void {
    this.inMemoryActiveDirections.clear();
    this.inMemoryHistory.clear();
  }
}

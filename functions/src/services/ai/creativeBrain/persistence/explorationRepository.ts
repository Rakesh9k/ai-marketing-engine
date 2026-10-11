import * as admin from "firebase-admin";
import type {
  CreativeExplorationDocument,
  CreativeExplorationRepository,
} from "../types";

export class FirestoreCreativeExplorationRepository implements CreativeExplorationRepository {
  private store = new Map<string, CreativeExplorationDocument>();

  public async create(exploration: CreativeExplorationDocument): Promise<void> {
    this.store.set(exploration.explorationId, exploration);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeExplorations")
        .doc(exploration.explorationId)
        .set(exploration, { merge: true });
    } catch {
      // Fallback
    }
  }

  public async list(sessionId: string, revision: number): Promise<CreativeExplorationDocument[]> {
    const results: CreativeExplorationDocument[] = [];
    for (const exp of this.store.values()) {
      if (exp.sessionId === sessionId && exp.revision === revision) {
        results.push(exp);
      }
    }

    if (results.length > 0) return results;
    if (process.env.NODE_ENV === "test") return [];

    try {
      const snapshot = await admin
        .firestore()
        .collection("creativeExplorations")
        .where("sessionId", "==", sessionId)
        .where("revision", "==", revision)
        .get();

      return snapshot.docs.map((d) => d.data() as CreativeExplorationDocument);
    } catch {
      return [];
    }
  }
}

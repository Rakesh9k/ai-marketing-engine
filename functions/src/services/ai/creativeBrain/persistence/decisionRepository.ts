import * as admin from "firebase-admin";
import type {
  StrategicDecisionDocument,
  StrategicDecisionRepository,
} from "../types";

export class FirestoreStrategicDecisionRepository implements StrategicDecisionRepository {
  private store = new Map<string, StrategicDecisionDocument>();

  public async create(decision: StrategicDecisionDocument): Promise<void> {
    this.store.set(decision.decisionId, decision);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("strategicDecisions")
        .doc(decision.decisionId)
        .set(decision, { merge: true });
    } catch {
      // Fallback
    }
  }

  public async getLatest(confirmationId: string): Promise<StrategicDecisionDocument | null> {
    const matches: StrategicDecisionDocument[] = [];
    for (const dec of this.store.values()) {
      if (dec.confirmationId === confirmationId) {
        matches.push(dec);
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return matches[0];
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const snapshot = await admin
        .firestore()
        .collection("strategicDecisions")
        .where("confirmationId", "==", confirmationId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as StrategicDecisionDocument;
    } catch {
      return null;
    }
  }
}

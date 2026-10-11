import * as admin from "firebase-admin";
import type {
  StrategicConfirmationDocument,
  StrategicConfirmationRepository,
} from "../types";

export class FirestoreStrategicConfirmationRepository implements StrategicConfirmationRepository {
  private store = new Map<string, StrategicConfirmationDocument>();

  public async get(sessionId: string, revision: number): Promise<StrategicConfirmationDocument | null> {
    const key = `${sessionId}:${revision}`;
    if (this.store.has(key)) {
      return this.store.get(key)!;
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const snapshot = await admin
        .firestore()
        .collection("strategicConfirmations")
        .where("sessionId", "==", sessionId)
        .where("revision", "==", revision)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0].data() as StrategicConfirmationDocument;
      this.store.set(key, doc);
      return doc;
    } catch {
      return null;
    }
  }

  public async create(confirmation: StrategicConfirmationDocument): Promise<void> {
    const key = `${confirmation.sessionId}:${confirmation.revision}`;
    this.store.set(key, confirmation);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("strategicConfirmations")
        .doc(confirmation.confirmationId)
        .set(confirmation, { merge: true });
    } catch {
      // Fallback
    }
  }

  public async markStale(confirmationId: string, reason: string): Promise<void> {
    for (const [k, conf] of this.store.entries()) {
      if (conf.confirmationId === confirmationId) {
        conf.status = "STALE";
        conf.updatedAt = new Date().toISOString();
        this.store.set(k, conf);
        break;
      }
    }

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("strategicConfirmations")
        .doc(confirmationId)
        .update({
          status: "STALE",
          staleReason: reason,
          updatedAt: new Date().toISOString(),
        });
    } catch {
      // Fallback
    }
  }
}

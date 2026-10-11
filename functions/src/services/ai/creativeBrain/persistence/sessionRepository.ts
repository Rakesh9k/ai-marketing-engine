import * as admin from "firebase-admin";
import type {
  CreativeBrainSessionDocument,
  CreativeBrainSessionRepository,
} from "../types";

export class FirestoreCreativeBrainSessionRepository implements CreativeBrainSessionRepository {
  private store = new Map<string, CreativeBrainSessionDocument>();

  public async get(sessionId: string): Promise<CreativeBrainSessionDocument | null> {
    if (this.store.has(sessionId)) {
      return this.store.get(sessionId)!;
    }

    if (process.env.NODE_ENV === "test") {
      return null;
    }

    try {
      const snapshot = await admin
        .firestore()
        .collection("creativeBrainSessions")
        .doc(sessionId)
        .get();

      if (!snapshot.exists) {
        return null;
      }

      const doc = snapshot.data() as CreativeBrainSessionDocument;
      this.store.set(sessionId, doc);
      return doc;
    } catch {
      return null;
    }
  }

  public async create(document: CreativeBrainSessionDocument): Promise<void> {
    this.store.set(document.sessionId, document);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeBrainSessions")
        .doc(document.sessionId)
        .set(document, { merge: true });
    } catch {
      // In-memory fallback preserved
    }
  }

  public async update(document: CreativeBrainSessionDocument): Promise<void> {
    this.store.set(document.sessionId, document);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeBrainSessions")
        .doc(document.sessionId)
        .set(document, { merge: true });
    } catch {
      // In-memory fallback preserved
    }
  }
}

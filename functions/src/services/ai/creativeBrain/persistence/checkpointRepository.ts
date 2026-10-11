import * as admin from "firebase-admin";
import type {
  CreativeBrainCheckpointDocument,
  CreativeBrainCheckpointRepository,
} from "../types";

export class FirestoreCreativeBrainCheckpointRepository implements CreativeBrainCheckpointRepository {
  private store = new Map<string, CreativeBrainCheckpointDocument>();

  public async save(checkpoint: CreativeBrainCheckpointDocument): Promise<void> {
    const key = `${checkpoint.sessionId}:${checkpoint.revision}:${checkpoint.state}`;
    this.store.set(key, checkpoint);

    if (process.env.NODE_ENV === "test") return;

    try {
      const docId = `chk_${checkpoint.sessionId}_${checkpoint.revision}_${checkpoint.state}`;
      await admin
        .firestore()
        .collection("creativeBrainCheckpoints")
        .doc(docId)
        .set(checkpoint, { merge: true });
    } catch {
      // Fallback
    }
  }

  public async getLatest(sessionId: string, revision: number): Promise<CreativeBrainCheckpointDocument | null> {
    for (const [, chk] of this.store.entries()) {
      if (chk.sessionId === sessionId && chk.revision === revision) {
        return chk;
      }
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const snapshot = await admin
        .firestore()
        .collection("creativeBrainCheckpoints")
        .where("sessionId", "==", sessionId)
        .where("revision", "==", revision)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as CreativeBrainCheckpointDocument;
    } catch {
      return null;
    }
  }
}

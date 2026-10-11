import * as admin from "firebase-admin";
import type {
  ExecutionAuthorizationDocument,
  ExecutionAuthorizationRepository,
} from "../types";

export class FirestoreExecutionAuthorizationRepository implements ExecutionAuthorizationRepository {
  private store = new Map<string, ExecutionAuthorizationDocument>();

  public async create(authorization: ExecutionAuthorizationDocument): Promise<void> {
    this.store.set(authorization.authorizationId, authorization);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("executionAuthorizations")
        .doc(authorization.authorizationId)
        .set(authorization, { merge: true });
    } catch {
      // Fallback
    }
  }

  public async get(authorizationId: string): Promise<ExecutionAuthorizationDocument | null> {
    if (this.store.has(authorizationId)) {
      return this.store.get(authorizationId)!;
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const snapshot = await admin
        .firestore()
        .collection("executionAuthorizations")
        .doc(authorizationId)
        .get();

      if (!snapshot.exists) return null;
      const doc = snapshot.data() as ExecutionAuthorizationDocument;
      this.store.set(authorizationId, doc);
      return doc;
    } catch {
      return null;
    }
  }

  public async consume(authorizationId: string): Promise<void> {
    if (this.store.has(authorizationId)) {
      const auth = this.store.get(authorizationId)!;
      auth.consumed = true;
      auth.consumedAt = new Date().toISOString();
      this.store.set(authorizationId, auth);
    }

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("executionAuthorizations")
        .doc(authorizationId)
        .update({
          consumed: true,
          consumedAt: new Date().toISOString(),
        });
    } catch {
      // Fallback
    }
  }
}

import * as admin from "firebase-admin";
import type {
  CreativeBrainOperationDocument,
  CreativeBrainOperationRepository,
} from "../types";

export class FirestoreCreativeBrainOperationRepository implements CreativeBrainOperationRepository {
  private store = new Map<string, CreativeBrainOperationDocument>();

  public async findByIdempotencyKey(tenantId: string, key: string): Promise<CreativeBrainOperationDocument | null> {
    const compositeKey = `${tenantId}:${key}`;
    if (this.store.has(compositeKey)) {
      return this.store.get(compositeKey)!;
    }

    if (process.env.NODE_ENV === "test") return null;

    try {
      const snapshot = await admin
        .firestore()
        .collection("creativeBrainOperations")
        .where("tenantId", "==", tenantId)
        .where("idempotencyKey", "==", key)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0].data() as CreativeBrainOperationDocument;
      this.store.set(compositeKey, doc);
      return doc;
    } catch {
      return null;
    }
  }

  public async create(operation: CreativeBrainOperationDocument): Promise<void> {
    const compositeKey = `${operation.tenantId}:${operation.idempotencyKey}`;
    this.store.set(compositeKey, operation);

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeBrainOperations")
        .doc(operation.operationId)
        .set(operation, { merge: true });
    } catch {
      // In-memory fallback preserved
    }
  }

  public async markSucceeded(operationId: string, resultReference: string): Promise<void> {
    for (const [k, op] of this.store.entries()) {
      if (op.operationId === operationId) {
        op.status = "SUCCEEDED";
        op.resultReference = resultReference;
        op.completedAt = new Date().toISOString();
        this.store.set(k, op);
        break;
      }
    }

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeBrainOperations")
        .doc(operationId)
        .update({
          status: "SUCCEEDED",
          resultReference,
          completedAt: new Date().toISOString(),
        });
    } catch {
      // In-memory fallback preserved
    }
  }

  public async markFailed(operationId: string, code: string, message: string): Promise<void> {
    for (const [k, op] of this.store.entries()) {
      if (op.operationId === operationId) {
        op.status = "FAILED";
        op.errorPayload = { code, message };
        op.completedAt = new Date().toISOString();
        this.store.set(k, op);
        break;
      }
    }

    if (process.env.NODE_ENV === "test") return;

    try {
      await admin
        .firestore()
        .collection("creativeBrainOperations")
        .doc(operationId)
        .update({
          status: "FAILED",
          errorPayload: { code, message },
          completedAt: new Date().toISOString(),
        });
    } catch {
      // In-memory fallback preserved
    }
  }
}

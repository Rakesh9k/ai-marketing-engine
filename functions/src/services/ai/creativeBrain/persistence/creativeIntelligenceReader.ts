import * as admin from "firebase-admin";
import type {
  CreativeIntelligenceReader,
  CreativeOpportunity,
  CreativeMechanismReference,
  PsychologyReference,
} from "../types";

export class FirestoreCreativeIntelligenceReader implements CreativeIntelligenceReader {
  public async getOpportunity(id: string): Promise<CreativeOpportunity | null> {
    try {
      const snap = await admin.firestore().collection("creativeOpportunities").doc(id).get();
      return snap.exists ? (snap.data() as CreativeOpportunity) : null;
    } catch {
      return null;
    }
  }

  public async getMechanism(id: string): Promise<CreativeMechanismReference | null> {
    try {
      const snap = await admin.firestore().collection("creativeMechanisms").doc(id).get();
      return snap.exists ? (snap.data() as CreativeMechanismReference) : null;
    } catch {
      return null;
    }
  }

  public async getPsychology(id: string): Promise<PsychologyReference | null> {
    try {
      const snap = await admin.firestore().collection("psychologyBank").doc(id).get();
      return snap.exists ? (snap.data() as PsychologyReference) : null;
    } catch {
      return null;
    }
  }
}

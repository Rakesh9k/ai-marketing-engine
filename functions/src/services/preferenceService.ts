import { getFirestore } from 'firebase-admin/firestore';
import type {
  CreativeFeedback,
  CreativePreference,
  CreativePreferenceState,
  CreativePreferenceSource,
} from '../types';

/**
 * Deterministically aggregates template preferences from feedback events.
 * Operates in a Firestore transaction to ensure concurrency safety.
 */
export async function updateCreativePreferences(feedback: CreativeFeedback): Promise<void> {
  // We only track template preferences right now
  if (!feedback.templateId) {
    return;
  }

  const db = getFirestore();
  const businessId = feedback.businessId;
  const templateId = feedback.templateId;

  // Use a predictable document ID for idempotency and quick lookup
  // A business has one preference record per template.
  const preferenceDocId = `${businessId}_${templateId}`;

  const preferenceRef = db.collection('creative_preferences').doc(preferenceDocId);

  await db.runTransaction(async (transaction) => {
    const prefDoc = await transaction.get(preferenceRef);
    const now = new Date().toISOString();

    let preferenceState: CreativePreferenceState = 'none';
    let source: CreativePreferenceSource = 'approval';
    let pos = 0;
    let neg = 0;
    let totalEvidence = 0;

    if (prefDoc.exists) {
      const data = prefDoc.data() as CreativePreference;
      pos = data.positiveEvidenceCount || 0;
      neg = data.negativeEvidenceCount || 0;
      totalEvidence = data.evidenceCount || 0;
    }

    // Process new feedback
    if (feedback.sentiment === 'positive') {
      pos += 1;
      source = 'approval';
    } else if (feedback.sentiment === 'negative') {
      neg += 1;
      source = 'rejection';
    }
    totalEvidence += 1;

    // Deterministic threshold logic for preference
    const netScore = pos - neg;

    // Establishing a preference requires a net score of at least 2.
    // Losing a preference happens if the net score drops to 0 or below,
    // providing basic hysteresis.
    if (netScore >= 2) {
      preferenceState = 'preferred';
      source = 'approval';
    } else if (netScore <= -2) {
      preferenceState = 'avoided';
      source = 'rejection';
    } else {
      preferenceState = 'none';
      // If we dropped out of preferred/avoided, the 'source' reflects the latest feedback direction
    }

    // Calculate bounded confidence (0.0 to 1.0)
    // Here we define confidence purely on total evidence volume (e.g. 10 interactions = 1.0)
    // and the magnitude of the net score.
    // Formula: min(1, absolute(netScore) / 5) * min(1, totalEvidence / 10)
    // A netScore of 5 with 10 interactions gives 1.0 confidence.
    const scoreFactor = Math.min(1.0, Math.abs(netScore) / 5);
    const volumeFactor = Math.min(1.0, totalEvidence / 10);
    let confidence = scoreFactor * volumeFactor;

    // Ensure confidence is bounded and clean
    confidence = Math.max(0, Math.min(1, confidence));
    if (isNaN(confidence)) confidence = 0;

    const newPreference: CreativePreference = {
      preferenceId: preferenceDocId,
      businessId,
      templateId,
      preference: preferenceState,
      confidence,
      evidenceCount: totalEvidence,
      positiveEvidenceCount: pos,
      negativeEvidenceCount: neg,
      source,
      createdAt: prefDoc.exists ? (prefDoc.data() as CreativePreference).createdAt : now,
      updatedAt: now,
    };

    transaction.set(preferenceRef, newPreference, { merge: true });
  });
}

/**
 * PHASE 21 — User Creative Preference Signal Engine
 * Extracts preferences, aversions, and behavioral patterns from user edits, approvals,
 * and rejections with calibrated confidence scores (preventing single-edit overgeneralization).
 */

import type { CanonicalCreativeMemory, CreativePreferenceSignal } from './canonicalMemory.types';

export class PreferenceSignalEngine {
  /**
   * Extracts user creative preference signals from structured memories.
   */
  public extractSignals(memories: CanonicalCreativeMemory[]): CreativePreferenceSignal[] {
    if (!memories || memories.length === 0) {
      return [];
    }

    const preferenceCounts = new Map<string, { subject: string; type: CreativePreferenceSignal['signalType']; campaignIds: string[]; lastDate: string }>();

    memories.forEach((mem) => {
      // 1. Process User Edits
      if (mem.userBehavior.userEdits && mem.userBehavior.userEdits.length > 0) {
        mem.userBehavior.userEdits.forEach((edit) => {
          const key = `PREFERENCE:${edit.component}:${edit.after || 'Custom'}`;
          const existing = preferenceCounts.get(key) || {
            subject: `Prefers ${edit.component.toLowerCase()} customization: ${edit.after || edit.reason || 'specific edit'}`,
            type: 'PREFERENCE' as const,
            campaignIds: [],
            lastDate: mem.createdAt,
          };
          if (!existing.campaignIds.includes(mem.campaignId)) {
            existing.campaignIds.push(mem.campaignId);
          }
          preferenceCounts.set(key, existing);
        });
      }

      // 2. Process Concept Approvals
      if (mem.userBehavior.approved && mem.strategic.creativeMechanism) {
        const key = `SUCCESS:${mem.strategic.creativeMechanism}`;
        const existing = preferenceCounts.get(key) || {
          subject: `Approved mechanism: ${mem.strategic.creativeMechanism}`,
          type: 'SUCCESS' as const,
          campaignIds: [],
          lastDate: mem.createdAt,
        };
        if (!existing.campaignIds.includes(mem.campaignId)) {
          existing.campaignIds.push(mem.campaignId);
        }
        preferenceCounts.set(key, existing);
      }

      // 3. Process Rejections
      if (mem.userBehavior.rejected && mem.strategic.creativeMechanism) {
        const key = `AVERSION:${mem.strategic.creativeMechanism}`;
        const existing = preferenceCounts.get(key) || {
          subject: `Rejected mechanism: ${mem.strategic.creativeMechanism}`,
          type: 'AVERSION' as const,
          campaignIds: [],
          lastDate: mem.createdAt,
        };
        if (!existing.campaignIds.includes(mem.campaignId)) {
          existing.campaignIds.push(mem.campaignId);
        }
        preferenceCounts.set(key, existing);
      }
    });

    const signals: CreativePreferenceSignal[] = [];

    preferenceCounts.forEach((val) => {
      const evidenceCount = val.campaignIds.length;
      const confidence = this.calculateConfidence(evidenceCount);

      signals.push({
        signalType: val.type,
        subject: val.subject,
        evidenceCount,
        confidence,
        lastObservedAt: val.lastDate,
        sourceCampaignIds: val.campaignIds,
      });
    });

    return signals;
  }

  /**
   * Calculates confidence (0.0 to 1.0) based on evidence count.
   * Enforces Section 11 anti-overgeneralization scaling.
   */
  private calculateConfidence(evidenceCount: number): number {
    if (evidenceCount <= 1) return 0.28;
    if (evidenceCount === 2) return 0.48;
    if (evidenceCount === 3) return 0.65;
    if (evidenceCount === 4) return 0.76;
    return 0.85;
  }
}

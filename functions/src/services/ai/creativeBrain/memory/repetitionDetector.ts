/**
 * PHASE 21 — Creative Repetition & Fatigue Detector
 * Analyzes campaign memory history to detect repeated hooks, mechanisms, visual styles,
 * tones, and offers, assessing fatigue risk (LOW, MEDIUM, HIGH).
 */

import type { CanonicalCreativeMemory, CreativeRepetitionSignal } from './canonicalMemory.types';

export class RepetitionDetector {
  /**
   * Scans a tenant's historical campaign memories and extracts creative repetition signals.
   */
  public detectRepetitions(memories: CanonicalCreativeMemory[]): CreativeRepetitionSignal[] {
    if (!memories || memories.length === 0) {
      return [];
    }

    // Sort memories chronologically (newest first)
    const sorted = [...memories].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const signals: CreativeRepetitionSignal[] = [];

    // 1. Hook Pattern Repetition
    const hookSignal = this.analyzePattern(
      sorted,
      'HOOK',
      (m) => m.creative.hookPattern || m.strategic.creativeMechanism
    );
    if (hookSignal) signals.push(hookSignal);

    // 2. Creative Mechanism Repetition
    const mechanismSignal = this.analyzePattern(
      sorted,
      'MECHANISM',
      (m) => m.strategic.creativeMechanism
    );
    if (mechanismSignal) signals.push(mechanismSignal);

    // 3. Visual Style Repetition
    const visualSignal = this.analyzePattern(
      sorted,
      'VISUAL',
      (m) => m.creative.visualStyle || m.creative.visualMechanism
    );
    if (visualSignal) signals.push(visualSignal);

    // 4. Offer Role Repetition
    const offerSignal = this.analyzePattern(
      sorted,
      'OFFER',
      (m) => m.commercial.offerType || m.commercial.offerRole
    );
    if (offerSignal) signals.push(offerSignal);

    // 5. Tone Repetition
    const toneSignal = this.analyzePattern(
      sorted,
      'TONE',
      (m) => m.creative.tone
    );
    if (toneSignal) signals.push(toneSignal);

    return signals;
  }

  private analyzePattern(
    memories: CanonicalCreativeMemory[],
    patternType: CreativeRepetitionSignal['patternType'],
    extractor: (m: CanonicalCreativeMemory) => string | undefined
  ): CreativeRepetitionSignal | null {
    const values = memories.map(extractor).filter((v): v is string => Boolean(v));
    if (values.length === 0) return null;

    const latestValue = values[0];
    let occurrenceCount = 0;
    let consecutiveOccurrences = 0;
    let countingConsecutive = true;

    values.forEach((v) => {
      if (v === latestValue) {
        occurrenceCount++;
        if (countingConsecutive) {
          consecutiveOccurrences++;
        }
      } else {
        countingConsecutive = false;
      }
    });

    let fatigueRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (consecutiveOccurrences >= 3 || occurrenceCount >= 4) {
      fatigueRisk = 'HIGH';
    } else if (consecutiveOccurrences === 2) {
      fatigueRisk = 'MEDIUM';
    }

    return {
      patternType,
      pattern: latestValue,
      occurrenceCount,
      consecutiveOccurrences,
      lastUsedAt: memories[0].createdAt,
      fatigueRisk,
    };
  }
}

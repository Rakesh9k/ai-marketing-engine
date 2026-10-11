/**
 * PHASE 22 — Creative Preference Engine
 * Processes behavior events, semantic edits, comparative choices, and explicit preferences
 * into calibrated, confidence-weighted creative preference signals.
 */

import type {
  CreativeBehaviorEvent,
  ExplicitCreativePreference,
  CreativePreferenceOverride,
} from './behavior.types';
import { SemanticEditAnalyzer } from './semanticEditAnalyzer';

export interface EvaluatedPreferenceSignal {
  dimension: string;
  preferredValue: string;
  disfavoredValue?: string;
  positiveEvidence: number;
  negativeEvidence: number;
  confidence: number; // 0.0 to 1.0
  source: 'EXPLICIT' | 'IMPLICIT';
  lastObservedAt: string;
}

export class PreferenceEngine {
  private readonly semanticAnalyzer: SemanticEditAnalyzer;

  constructor(semanticAnalyzer?: SemanticEditAnalyzer) {
    this.semanticAnalyzer = semanticAnalyzer || new SemanticEditAnalyzer();
  }

  /**
   * Processes behavior events and explicit preferences for a business and returns preference signals.
   */
  public evaluatePreferences(
    events: CreativeBehaviorEvent[],
    explicits: ExplicitCreativePreference[] = [],
    overrides: CreativePreferenceOverride[] = []
  ): EvaluatedPreferenceSignal[] {
    const signalsMap = new Map<string, EvaluatedPreferenceSignal>();

    // 1. Process Explicit Preferences First (Confidence = 1.0)
    explicits.forEach((exp) => {
      const key = `${exp.dimension}:${exp.value}`;
      signalsMap.set(key, {
        dimension: exp.dimension,
        preferredValue: exp.polarity === 'PREFERRED' ? exp.value : '',
        disfavoredValue: exp.polarity === 'DISFAVORED' ? exp.value : '',
        positiveEvidence: exp.polarity === 'PREFERRED' ? 5 : 0,
        negativeEvidence: exp.polarity === 'DISFAVORED' ? 5 : 0,
        confidence: 1.0, // Explicit statement = 1.0 confidence!
        source: 'EXPLICIT',
        lastObservedAt: exp.createdAt,
      });
    });

    // 2. Process Behavior Events
    events.forEach((evt) => {
      if (evt.metadata?.ignoredForPreference) return; // Skip failed actions

      // A. Concept Selections & Comparative Choice Signals
      if (evt.eventType === 'CONCEPT_SELECTED' && evt.fingerprint) {
        const fp = evt.fingerprint;
        if (fp.creativeMechanism) {
          this.accumulateSignal(signalsMap, 'MECHANISM', fp.creativeMechanism, true, evt.createdAt);
        }
        if (fp.hookType || fp.hookPattern) {
          this.accumulateSignal(signalsMap, 'HOOK', fp.hookPattern || fp.hookType || 'Conversational', true, evt.createdAt);
        }
        if (fp.tone) {
          this.accumulateSignal(signalsMap, 'TONE', fp.tone, true, evt.createdAt);
        }
        if (fp.visualStyle) {
          this.accumulateSignal(signalsMap, 'VISUAL', fp.visualStyle, true, evt.createdAt);
        }
      }

      // B. Concept Rejections
      if (evt.eventType === 'CONCEPT_REJECTED' && evt.fingerprint) {
        const fp = evt.fingerprint;
        if (fp.creativeMechanism) {
          this.accumulateSignal(signalsMap, 'MECHANISM', fp.creativeMechanism, false, evt.createdAt);
        }
      }

      // C. User Edits (Semantic Analysis)
      if (evt.eventType.includes('EDITED')) {
        const component = evt.targetType;
        const classification = this.semanticAnalyzer.analyzeEdit(component, evt.beforeValue, evt.afterValue);

        this.accumulateSignal(signalsMap, component, classification.afterCategory, true, evt.createdAt);
        this.accumulateSignal(signalsMap, component, classification.beforeCategory, false, evt.createdAt);
      }

      // D. Targeted Regenerations (Visual / Hook Dissatisfaction)
      if (evt.eventType === 'VISUAL_REGENERATED' || evt.eventType === 'HOOK_REGENERATED') {
        const component = evt.eventType === 'VISUAL_REGENERATED' ? 'VISUAL' : 'HOOK';
        const val = evt.fingerprint?.visualStyle || evt.fingerprint?.hookPattern || 'Offer-First';
        this.accumulateSignal(signalsMap, component, val, false, evt.createdAt);
      }
    });

    // 3. Apply Overrides
    overrides.forEach((ov) => {
      if (ov.mode === 'IGNORE_LEARNED_SIGNAL') {
        const keyPrefix = `${ov.dimension}:`;
        Array.from(signalsMap.keys()).forEach((k) => {
          if (k.startsWith(keyPrefix)) signalsMap.delete(k);
        });
      }
    });

    return Array.from(signalsMap.values());
  }

  private accumulateSignal(
    signalsMap: Map<string, EvaluatedPreferenceSignal>,
    dimension: string,
    value: string,
    isPositive: boolean,
    timestamp: string
  ): void {
    if (!value) return;

    const key = `${dimension}:${value}`;
    const existing = signalsMap.get(key) || {
      dimension,
      preferredValue: isPositive ? value : '',
      disfavoredValue: !isPositive ? value : '',
      positiveEvidence: 0,
      negativeEvidence: 0,
      confidence: 0.28,
      source: 'IMPLICIT',
      lastObservedAt: timestamp,
    };

    if (existing.source === 'EXPLICIT') return; // Explicit outranks implicit

    if (isPositive) {
      existing.positiveEvidence += 1;
      existing.preferredValue = value;
    } else {
      existing.negativeEvidence += 1;
      existing.disfavoredValue = value;
    }

    const totalEv = existing.positiveEvidence + existing.negativeEvidence;
    existing.confidence = this.calculateConfidence(totalEv, existing.positiveEvidence, existing.negativeEvidence);
    existing.lastObservedAt = timestamp;

    signalsMap.set(key, existing);
  }

  private calculateConfidence(total: number, pos: number, neg: number): number {
    if (total <= 1) return 0.28;
    const ratio = Math.abs(pos - neg) / total;
    if (total === 2) return Math.min(0.50, 0.35 + ratio * 0.15);
    if (total === 3) return Math.min(0.68, 0.45 + ratio * 0.23);
    if (total >= 5) return Math.min(0.88, 0.60 + ratio * 0.28);
    return 0.60;
  }
}

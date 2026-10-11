import type { InsightPattern } from './ontology/insight-pattern';
import { InsightPatternSchema, INSIGHT_CATEGORIES, INSIGHT_OUTCOME_KINDS } from './ontology/insight-pattern';

/**
 * Service utilities for working with Insight Patterns.
 * Provides helpers to retrieve taxonomy values and validate instances.
 */
export class InsightPatternService {
  /** Returns the allowed insight categories as a string array. */
  static getCategories(): readonly (typeof INSIGHT_CATEGORIES)[number][] {
    return INSIGHT_CATEGORIES;
  }

  /** Returns the allowed outcome kinds (e.g., functional, emotional). */
  static getOutcomeKinds(): readonly (typeof INSIGHT_OUTCOME_KINDS)[number][] {
    return INSIGHT_OUTCOME_KINDS;
  }

  /** Validates a raw object against the InsightPattern schema.
   *  Returns the parsed InsightPattern on success or throws the zod error.
   */
  static parse(raw: unknown): InsightPattern {
    const result = InsightPatternSchema.safeParse(raw);
    if (!result.success) {
      // Re‑throw with a helpful message preserving the original errors.
      throw new Error(`InsightPattern validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  /** Convenience method to check whether a given category string is valid. */
  static isValidCategory(cat: string): cat is (typeof INSIGHT_CATEGORIES)[number] {
    return (INSIGHT_CATEGORIES as readonly string[]).includes(cat);
  }

  /** Convenience method to check whether an outcome kind is valid. */
  static isValidOutcomeKind(kind: string): kind is (typeof INSIGHT_OUTCOME_KINDS)[number] {
    return (INSIGHT_OUTCOME_KINDS as readonly string[]).includes(kind);
  }
}

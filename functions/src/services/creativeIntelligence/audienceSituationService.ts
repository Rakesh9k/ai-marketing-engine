// AudienceSituationService – utilities for the Audience Situation entity (Phase 10.5)
import {
  AudienceSituationSchema,
  AudienceSituationCategorySchema,
  DecisionWindowSchema,
} from './ontology/audience-situation';

/**
 * Service exposing static helpers for the AudienceSituation ontology type.
 * Mirrors the pattern used by InsightPatternService.
 */
export class AudienceSituationService {
  /** Return the list of allowed taxonomy categories. */
  static getCategories(): string[] {
    return (AudienceSituationCategorySchema as any).options.map((c: any) => String(c));
  }

  /** Return the list of supported decision‑window values. */
  static getDecisionWindows(): string[] {
    return (DecisionWindowSchema as any).options.map((w: any) => String(w));
  }

  /** Validate and parse a raw object into an AudienceSituation. */
  static parse(input: unknown) {
    return AudienceSituationSchema.parse(input);
  }

  /** Simple boolean validation – returns true if the input conforms to the schema. */
  static isValid(input: unknown): boolean {
    return AudienceSituationSchema.safeParse(input).success;
  }
}

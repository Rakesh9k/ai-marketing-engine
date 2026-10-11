// HookPatternService – utilities for HookPattern entity (Phase 10.6)
import {
  HookPatternSchema,
  HookCategorySchema,
} from './ontology/hook-pattern';

/**
 * Service exposing helpers for the HookPattern ontology type.
 * Mirrors the pattern used for InsightPatternService.
 */
export class HookPatternService {
  /** Return the list of allowed hook categories. */
  static getCategories(): string[] {
    return (HookCategorySchema as any).options.map((c: any) => String(c));
  }

  /** Return the list of defined variable types. */
  static getVariableTypes(): string[] {
    return [
      'AUDIENCE',
      'LOCATION',
      'SITUATION',
      'PROBLEM',
      'TENSION',
      'DESIRE',
      'PRODUCT',
      'INSIGHT',
      'UNEXPECTED_TRUTH',
      'PROOF',
      'OFFER',
    ];
  }

  /** Validate and parse a raw object into a HookPattern. */
  static parse(input: unknown) {
    return HookPatternSchema.parse(input);
  }

  /** Simple boolean validation – returns true if the input conforms to the schema. */
  static isValid(input: unknown): boolean {
    return HookPatternSchema.safeParse(input).success;
  }
}

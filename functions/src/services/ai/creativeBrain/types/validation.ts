import type { CombinationValidation } from "./combinations";
import type { CompositionCoherence } from "./directions";
import type { CreativeWarning } from "./composition";

export { CreativeWarning };

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
  component?: string;
  field?: string;
  source?: string;
  resolution?: string;
}

export interface CompositionValidation {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  combinationValidation: CombinationValidation;
  coherence: CompositionCoherence;
  truthValid: boolean;
  ethicsValid: boolean;
  capabilityValid: boolean;
}

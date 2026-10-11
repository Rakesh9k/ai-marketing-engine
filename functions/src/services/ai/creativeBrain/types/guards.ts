import type {
  CreativeCompositionResult,
  CreativeCompositionSuccess,
  CreativeCompositionFailure,
  CreativeCompositionClarification
} from "./composition";

import type { CreativeExecutionInput } from "./service";
import type { BusinessContext } from "./business";

/**
 * Type guard for successful composition result.
 */
export function isCreativeCompositionSuccess(
  result: CreativeCompositionResult
): result is CreativeCompositionSuccess {
  return result.status === "SUCCESS";
}

/**
 * Type guard for composition failure.
 */
export function isCreativeCompositionFailure(
  result: CreativeCompositionResult
): result is CreativeCompositionFailure {
  return result.status === "FAILED";
}

/**
 * Type guard for clarification required state.
 */
export function requiresUserClarification(
  result: CreativeCompositionResult
): result is CreativeCompositionClarification {
  return result.status === "CLARIFICATION_REQUIRED";
}

/**
 * Safely converts a successful CreativeCompositionSuccess result and authoritative BusinessContext into execution input.
 */
export function toExecutionInput(
  result: CreativeCompositionSuccess,
  business: BusinessContext
): CreativeExecutionInput {
  return {
    direction: result.direction,
    business,
    platform: result.direction.platform.platform,
    format: result.direction.platform.format,
    constraints: result.direction.constraints,
  };
}

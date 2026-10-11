// Creative Composition Policy (Phase 10.18)
// Exported constant defining weights, component limits, and adaptation rules.
// This file follows the specification in the Phase 10.18 addendum.

export const CreativeCompositionPolicy_v1 = {
  // Coherence weight breakdown (total 100)
  weights: {
    strategic: 20,
    psychological: 15,
    narrative: 15,
    offer: 10,
    visual: 10,
    behavioral: 10,
    platform: 10,
    brand: 10,
  },
  // Component limits per role taxonomy
  componentLimits: {
    CORE: { min: 1, max: 1 }, // exactly one core idea
    PRIMARY: { min: 1, max: 3 },
    SUPPORTING: { min: 0, max: 5 },
    OPTIONAL: { min: 0, max: 5 },
    CONSTRAINT: { min: 0, max: 3 },
  },
  // Minimum confidence required for each role (0-1 scale)
  confidenceThresholds: {
    CORE: 0.8,
    PRIMARY: 0.6,
    SUPPORTING: 0.5,
    OPTIONAL: 0.4,
    CONSTRAINT: 0.7,
  },
  // Adaptation rules placeholder – concrete logic lives in the composer service.
  adaptationRules: {
    // Example: if platform is Instagram and visual type is 'carousel', adapt to 'single-image'
    instagramCarouselToSingle: true,
  },
  // Policy version identifier (used for persistence and debugging)
  policyVersion: "CreativeCompositionPolicy_v1",
};

// Export error codes specific to the composer
export const CreativeCompositionErrorCodes = {
  COMPOSER_INVALID_INPUT: "COMPOSER_INVALID_INPUT",
  COMPOSER_CONTEXT_PARSE_FAILED: "COMPOSER_CONTEXT_PARSE_FAILED",
  COMPOSER_RETRIEVAL_FAILED: "COMPOSER_RETRIEVAL_FAILED",
  COMPOSER_SCORING_FAILED: "COMPOSER_SCORING_FAILED",
  COMPOSER_COMBINATION_VALIDATION_FAILED: "COMPOSER_COMBINATION_VALIDATION_FAILED",
  COMPOSER_COHERENCE_EVALUATION_FAILED: "COMPOSER_COHERENCE_EVALUATION_FAILED",
  COMPOSER_ADAPTATION_FAILED: "COMPOSER_ADAPTATION_FAILED",
  COMPOSER_POLICY_ERROR: "COMPOSER_POLICY_ERROR",
  COMPOSER_DEPENDENCY_UNAVAILABLE: "COMPOSER_DEPENDENCY_UNAVAILABLE",
  COMPOSER_UNEXPECTED_ERROR: "COMPOSER_UNEXPECTED_ERROR",
};

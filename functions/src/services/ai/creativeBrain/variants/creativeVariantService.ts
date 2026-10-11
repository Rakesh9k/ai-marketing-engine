import type {
  CreativeDirection,
  CreativeVariant,
  CreativeVariantGenerationInput,
  CreativeVariantGenerationResult,
  VariantSelectionPolicy,
  CreativeVariantExplanation,
  CreativeVariantComparison,
  VariantDimension,
} from "../types";

import { VariantStrategyService } from "./variantStrategyService";
import { VariantScoringService } from "./variantScoringService";
import { VariantDistinctivenessService } from "./variantDistinctivenessService";
import { VariantValidationService } from "./variantValidationService";
import { VariantSelectionService } from "./variantSelectionService";

export class CreativeVariantService {
  private strategyService = new VariantStrategyService();
  private scoringService = new VariantScoringService();
  private distinctivenessService = new VariantDistinctivenessService();
  private validationService = new VariantValidationService();
  private selectionService = new VariantSelectionService();

  /**
   * Main entry point to generate strategically distinct creative variants for a given base direction.
   */
  public async generate(
    input: CreativeVariantGenerationInput
  ): Promise<CreativeVariantGenerationResult> {
    const { direction, context, requestedCount = 3, preferredStrategies, excludedStrategies, constraints, policy } = input;

    // Default Policy
    const effectivePolicy: VariantSelectionPolicy = policy || {
      requestedCount,
      minimumCount: 2,
      maximumCount: Math.min(4, Math.max(2, requestedCount)),
      requireStrategicDifference: true,
      minimumDistinctivenessScore: 60,
      allowSamePsychology: false,
      allowSameMechanism: false,
      allowSameStory: true,
      allowSameStyle: true,
      policyVersion: 1,
      preferredStrategies,
    };

    // 1. Context validation check
    if (!context || !context.business || !context.objective) {
      return {
        status: "FAILED",
        code: "VARIANT_INVALID_INPUT",
        message: "Missing mandatory context or business specification.",
        recoverable: false,
        retryable: false,
        recovery: {
          recoverable: false,
          retryable: false,
          userActionRequired: true,
          upstreamActionRequired: true,
          suggestedNextActions: [],
          blockedComponents: ["CONTEXT"],
          blockingFields: ["context.business"],
        },
        nextAction: "RETURN_ERROR",
      };
    }

    // 2. Retrieve candidate strategies
    const candidateStrategies = this.strategyService.getCandidateStrategies({
      context,
      direction,
      preferredStrategies,
      excludedStrategies,
      constraints,
    });

    if (candidateStrategies.length === 0) {
      return {
        status: "FAILED",
        code: "VARIANT_STRATEGY_GENERATION_FAILED",
        message: "No compatible strategies found for current campaign context.",
        recoverable: true,
        retryable: true,
        recovery: {
          recoverable: true,
          retryable: true,
          userActionRequired: true,
          upstreamActionRequired: false,
          suggestedNextActions: [],
          blockedComponents: ["STRATEGY"],
          blockingFields: [],
        },
        nextAction: "RETRY",
      };
    }

    // 3. Mutate strategic frames & generate variant candidates
    const validVariants: CreativeVariant[] = [];
    const rejectedCandidates: Array<{ candidateId: string; candidateType: "OPPORTUNITY" | "RECIPE" | "MECHANISM" | "COMPOSITION"; reasons: Array<{ code: string; reason: string; severity: "HARD" | "SOFT"; source: string }>; potentiallyRecoverable: boolean }> = [];

    for (let i = 0; i < candidateStrategies.length; i++) {
      const stratRef = candidateStrategies[i];
      const frame = this.strategyService.buildStrategicFrame(stratRef.strategy, direction, context);

      // Deep copy direction to mutate while keeping campaign invariants
      const variantDirection: CreativeDirection = JSON.parse(JSON.stringify(direction));

      // Mutate strategic frame dimensions while preserving truth invariants
      variantDirection.psychology = {
        primary: frame.psychologicalEntry[0],
        secondary: [],
        rationale: `Primary psychology shifted to ${frame.centralMotivation}`,
        contextualRelevance: frame.strategicHypothesis,
        ethicalConsiderations: frame.psychologicalEntry[0].risks,
        confidence: frame.confidence,
      };

      variantDirection.creativeMechanism = {
        primary: frame.mechanism,
        supporting: [],
        role: frame.mechanism.purpose,
        rationale: `Mechanism aligned with ${stratRef.name}`,
        constraints: [],
      };

      // Set variant-specific hook & story guidance based on strategy
      variantDirection.hook = {
        ...variantDirection.hook,
        purpose: frame.marketingPromise,
        openingFunction: frame.marketingPromise,
        illustrativeExample: frame.marketingPromise,
      };

      variantDirection.strategicWhy = {
        ...variantDirection.strategicWhy,
        motivation: frame.centralMotivation,
        tension: frame.audienceTension,
        opportunity: frame.marketingPromise,
        whyThisDirection: frame.strategicHypothesis,
      };

      const changedDims: VariantDimension[] = ["MOTIVATION", "PSYCHOLOGY", "MECHANISM", "HOOK", "VALUE_FRAMING"];
      const preservedDims: VariantDimension[] = ["OFFER_FRAMING", "PLATFORM_EXPRESSION"];

      const candidateVariant: CreativeVariant = {
        id: `var-${stratRef.strategy.toLowerCase()}-${i + 1}`,
        version: 1,
        name: `${stratRef.name} Variant`,
        label: stratRef.name,
        strategy: stratRef.strategy,
        strategicRole: stratRef.strategicPurpose,
        direction: variantDirection,
        differentiation: {
          primaryDifference: `Focuses on ${frame.centralMotivation}`,
          changedDimensions: changedDims,
          preservedDimensions: preservedDims,
          strategicHypothesis: frame.strategicHypothesis,
          audienceReasonForDifference: `Addresses ${frame.audienceTension}`,
          expectedBehavioralDifference: frame.expectedBehavior,
          whyNotDuplicate: `Distinct motivation: ${stratRef.strategy}`,
        },
        score: {} as any, // Filled during scoring
        confidence: frame.confidence,
        evidence: frame.evidence,
        assumptions: direction.assumptions,
        risks: stratRef.risks,
        status: "PROPOSED",
        sourceDirectionId: direction.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 4. Validate variant (Truth, Ethics, Constraints)
      const valResult = this.validationService.validateVariant(candidateVariant, context, constraints);
      if (!valResult.valid) {
        rejectedCandidates.push({
          candidateId: candidateVariant.id,
          candidateType: "COMPOSITION",
          reasons: valResult.errors.map((e) => ({
            code: e.code,
            reason: e.message,
            severity: "HARD",
            source: e.source || "VALIDATION",
          })),
          potentiallyRecoverable: false,
        });
        continue;
      }

      // 5. Score candidate
      candidateVariant.score = this.scoringService.scoreVariant(candidateVariant, context, constraints);
      validVariants.push(candidateVariant);
    }

    if (validVariants.length === 0) {
      return {
        status: "FAILED",
        code: "VARIANT_VALIDATION_FAILED",
        message: "All generated variant candidates failed truth or ethics validation.",
        recoverable: false,
        retryable: false,
        recovery: {
          recoverable: false,
          retryable: false,
          userActionRequired: true,
          upstreamActionRequired: false,
          suggestedNextActions: [],
          blockedComponents: ["VALIDATION"],
          blockingFields: [],
        },
        nextAction: "RETURN_ERROR",
      };
    }

    // Check if we have sufficient distinctiveness / diversity
    if (validVariants.length === 1) {
      return {
        status: "NO_DIVERSITY",
        validVariants,
        rejectedCandidates,
        reason: "Only one strategically defensible variant exists for this campaign context.",
        missingStrategicDimensions: ["MOTIVATION", "PSYCHOLOGY"],
        recovery: {
          recoverable: true,
          retryable: false,
          userActionRequired: true,
          upstreamActionRequired: false,
          suggestedNextActions: [],
          blockedComponents: [],
          blockingFields: [],
        },
        nextAction: "USE_AVAILABLE_VARIANTS",
      };
    }

    // 6. Select diverse set matching policy
    const variantSet = this.selectionService.selectDiverseSet(
      validVariants,
      effectivePolicy,
      direction.id,
      context.objective
    );

    const warnings = [];
    if (variantSet.variants.length < requestedCount) {
      warnings.push({
        code: "PARTIAL_VARIANT_SET",
        message: `Requested ${requestedCount} variants, but only ${variantSet.variants.length} strategically distinct variants met validation criteria.`,
        severity: "INFO" as const,
        requiresUserAttention: false,
      });
    }

    return {
      status: "SUCCESS",
      variantSet,
      warnings,
      nextAction: "EXECUTE",
    };
  }

  /**
   * Explains the strategic why of a variant in human-understandable format.
   */
  public explainVariant(variant: CreativeVariant): CreativeVariantExplanation {
    return {
      variantId: variant.id,
      strategy: variant.strategy,
      whyThisVariant: variant.differentiation.primaryDifference,
      whatChanged: variant.differentiation.changedDimensions.map((d) => String(d)),
      whatStayedConstant: variant.differentiation.preservedDimensions.map((d) => String(d)),
      audienceReason: variant.differentiation.audienceReasonForDifference,
      psychologicalReason: variant.direction.psychology.primary.purpose,
      marketingReason: variant.direction.creativeMechanism.primary.purpose,
      expectedBehavior: variant.differentiation.expectedBehavioralDifference,
      tradeoffs: variant.risks,
      confidence: variant.confidence,
      evidence: variant.evidence,
    };
  }

  /**
   * Compares multiple variants across strategic dimensions.
   */
  public compareVariants(variants: CreativeVariant[]): CreativeVariantComparison {
    const varIds = variants.map((v) => v.id);
    const dims: VariantDimension[] = ["MOTIVATION", "PSYCHOLOGY", "MECHANISM", "HOOK"];

    const diffMap: Record<VariantDimension, Record<string, string>> = {
      MOTIVATION: {},
      PSYCHOLOGY: {},
      MECHANISM: {},
      HOOK: {},
      AUDIENCE_FRAME: {},
      TENSION: {},
      INSIGHT: {},
      STORY: {},
      VISUAL: {},
      COPY: {},
      OFFER_FRAMING: {},
      VALUE_FRAMING: {},
      EMOTIONAL_TERRITORY: {},
      STYLE: {},
      CTA: {},
      PLATFORM_EXPRESSION: {},
    };

    variants.forEach((v) => {
      diffMap.MOTIVATION[v.id] = v.differentiation.primaryDifference;
      diffMap.PSYCHOLOGY[v.id] = v.direction.psychology.primary.name;
      diffMap.MECHANISM[v.id] = v.direction.creativeMechanism.primary.name;
      diffMap.HOOK[v.id] = v.direction.hook.openingFunction;
    });

    const differences = dims.map((dimension) => ({
      dimension,
      values: diffMap[dimension],
    }));

    const sorted = [...variants].sort((a, b) => b.score.finalScore - a.score.finalScore);
    const rec = sorted[0];

    return {
      variants: varIds,
      comparisonDimensions: dims,
      differences,
      sharedElements: ["Offer", "Product", "Business Facts", "Objective", "Platform"],
      strategicTradeoffs: variants.map((v) => ({
        variantId: v.id,
        strengths: [v.differentiation.primaryDifference],
        weaknesses: v.risks,
      })),
      recommendation: rec ? rec.id : undefined,
      recommendationReason: rec ? `Highest overall context & strategic fit (${rec.score.finalScore}/100)` : undefined,
      confidence: "VALIDATED",
    };
  }
}

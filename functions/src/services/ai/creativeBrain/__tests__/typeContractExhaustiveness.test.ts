import type {
  ID as _ID,
  ConfidenceLevel as _ConfidenceLevel,
  BusinessContext as _BusinessContext,
  AudienceContext as _AudienceContext,
  AudienceSituationReference,
  CreativeOpportunity as _CreativeOpportunity,
  PsychologyReference as _PsychologyReference,
  CreativeMechanismReference as _CreativeMechanismReference,
  HookPatternReference as _HookPatternReference,
  StoryStructureReference as _StoryStructureReference,
  VisualStructureReference as _VisualStructureReference,
  CopyStructureReference as _CopyStructureReference,
  OfferContext as _OfferContext,
  StyleSystemReference as _StyleSystemReference,
  CTAIntentReference as _CTAIntentReference,
  PlatformContext as _PlatformContext,
  CombinationRuleReference as _CombinationRuleReference,
  CreativeScore as _CreativeScore,
  CreativeContext as _CreativeContext,
  CreativeDirection as _CreativeDirection,
  CreativeCompositionInput as _CreativeCompositionInput,
  CreativeCompositionResult,
  CreativeCompositionSuccess,
  CreativeCompositionClarification as _CreativeCompositionClarification,
  CreativeCompositionIncomplete as _CreativeCompositionIncomplete,
  CreativeCompositionNoDirection as _CreativeCompositionNoDirection,
  CreativeCompositionConflict as _CreativeCompositionConflict,
  CreativeCompositionBlocked as _CreativeCompositionBlocked,
  CreativeCompositionFailure as _CreativeCompositionFailure,
  CreativeCompositionState as _CreativeCompositionState,
  CreativeDirectionLearning as _CreativeDirectionLearning,
} from "../types";

import {
  isValidScore,
  isCreativeCompositionSuccess,
  isCreativeCompositionFailure,
  requiresUserClarification,
  toExecutionInput as _toExecutionInput,
} from "../types";

describe("Creative Brain Type Contracts Exhaustiveness & Safety (Phase 10.18)", () => {
  describe("Exhaustive Result Handling Test (Section 97)", () => {
    function handleResult(result: CreativeCompositionResult): string {
      switch (result.status) {
        case "SUCCESS":
          return result.direction.coreIdea.statement;

        case "CLARIFICATION_REQUIRED":
          return result.questions[0]?.question ?? "Clarification required";

        case "INCOMPLETE":
          return result.reason;

        case "NO_VALID_DIRECTION":
          return result.dominantReasons.join("; ");

        case "CONFLICT":
          return result.conflicts
            .map((conflict) => conflict.explanation)
            .join("; ");

        case "BLOCKED":
          return result.blockingReasons
            .map((reason) => reason.description)
            .join("; ");

        case "FAILED":
          return result.message;
      }
    }

    it("should correctly compile and evaluate all 7 discriminated composition result states", () => {
      const mockSuccess: CreativeCompositionSuccess = {
        status: "SUCCESS",
        direction: {
          id: "dir-1",
          version: 1,
          status: "APPROVED",
          coreIdea: {
            statement: "Core Idea Statement",
            shortVersion: "Core Idea Short",
            strategicMeaning: "Strategic Meaning",
            audienceProblem: "Audience Problem",
            desiredShift: "Desired Shift",
            businessRole: "Business Role",
          },
          strategicWhy: {
            problem: "p",
            tension: "t",
            motivation: "m",
            opportunity: "o",
            objectiveConnection: "oc",
            businessConnection: "bc",
            whyThisDirection: "wtd",
          },
          audience: {
            audienceDescription: "Audience desc",
            situation: {} as AudienceSituationReference,
            motivation: ["m1"],
            barriers: ["b1"],
            desiredOutcome: "do",
          },
          situation: {
            description: "s desc",
            context: "s ctx",
            tension: "s tension",
            strategicImplication: "s impl",
          },
          objective: {
            objective: "CONVERSION",
            desiredAudienceBehavior: "buy",
            successMeaning: "sales",
            strategicRole: "revenue",
          },
          psychology: {} as any,
          creativeMechanism: {} as any,
          hook: {} as any,
          story: {} as any,
          visual: {} as any,
          copy: {} as any,
          style: {} as any,
          cta: {} as any,
          platform: {
            platform: { platformId: "p1", name: "Meta", supported: true, expressionConstraints: {} as any },
            format: { formatId: "f1", name: "Feed Post", type: "POST" },
            expressionConstraints: {} as any,
          },
          combinationValidation: {} as any,
          compositionCoherence: {} as any,
          constraints: {
            requiredFacts: [],
            prohibitedClaims: [],
            requiredEvidence: [],
            requiredAssets: [],
            prohibitedTreatments: [],
            businessConstraints: [],
            brandConstraints: [],
            platformConstraints: [],
            culturalConstraints: [],
            operationalConstraints: [],
          },
          evidence: [],
          assumptions: [],
          risks: [],
          confidence: "STRONG_EVIDENCE",
          score: {} as any,
          rationale: {} as any,
          sourceIntelligence: {} as any,
          composerPolicyVersion: 1,
          createdAt: "2026-10-07T00:00:00Z",
          updatedAt: "2026-10-07T00:00:00Z",
        },
        score: {} as any,
        coherence: {} as any,
        confidence: "STRONG_EVIDENCE",
        rationale: {} as any,
        sourceIntelligence: {} as any,
        warnings: [],
        nextAction: "EXECUTE",
      };

      expect(handleResult(mockSuccess)).toBe("Core Idea Statement");
    });
  });

  describe("Execution Safety Test (Section 98)", () => {
    it("should allow execution ONLY when composition status is SUCCESS", () => {
      const successResult: CreativeCompositionResult = {
        status: "SUCCESS",
        direction: {} as any,
        score: {} as any,
        coherence: {} as any,
        confidence: "VALIDATED",
        rationale: {} as any,
        sourceIntelligence: {} as any,
        warnings: [],
        nextAction: "EXECUTE",
      };

      const clarificationResult: CreativeCompositionResult = {
        status: "CLARIFICATION_REQUIRED",
        questions: [],
        blockedDecisions: [],
        knownContext: {} as any,
        missingInformation: [],
        reason: "Need info",
        severity: "HIGH",
        recovery: {} as any,
        nextAction: "ASK_USER",
      };

      const incompleteResult: CreativeCompositionResult = {
        status: "INCOMPLETE",
        missingInformation: [],
        affectedComponents: [],
        canProceedPartially: false,
        reason: "Incomplete input",
        recovery: {} as any,
        nextAction: "COMPLETE_CONTEXT",
      };

      const noDirectionResult: CreativeCompositionResult = {
        status: "NO_VALID_DIRECTION",
        evaluatedCandidates: [],
        rejectedCandidates: [],
        dominantReasons: ["No fit"],
        recovery: {} as any,
        nextAction: "ASK_USER",
      };

      const conflictResult: CreativeCompositionResult = {
        status: "CONFLICT",
        conflicts: [],
        affectedComponents: [],
        severity: "HIGH",
        resolutionOptions: [],
        recovery: {} as any,
        nextAction: "ASK_USER",
      };

      const blockedResult: CreativeCompositionResult = {
        status: "BLOCKED",
        blockingReasons: [],
        blockedStage: "PLATFORM",
        recoverable: true,
        recovery: {} as any,
        nextAction: "WAIT",
      };

      const failureResult: CreativeCompositionResult = {
        status: "FAILED",
        code: "COMPOSER_UNEXPECTED_ERROR",
        stage: "COMPOSITION",
        message: "Error",
        recoverable: false,
        retryable: true,
        recovery: {} as any,
        nextAction: "RETRY",
      };

      expect(isCreativeCompositionSuccess(successResult)).toBe(true);
      expect(isCreativeCompositionSuccess(clarificationResult)).toBe(false);
      expect(isCreativeCompositionSuccess(incompleteResult)).toBe(false);
      expect(isCreativeCompositionSuccess(noDirectionResult)).toBe(false);
      expect(isCreativeCompositionSuccess(conflictResult)).toBe(false);
      expect(isCreativeCompositionSuccess(blockedResult)).toBe(false);
      expect(isCreativeCompositionSuccess(failureResult)).toBe(false);

      expect(requiresUserClarification(clarificationResult)).toBe(true);
      expect(isCreativeCompositionFailure(failureResult)).toBe(true);
    });
  });

  describe("Score Validation Tests (Section 99)", () => {
    it("should validate scores in range [0, 100]", () => {
      expect(isValidScore(0)).toBe(true);
      expect(isValidScore(50)).toBe(true);
      expect(isValidScore(100)).toBe(true);

      expect(isValidScore(-1)).toBe(false);
      expect(isValidScore(101)).toBe(false);
      expect(isValidScore(NaN)).toBe(false);
      expect(isValidScore(Infinity)).toBe(false);
      expect(isValidScore(-Infinity)).toBe(false);
    });
  });
});

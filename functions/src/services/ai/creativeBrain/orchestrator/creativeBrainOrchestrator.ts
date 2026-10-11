import { StrategicConfirmationState } from "../types";
import type {
  CreativeBrainInput,
  CreativeBrainSession,
  CreativeBrainResult,
  CreativeBrainRevision,
  CreativeContext,
  CreativeDirection,
  StrategicConfirmation,
  StrategicConfirmationDecision,
  CreativeExplorationContext,
  ExecutionAuthorization,
} from "../types";

import { BusinessUnderstandingService } from "../understanding/businessUnderstandingService";
import { AudienceUnderstandingService } from "../understanding/audienceUnderstandingService";
import { SituationUnderstandingService } from "../understanding/situationUnderstandingService";
import { ObjectiveUnderstandingService } from "../understanding/objectiveUnderstandingService";
import { CreativeExplanationService } from "../explanation/creativeExplanationService";
import { CreativeConfirmationService } from "../confirmation/creativeConfirmationService";
import { CreativeExecutionAdapter } from "../execution/creativeExecutionAdapter";
import { CreativeBrainStateMachine } from "./creativeBrainStateMachine";
import { CreativeVariantService } from "../variants/creativeVariantService";
import { StrategicConfirmationStateMachine } from "../confirmation/strategicConfirmationStateMachine";
import { StrategicConfirmationProjectionService } from "../confirmation/strategicConfirmationProjectionService";
import { StrategicExplorationService } from "../confirmation/strategicExplorationService";
import { ExecutionAuthorizationService } from "../confirmation/executionAuthorizationService";
import { CreativeAssetPlanService } from "../assetPlan/creativeAssetPlanService";

export class CreativeBrainOrchestrator {
  private businessService = new BusinessUnderstandingService();
  private audienceService = new AudienceUnderstandingService();
  private situationService = new SituationUnderstandingService();
  private objectiveService = new ObjectiveUnderstandingService();
  private explanationService = new CreativeExplanationService();
  private confirmationService = new CreativeConfirmationService();
  private executionAdapter = new CreativeExecutionAdapter();
  private stateMachine = new CreativeBrainStateMachine();
  private variantService = new CreativeVariantService();
  private strategicConfirmationStateMachine = new StrategicConfirmationStateMachine();
  private projectionService = new StrategicConfirmationProjectionService();
  private explorationService = new StrategicExplorationService();
  private authorizationService = new ExecutionAuthorizationService();
  private assetPlanService = new CreativeAssetPlanService();

  /**
   * Starts or resumes a Creative Brain orchestration workflow.
   */
  public async orchestrate(input: CreativeBrainInput): Promise<CreativeBrainResult> {
    const sessionId = input.sessionId || `session-${Date.now()}`;

    // 1. Loading & Understanding Business
    const businessContext = await this.businessService.understand(input.business);

    // 2. Understanding Audience, Situation, Objective
    const audienceContext = await this.audienceService.understand(input.audience, businessContext);
    const situationContext = await this.situationService.understand(input.situation, businessContext, audienceContext);
    const objective = await this.objectiveService.understand(input.objective);

    // Build CreativeContext input
    const creativeContext: CreativeContext = {
      business: businessContext,
      industry: { id: `ind-${businessContext.industry.toLowerCase()}`, name: businessContext.industry, category: businessContext.industry, supportedByMitra: true },
      audience: audienceContext,
      objective,
      platform: input.platform,
      format: input.format,
      campaignStage: input.campaignStage,
      situation: situationContext,
      offer: input.offer,
      product: input.product,
    };

    // Construct baseline CreativeDirection
    const direction: CreativeDirection = {
      id: `dir-${Date.now()}`,
      version: 1,
      status: "PROPOSED",
      coreIdea: {
        statement: `${input.product?.name || input.offer?.name || businessContext.name} Marketing Direction`,
        shortVersion: businessContext.name,
        strategicMeaning: `Address ${situationContext.name} through focused messaging`,
        audienceProblem: situationContext.description,
        desiredShift: "From awareness to action",
        businessRole: `${objective} driver`,
      },
      strategicWhy: {
        problem: situationContext.description,
        tension: situationContext.description,
        motivation: audienceContext.motivations[0] || "Quality",
        opportunity: `Positioning ${businessContext.name} for ${objective}`,
        objectiveConnection: `Aligns with ${objective} campaign goal`,
        businessConnection: `Leverages verified business capabilities`,
        whyThisDirection: `Addresses ${audienceContext.description} during ${situationContext.name}`,
      },
      audience: {
        audienceDescription: audienceContext.description,
        situation: situationContext,
        motivation: audienceContext.motivations,
        barriers: audienceContext.barriers,
        desiredOutcome: audienceContext.desiredOutcomes[0] || "Satisfaction",
      },
      situation: {
        description: situationContext.description,
        context: situationContext.description,
        tension: situationContext.description,
        strategicImplication: "Requires clear value & ease",
      },
      objective: {
        objective,
        desiredAudienceBehavior: "Engage and purchase",
        successMeaning: "High conversion",
        strategicRole: "Growth",
      },
      psychology: {
        primary: {
          id: "psych-primary",
          name: "Effort Reduction",
          category: "DECISION",
          definition: "Reduces choice friction",
          purpose: "Drives action",
          whyItMayWork: "Lowers mental load",
          whenToUse: [objective],
          whenNotToUse: [],
          risks: [],
          ethicalBoundary: "Must be honest",
          compatibleMechanismIds: ["mech-1"],
          incompatibleMechanismIds: [],
          evidence: [],
          confidence: "VALIDATED",
          status: "ACTIVE",
        },
        secondary: [],
        rationale: "High fit",
        contextualRelevance: "High",
        ethicalConsiderations: [],
        confidence: "VALIDATED",
      },
      creativeMechanism: {
        primary: {
          id: "mech-1",
          name: "Choice Simplification",
          definition: "Simplifies options",
          purpose: "Ease decision",
          psychologyIds: ["psych-primary"],
          bestFor: [businessContext.industry],
          industries: [businessContext.industry],
          objectives: [objective],
          audienceSituationIds: [],
          strengths: [],
          weaknesses: [],
          worksWith: [],
          avoidWith: [],
          hookPatterns: [],
          storyStructures: [],
          visualStructures: [],
          copyStructures: [],
          assetRequirements: [],
          antiPatterns: [],
          ethicalBoundaries: [],
          evidence: [],
          confidence: "VALIDATED",
          status: "ACTIVE",
        },
        supporting: [],
        role: "Primary",
        rationale: "High fit",
        constraints: [],
      },
      hook: {
        pattern: {} as any,
        purpose: "Interrupt pattern",
        openingFunction: `Discover ${input.product?.name || businessContext.name} today`,
        constraints: [],
      },
      story: { structure: {} as any, narrativePurpose: "Narrative arc", beats: [], constraints: [] },
      visual: { structure: {} as any, visualPurpose: "Clean visual", compositionDirection: "Clean centered composition", subjectHierarchy: [], imageRequirements: [], videoRequirements: [], constraints: [] },
      copy: { structure: {} as any, communicationPurpose: "Clear copy", tone: ["Professional"], sentenceLength: "SHORT", specificity: "HIGH", emotionalIntensity: "MEDIUM", proofRequirement: "OPTIONAL", claimsAllowed: [], claimsRequiringEvidence: [], constraints: [] },
      style: { primaryStyle: {} as any, intensity: "MEDIUM", visualCharacter: "Modern", typographyDirection: "Clean", colorDirection: "Brand", imageDirection: "Clean", compositionDirection: "Centered", motionDirection: "Smooth", prohibitedTreatments: [] },
      cta: { intent: {} as any, desiredBehavior: "Order Now", friction: "LOW", readiness: "HIGH", rationale: "Direct link", constraints: [] },
      platform: { platform: input.platform, format: input.format, expressionConstraints: input.platform.expressionConstraints },
      combinationValidation: { valid: true } as any,
      compositionCoherence: { score: 90 } as any,
      constraints: { requiredFacts: [], prohibitedClaims: [], requiredEvidence: [], requiredAssets: [], prohibitedTreatments: [], businessConstraints: [], brandConstraints: [], platformConstraints: [], culturalConstraints: [], operationalConstraints: [] },
      evidence: [],
      assumptions: [],
      risks: [],
      confidence: "VALIDATED",
      score: { finalScore: 90 } as any,
      rationale: {} as any,
      sourceIntelligence: {} as any,
      composerPolicyVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Generate Strategic Variants (Phase 10.19 integration)
    const variantResult = await this.variantService.generate({
      direction,
      context: creativeContext,
      requestedCount: 3,
    });

    const variantSet = variantResult.status === "SUCCESS" ? variantResult.variantSet : undefined;

    // Construct session state
    let session: CreativeBrainSession = {
      sessionId,
      businessContext,
      audienceContext,
      situationContext,
      objective,
      productContext: input.product,
      offerContext: input.offer,
      platformContext: input.platform,
      formatContext: input.format,
      campaignStage: input.campaignStage,
      currentState: "CONFIRMATION_REQUIRED",
      creativeContext,
      creativeDirection: direction,
      variantSet,
      selectedVariant: variantSet?.variants[0],
      revisions: [],
      stateHistory: [
        { from: "INIT", to: "CONFIRMATION_REQUIRED", reason: "Compiled strategy & variants", timestamp: new Date().toISOString() },
      ],
      policyVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Generate "Here's what I understood" confirmation summary
    const summary = this.explanationService.generateSummary(session);
    session.understandingSummary = summary;

    return {
      status: "CONFIRMATION_REQUIRED",
      session,
      summary,
      variantSet: variantSet!,
      nextAction: "USER_CONFIRMATION",
    };
  }

  /**
   * Projects presentation-safe strategic confirmation UI summary.
   */
  public getStrategicConfirmation(session: CreativeBrainSession): StrategicConfirmation {
    return this.projectionService.projectConfirmation(session);
  }

  /**
   * Processes strategic confirmation decision ("CONFIRM", "CHANGE", "EXPLORE").
   */
  public processStrategicConfirmation(
    session: CreativeBrainSession,
    decision: StrategicConfirmationDecision,
    options?: {
      selectedVariantId?: string;
      userNotes?: string;
      revision?: CreativeBrainRevision;
      explorationContext?: CreativeExplorationContext;
    }
  ) {
    if (options?.userNotes && (options.userNotes.toLowerCase().includes("fake scarcity") || options.userNotes.toLowerCase().includes("fake countdown"))) {
      throw new Error("Strategic Confirmation rejected: Dishonest claim pattern detected ('fake scarcity').");
    }

    const confirmation = this.projectionService.projectConfirmation(session);

    if (session.currentState === "CONFIRMED" && decision === "CONFIRM") {
      const selectedVariant = options?.selectedVariantId
        ? session.variantSet?.variants.find((v) => v.id === options.selectedVariantId) || session.selectedVariant
        : session.selectedVariant;
      const auth = (session as any).executionAuthorization || this.authorizationService.issueAuthorization(
        session,
        confirmation.recommendedDirection
      );
      return {
        session,
        confirmation: { ...confirmation, state: StrategicConfirmationState.CONFIRMED, status: StrategicConfirmationState.CONFIRMED },
        authorization: auth,
        explorationContext: options?.explorationContext,
        learning: {
          confirmationId: confirmation.confirmationId,
          decision: "CONFIRM" as const,
          selectedStrategyType: selectedVariant?.strategy || "CONVENIENCE",
          rejectedStrategyTypes: [],
          explorationCount: options?.explorationContext?.explorationCount || 0,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const eventType: "CONFIRM" | "REQUEST_CHANGE" | "START_EXPLORATION" =
      decision === "CONFIRM" ? "CONFIRM" : decision === "CHANGE" ? "REQUEST_CHANGE" : "START_EXPLORATION";

    const transitionResult = this.strategicConfirmationStateMachine.transition(confirmation, {
      sessionId: session.sessionId,
      revision: session.policyVersion || 1,
      actor: "USER",
      event: eventType === "REQUEST_CHANGE" ? { type: "REQUEST_CHANGE", revisionType: "DIRECTION" } : { type: eventType },
      expectedState: confirmation.state,
    });

    if (decision === "CONFIRM") {
      const selectedVariant = options?.selectedVariantId
        ? session.variantSet?.variants.find((v) => v.id === options.selectedVariantId) || session.selectedVariant
        : session.selectedVariant;

      const confirmedSession: CreativeBrainSession = {
        ...session,
        selectedVariant,
        userConfirmation: {
          confirmed: true,
          selectedVariantId: selectedVariant?.id,
          userNotes: options?.userNotes,
          confirmedAt: new Date().toISOString(),
        },
        currentState: "CONFIRMED",
        updatedAt: new Date().toISOString(),
      };

      const auth = this.authorizationService.issueAuthorization(
        confirmedSession,
        transitionResult.confirmation.recommendedDirection
      );
      (confirmedSession as any).executionAuthorization = auth;

      return {
        session: confirmedSession,
        confirmation: { ...transitionResult.confirmation, state: StrategicConfirmationState.CONFIRMED, status: StrategicConfirmationState.CONFIRMED },
        authorization: auth,
        explorationContext: options?.explorationContext,
        learning: {
          confirmationId: transitionResult.confirmation.confirmationId,
          decision: "CONFIRM" as const,
          selectedStrategyType: selectedVariant?.strategy || "CONVENIENCE",
          rejectedStrategyTypes: [],
          explorationCount: options?.explorationContext?.explorationCount || 0,
          timestamp: new Date().toISOString(),
        },
      };
    } else if (decision === "EXPLORE") {
      const expRes = this.explorationService.exploreAlternativeDirection(session, options?.explorationContext);
      return {
        session: expRes.session,
        confirmation: { ...transitionResult.confirmation, state: StrategicConfirmationState.ALTERNATIVE_READY, status: StrategicConfirmationState.ALTERNATIVE_READY },
        explorationContext: expRes.explorationContext,
        learning: {
          confirmationId: transitionResult.confirmation.confirmationId,
          decision: "EXPLORE" as const,
          selectedStrategyType: expRes.selectedAlternative.strategy,
          rejectedStrategyTypes: [],
          explorationCount: expRes.explorationContext.explorationCount,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        session,
        confirmation: transitionResult.confirmation,
        learning: {
          confirmationId: transitionResult.confirmation.confirmationId,
          decision: "CHANGE" as const,
          selectedStrategyType: "NONE",
          rejectedStrategyTypes: [],
          explorationCount: 0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }


  /**
   * Explores an alternative strategic direction (max 5 limit, deduplicated).
   */
  public exploreAlternativeDirection(
    session: CreativeBrainSession,
    explorationContext?: CreativeExplorationContext
  ) {
    return this.explorationService.exploreAlternativeDirection(session, explorationContext);
  }

  /**
   * Verifies execution authorization signature.
   */
  public verifyExecutionAuthorization(authorization: ExecutionAuthorization): boolean {
    return this.authorizationService.verifyAuthorization(authorization);
  }

  /**
   * Processes user confirmation of strategy.
   */
  public async confirm(session: CreativeBrainSession, userNotes?: string, selectedVariantId?: string): Promise<CreativeBrainResult> {
    const confirmedSession = this.confirmationService.processConfirmation(session, userNotes, selectedVariantId);
    
    // Prepare execution payload strictly after confirmation gate
    const executionInput = this.executionAdapter.prepareExecutionPayload(confirmedSession);

    return {
      status: "SUCCESS",
      session: confirmedSession,
      summary: confirmedSession.understandingSummary!,
      direction: executionInput.direction,
      variantSet: confirmedSession.variantSet,
      nextAction: "EXECUTE",
    };
  }

  /**
   * Processes user revision/correction.
   */
  public async revise(session: CreativeBrainSession, revision: CreativeBrainRevision): Promise<CreativeBrainResult> {
    const revisedSession = this.confirmationService.processRevision(session, revision);

    // Re-orchestrate downstream steps
    return this.orchestrate({
      business: revisedSession.businessContext,
      audience: revisedSession.audienceContext,
      situation: revisedSession.situationContext,
      objective: revisedSession.objective,
      product: revisedSession.productContext,
      offer: revisedSession.offerContext,
      platform: revisedSession.platformContext,
      format: revisedSession.formatContext,
      campaignStage: revisedSession.campaignStage,
      sessionId: revisedSession.sessionId,
    });
  }

  /**
   * Generates a deterministic CreativeAssetPlan strictly after strategy confirmation (Phase 10.22).
   */
  public generateAssetPlan(session: CreativeBrainSession, authorization?: ExecutionAuthorization) {
    return this.assetPlanService.createAssetPlan(session, authorization);
  }
}


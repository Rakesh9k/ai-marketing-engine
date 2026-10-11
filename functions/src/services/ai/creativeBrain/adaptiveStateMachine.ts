import { v7 as uuidv7 } from 'uuid';
import type { CreativeBrainInput, CreativeBrainResult } from '../creativeBrain.types';
import { creativeBrainService } from '../creativeBrainService';
import type {
  CanonicalCreativeBrainState,
  CreativeBrainStateContext,
  AdaptiveStateTransitionTrace,
  CreativeBrainRequirement,
} from './stateMachineTypes';
import { EvidenceStore } from './evidenceStore';
import { InformationValueResolver } from './informationValue';
import { getCreativeBrainVerticalConfig, type CreativeBrainVerticalConfig } from './verticalConfigs';
import { QuestionResolver, type ContextualUserQuestion } from './questionResolver';

import { IndustryKnowledgeResolver } from './industry/industryKnowledge.resolver';

export class AdaptiveCreativeBrainStateMachine {
  private context: CreativeBrainStateContext;
  private evidenceStore: EvidenceStore;
  private verticalConfig: CreativeBrainVerticalConfig;

  private readonly MAX_REFINEMENT_CYCLES = 3;
  private readonly MAX_STATE_ATTEMPTS = 5;

  constructor(input: CreativeBrainInput) {
    this.evidenceStore = new EvidenceStore(input.businessBrain, input.intent);
    this.verticalConfig = getCreativeBrainVerticalConfig(input.vertical);

    const industryContext =
      input.industryCreativeContext ||
      IndustryKnowledgeResolver.resolve({
        businessBrain: input.businessBrain,
        productContext: input.productContext as any,
        campaignIntent: input.intent as any,
        vertical: input.vertical,
      });

    this.context = {
      sessionId: `session-${uuidv7()}`,
      businessId: input.intent.businessId,
      campaignId: input.intent.campaignId,
      currentState: 'INIT',
      businessBrain: input.businessBrain,
      vertical: input.vertical,
      industryCreativeContext: industryContext,
      campaignIntent: input.intent,
      productContext: input.productContext,
      businessUnderstanding: input.businessUnderstanding,
      productUnderstanding: input.productUnderstanding,
      evidence: new Map(),
      missingRequirements: [],
      completedStates: new Set(),
      userResponses: [],
      refinementHistory: [],
      refinementCycleCount: 0,
      regenerationCycleCount: 0,
      stateAttemptCounts: new Map(),
      transitionTraces: [],
      confidence: 100,
      version: '2.5.0',
    };
  }

  public getContext(): CreativeBrainStateContext {
    return this.context;
  }

  public getCurrentState(): CanonicalCreativeBrainState {
    return this.context.currentState;
  }

  public getTransitionTraces(): readonly AdaptiveStateTransitionTrace[] {
    return this.context.transitionTraces;
  }

  /**
   * Main Execution Entrypoint: Drives state progression dynamically from INIT -> EXECUTION / BLUEPRINT_LOCKED.
   */
  public async executeAdaptiveFlow(input: CreativeBrainInput): Promise<{
    result: CreativeBrainResult;
    context: CreativeBrainStateContext;
    pendingQuestion?: ContextualUserQuestion;
  }> {
    let pendingQuestion: ContextualUserQuestion | undefined = undefined;
    // What the reasoning service actually returned. It reports a fallback (and why) in this object; keeping it
    // means the final result says so too, instead of presenting a fallback blueprint as a clean success.
    let reasoningResult: CreativeBrainResult | undefined = undefined;

    while (this.context.currentState !== 'BLUEPRINT_LOCKED' && this.context.currentState !== 'EXECUTION') {
      const attempt = (this.context.stateAttemptCounts.get(this.context.currentState) || 0) + 1;
      this.context.stateAttemptCounts.set(this.context.currentState, attempt);

      if (attempt > this.MAX_STATE_ATTEMPTS) {
        // Loop protection triggered — fallback to direct blueprint emission
        this.transitionTo('BLUEPRINT_LOCKED', 'LOOP_PROTECTION_TRIGGERED', `State attempt count exceeded max limits (${this.MAX_STATE_ATTEMPTS})`);
        break;
      }

      if (this.context.currentState === 'INIT') {
        this.transitionTo('CAMPAIGN_CONTEXT', 'INIT_COMPLETE', 'Initialized session and truth baseline');
        continue;
      }

      if (this.context.currentState === 'CAMPAIGN_INTENT') {
        this.transitionTo('CAMPAIGN_CONTEXT', 'INTENT_RESOLVED', 'Campaign intent normalized');
        continue;
      }

      if (this.context.currentState === 'CAMPAIGN_CONTEXT') {
        // Perform Information Value Audit
        const missingReqs = this.auditMissingRequirements();
        this.context.missingRequirements = [...missingReqs];

        const topReq = missingReqs[0];
        if (topReq && topReq.informationValue > 50 && !this.hasUserResponded(topReq.key)) {
          pendingQuestion = QuestionResolver.resolveHighestValueQuestion(
            topReq,
            this.context.industryCreativeContext,
            this.context.campaignIntent.offer.headline
          );
          // Stop flow to solicit user input ONLY when missing info materially affects creative quality
          return {
            result: await creativeBrainService.evaluateAndFormBlueprint(input),
            context: this.context,
            pendingQuestion,
          };
        }

        // Determine adaptive state skip logic
        const nextState = this.resolveAdaptiveNextState(missingReqs);
        this.transitionTo(nextState, 'ADAPTIVE_PATH_RESOLVED', `Skipped unnecessary states based on Information Value Audit`);
        continue;
      }

      if (
        this.context.currentState === 'AUDIENCE_DISCOVERY' ||
        this.context.currentState === 'OBJECTIVE_DISCOVERY' ||
        this.context.currentState === 'OFFER_DISCOVERY'
      ) {
        this.transitionTo('CUSTOMER_INSIGHT', 'DISCOVERY_STAGE_COMPLETED', 'Resolved evidence for campaign context');
        continue;
      }

      if (this.context.currentState === 'CUSTOMER_INSIGHT') {
        this.transitionTo('CREATIVE_TERRITORY', 'CUSTOMER_INSIGHT_RESOLVED', 'Resolved customer tension and motivation');
        continue;
      }

      if (this.context.currentState === 'CREATIVE_TERRITORY') {
        this.transitionTo('OPPORTUNITY', 'TERRITORY_SELECTED', `Selected vertical territory for ${this.context.vertical}`);
        continue;
      }

      if (
        this.context.currentState === 'OPPORTUNITY' ||
        this.context.currentState === 'CONCEPT_GENERATION' ||
        this.context.currentState === 'USER_SELECTION' ||
        this.context.currentState === 'CONCEPT_REFINEMENT'
      ) {
        // Delegate strategic reasoning engines (Opportunity -> Concepts -> Evaluation -> Winner) to CreativeBrainService
        const result = await creativeBrainService.evaluateAndFormBlueprint(input);
        reasoningResult = result;
        this.context.blueprint = result.blueprint;
        this.transitionTo('BLUEPRINT_LOCKED', 'BLUEPRINT_GENERATED', 'Delegated reasoning to CreativeBrainService and formed blueprint');
        break;
      }
    }

    const finalResult: CreativeBrainResult =
      reasoningResult ??
      (this.context.blueprint
        ? { success: true, blueprint: this.context.blueprint, fallbackTriggered: false, executionTimeMs: 0 }
        : await creativeBrainService.evaluateAndFormBlueprint(input));
    return {
      result: finalResult,
      context: this.context,
      pendingQuestion,
    };
  }

  /**
   * Refines a locked blueprint based on user instruction.
   * If instruction indicates major direction change, re-enters CREATIVE_TERRITORY.
   */
  public async handleRefinementInstruction(
    instruction: string,
    input: CreativeBrainInput
  ): Promise<CreativeBrainResult> {
    this.context.refinementCycleCount += 1;

    if (this.context.refinementCycleCount > this.MAX_REFINEMENT_CYCLES) {
      // Loop protection: return current blueprint without crash
      return {
        success: true,
        blueprint: this.context.blueprint || (await creativeBrainService.evaluateAndFormBlueprint(input)).blueprint,
        fallbackTriggered: true,
        executionTimeMs: 0,
      };
    }

    const isMajorDirectionChange =
      instruction.toLowerCase().includes('angle') ||
      instruction.toLowerCase().includes('family') ||
      instruction.toLowerCase().includes('direction') ||
      instruction.toLowerCase().includes('different topic');

    if (isMajorDirectionChange) {
      this.transitionTo('CREATIVE_TERRITORY', 'MAJOR_DIRECTION_CHANGE_REQUESTED', 'User requested new creative territory/direction');
    } else {
      this.transitionTo('CONCEPT_REFINEMENT', 'MINOR_REFINEMENT_REQUESTED', 'User requested minor concept refinement');
    }

    const result = await creativeBrainService.evaluateAndFormBlueprint(input);
    this.context.blueprint = result.blueprint;
    this.transitionTo('BLUEPRINT_LOCKED', 'REFINEMENT_BLUEPRINT_LOCKED', 'Refined blueprint locked');
    return result;
  }

  private auditMissingRequirements(): readonly CreativeBrainRequirement[] {
    const reqs: CreativeBrainRequirement[] = [];

    reqs.push(
      InformationValueResolver.calculateRequirement('product_identity', 'Product Identity', 'business', 95, 90, 10, this.evidenceStore),
      InformationValueResolver.calculateRequirement('offer_contract', 'Offer Contract', 'offer', 90, 85, 10, this.evidenceStore),
      InformationValueResolver.calculateRequirement('target_audience', 'Target Audience Segment', 'audience', 85, 80, 20, this.evidenceStore),
      InformationValueResolver.calculateRequirement('customer_motivation', 'Customer Motivation', 'motivation', 80, 85, 20, this.evidenceStore),
      InformationValueResolver.calculateRequirement('operating_hours', 'Operating Hours', 'business', 20, 10, 50, this.evidenceStore)
    );

    return InformationValueResolver.rankMissingRequirements(reqs);
  }

  private resolveAdaptiveNextState(missingReqs: readonly CreativeBrainRequirement[]): CanonicalCreativeBrainState {
    if (missingReqs.length === 0) {
      return 'CUSTOMER_INSIGHT';
    }

    const top = missingReqs[0];
    if (!top) return 'CUSTOMER_INSIGHT';
    if (top.category === 'audience') return 'AUDIENCE_DISCOVERY';
    if (top.category === 'objective') return 'OBJECTIVE_DISCOVERY';
    if (top.category === 'offer') return 'OFFER_DISCOVERY';
    if (top.category === 'motivation') return 'CUSTOMER_INSIGHT';

    return 'CUSTOMER_INSIGHT';
  }

  private hasUserResponded(key: string): boolean {
    return this.context.userResponses.some((r) => r.promptId.includes(key));
  }

  private transitionTo(nextState: CanonicalCreativeBrainState, reasonCode: string, reason: string): void {
    const trace: AdaptiveStateTransitionTrace = {
      fromState: this.context.currentState,
      toState: nextState,
      reasonCode,
      reason,
      confidence: 90,
      skippedStates: [],
      timestamp: new Date().toISOString(),
    };
    this.context.transitionTraces.push(trace);
    this.context.completedStates.add(this.context.currentState);
    this.context.currentState = nextState;
  }
}

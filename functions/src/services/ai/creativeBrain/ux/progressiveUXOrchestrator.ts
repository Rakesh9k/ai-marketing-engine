/**
 * PHASE 23 — Progressive UX Orchestrator
 * Manages the progressive disclosure flow for Creative Brain.
 * Ensures simple, conversational, adaptive user experience across stages:
 * START -> INTENT -> SUBJECT -> AUDIENCE -> MOTIVATION -> DIFFERENTIATION -> OPPORTUNITY -> CONFIRMATION -> CONCEPTS -> MIXING -> BLUEPRINT -> EXECUTION.
 */

import type {
  CreativeUXStage,
  CreativeUXState,
  CreativeUXAnswer,
  CreativeQuestionPresentation,
  CreativeSessionSummary,
  CreativeConceptCard,
  ConceptMixComponentSelection,
} from './creativeUX.types';
import type { BusinessContextPayload } from './uxQuestionComposer';
import { UXQuestionComposer } from './uxQuestionComposer';

export class ProgressiveUXOrchestrator {
  private sessions: Map<string, CreativeUXState> = new Map();
  private businessContexts: Map<string, BusinessContextPayload> = new Map();
  private composer: UXQuestionComposer = new UXQuestionComposer();

  /**
   * Sets or updates business context payload for a tenant/business.
   */
  public registerBusinessContext(context: BusinessContextPayload): void {
    this.businessContexts.set(context.businessId, context);
  }

  /**
   * Starts a new progressive disclosure creative session.
   */
  public startSession(
    tenantId: string,
    businessId: string,
    initialPrompt?: string,
    customContext?: Partial<BusinessContextPayload>
  ): CreativeUXState {
    const sessionId = `ux_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Retrieve registered business context or construct default
    const registeredCtx = this.businessContexts.get(businessId);
    const context: BusinessContextPayload = {
      businessId,
      businessName: registeredCtx?.businessName || customContext?.businessName || 'Your Business',
      category: registeredCtx?.category || customContext?.category || 'Retail & Services',
      featuredProducts: registeredCtx?.featuredProducts || customContext?.featuredProducts || [],
      targetAudienceSegments: registeredCtx?.targetAudienceSegments || customContext?.targetAudienceSegments || [],
      brandTone: registeredCtx?.brandTone || customContext?.brandTone || 'Warm & Welcoming',
    };
    this.businessContexts.set(businessId, context);

    const summary: CreativeSessionSummary = {
      businessName: context.businessName,
    };

    if (initialPrompt) {
      summary.campaignGoal = initialPrompt;
    }

    // Determine starting stage
    const initialStage: CreativeUXStage = 'INTENT';
    const currentQuestion = this.composer.composeQuestion(initialStage, context, summary);

    const state: CreativeUXState = {
      sessionId,
      tenantId,
      businessId,
      stage: initialStage,
      currentQuestion,
      summary,
      thinking: {
        isProcessing: false,
        message: 'Understanding your business profile & campaign goals...',
      },
      history: [],
      isComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Retrieves active session state.
   */
  public getSessionState(sessionId: string): CreativeUXState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Processes a user's answer to the current stage question and advances the flow.
   */
  public answerQuestion(sessionId: string, answer: CreativeUXAnswer): CreativeUXState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const context = this.businessContexts.get(state.businessId) || { businessId: state.businessId };
    state.history.push(answer);
    state.updatedAt = new Date().toISOString();

    // 1. Update session summary based on answer
    this.updateSummaryFromAnswer(state.summary, answer, state.currentQuestion);

    // 2. Advance to next stage
    const nextStage = this.determineNextStage(state.stage, context, state.summary);
    state.stage = nextStage;

    // 3. Handle stage logic
    if (nextStage === 'OPPORTUNITY' || nextStage === 'CONFIRMATION') {
      this.synthesizeOpportunity(state, context);
      state.stage = 'CONFIRMATION';
      state.currentQuestion = this.composer.composeQuestion('CONFIRMATION', context, state.summary);
      state.thinking = {
        isProcessing: false,
        message: 'Strategic opportunity synthesized. Ready for your review.',
      };
    } else {
      state.currentQuestion = this.composer.composeQuestion(nextStage, context, state.summary);
      state.thinking = {
        isProcessing: false,
        message: `Gathering insights for ${nextStage.toLowerCase()}...`,
      };
    }

    return state;
  }

  /**
   * Handles strategic opportunity confirmation or adjustment.
   */
  public confirmOpportunity(
    sessionId: string,
    approved: boolean,
    adjustments?: string
  ): CreativeUXState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!approved && adjustments) {
      state.summary.uniqueAngle = adjustments;
      const context = this.businessContexts.get(state.businessId) || { businessId: state.businessId };
      this.synthesizeOpportunity(state, context);
      state.stage = 'CONFIRMATION';
      state.currentQuestion = this.composer.composeQuestion('CONFIRMATION', context, state.summary);
      return state;
    }

    // Opportunity approved -> Generate candidate concepts (Phase 13 & 14)
    state.stage = 'CONCEPTS';
    state.currentQuestion = undefined;
    state.concepts = this.generateConcepts(state);
    state.thinking = {
      isProcessing: false,
      message: 'Generated distinct strategic concepts representing different creative territories.',
    };
    state.updatedAt = new Date().toISOString();

    return state;
  }

  /**
   * Selects a single concept from candidate concepts.
   */
  public selectConcept(sessionId: string, conceptId: string): CreativeUXState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const selectedConcept = state.concepts?.find((c) => c.id === conceptId);
    if (!selectedConcept) {
      throw new Error(`Concept ${conceptId} not found in session`);
    }

    state.selectedConceptId = conceptId;
    state.summary.selectedConceptNames = [selectedConcept.name];
    state.stage = 'BLUEPRINT';

    // Generate Creative Blueprint
    state.mixedBlueprint = this.synthesizeBlueprintFromConcept(state, selectedConcept);
    state.summary.hasBlueprint = true;
    state.thinking = {
      isProcessing: false,
      message: 'Creative Blueprint locked and ready for execution.',
    };
    state.updatedAt = new Date().toISOString();

    return state;
  }

  /**
   * Mixes components from multiple candidate concepts into a new synthesized blueprint (Phase 15).
   */
  public mixConcepts(
    sessionId: string,
    selections: ConceptMixComponentSelection[]
  ): CreativeUXState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    state.stage = 'MIXING';
    state.thinking = {
      isProcessing: true,
      message: 'Synthesizing selected concept elements into a new coherent Creative Blueprint...',
    };

    const mixedBlueprint = this.synthesizeBlueprintFromMix(state, selections);
    state.mixedBlueprint = mixedBlueprint;
    state.stage = 'BLUEPRINT';
    state.summary.hasBlueprint = true;
    state.summary.selectedConceptNames = selections.map((s) => {
      const c = state.concepts?.find((cp) => cp.id === s.conceptId);
      return `${s.component}: ${c?.name || s.conceptId}`;
    });

    state.thinking = {
      isProcessing: false,
      message: 'Concept mixing complete! Coherent Creative Blueprint synthesized.',
    };
    state.updatedAt = new Date().toISOString();

    return state;
  }

  /**
   * Approves final blueprint and transitions to execution handoff (Phase 16/17/18).
   */
  public approveBlueprint(sessionId: string): CreativeUXState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    state.stage = 'EXECUTION';
    state.isComplete = true;
    state.thinking = {
      isProcessing: false,
      message: 'Blueprint strategy locked. Handed off to Execution Engine.',
    };
    state.updatedAt = new Date().toISOString();

    return state;
  }

  // --- Helper Methods ---

  private updateSummaryFromAnswer(
    summary: CreativeSessionSummary,
    answer: CreativeUXAnswer,
    question?: CreativeQuestionPresentation
  ): void {
    const selectedOpt = question?.options.find((o) => answer.selectedOptionIds?.includes(o.id));
    const value = answer.freeTextResponse || selectedOpt?.label || (answer.isUnsure ? 'Inferred by Mitra' : undefined);

    if (!value) return;

    switch (answer.stage) {
      case 'INTENT':
      case 'START':
        summary.campaignGoal = value;
        break;
      case 'SUBJECT':
        summary.productOrOffer = value;
        break;
      case 'AUDIENCE':
        summary.targetAudience = value;
        break;
      case 'MOTIVATION':
        summary.keyMotivation = value;
        break;
      case 'DIFFERENTIATION':
        summary.uniqueAngle = value;
        break;
    }
  }

  private determineNextStage(
    currentStage: CreativeUXStage,
    context: BusinessContextPayload,
    summary: CreativeSessionSummary
  ): CreativeUXStage {
    const stageOrder: CreativeUXStage[] = [
      'INTENT',
      'SUBJECT',
      'AUDIENCE',
      'MOTIVATION',
      'DIFFERENTIATION',
      'OPPORTUNITY',
      'CONFIRMATION',
    ];

    const currIdx = stageOrder.indexOf(currentStage);
    if (currIdx === -1 || currIdx === stageOrder.length - 1) {
      return 'CONFIRMATION';
    }

    let nextIdx = currIdx + 1;
    while (nextIdx < stageOrder.length - 1) {
      const candidateStage = stageOrder[nextIdx];
      if (this.composer.canInferStage(candidateStage, context, summary)) {
        // Automatically populate inferred value
        const inferred = this.composer.inferValue(candidateStage, context, summary);
        if (inferred) {
          this.updateSummaryFromAnswer(summary, {
            questionId: `q_inferred_${candidateStage}`,
            stage: candidateStage,
            freeTextResponse: inferred,
          });
        }
        nextIdx++;
      } else {
        break;
      }
    }

    return stageOrder[nextIdx];
  }

  private synthesizeOpportunity(state: CreativeUXState, context: BusinessContextPayload): void {
    const product = state.summary.productOrOffer || context.featuredProducts?.[0] || 'Flagship Offer';
    const audience = state.summary.targetAudience || 'Local Customers';
    const motivation = state.summary.keyMotivation || 'Great Value';
    const bizName = context.businessName || 'Your Business';

    const title = `${product} for ${audience} — ${motivation}`;
    state.summary.opportunityTitle = title;
    state.opportunity = {
      id: `opp_${Date.now()}`,
      title,
      rationale: `Positioning ${bizName}'s ${product} directly to ${audience} leveraging ${motivation}.`,
      coreTension: `${audience} want ${product} but need a strong reason to act now.`,
      targetAngle: `Highlight ${motivation} with local authenticity.`,
    };
  }

  private generateConcepts(state: CreativeUXState): CreativeConceptCard[] {
    const product = state.summary.productOrOffer || 'Special Offer';
    const audience = state.summary.targetAudience || 'Local Customers';

    return [
      {
        id: 'concept_1',
        name: 'The Family Table',
        territory: 'Togetherness & Relatability',
        tagline: `Bring Everyone Together Over ${product}`,
        emotionalAngle: 'Warmth & Connection',
        keyIdea: 'Show the messy reality of family decision-making resolving into a shared dining moment.',
        visualStyle: 'Warm ambient lighting, authentic candid candid photography',
        hookHeadline: `Finally, a ${product} everyone agrees on.`,
        tone: 'Warm & Playful',
        whyItWorks: 'Taps into universal family decision fatigue and offers an immediate peaceful resolution.',
        isDifferentiated: true,
      },
      {
        id: 'concept_2',
        name: 'Unbeatable Value Shock',
        territory: 'Unexpected Value & Urgency',
        tagline: `Premium ${product} at a Price That Breaks the Mold`,
        emotionalAngle: 'Delightful Surprise',
        keyIdea: 'Juxtapose high-end preparation with an shockingly accessible price point.',
        visualStyle: 'Bold typography, high-contrast product focus, vibrant backdrop',
        hookHeadline: `You won't believe what's included in this ${product}.`,
        tone: 'Energetic & Direct',
        whyItWorks: 'Directly addresses price sensitivity without diluting quality perception.',
        isDifferentiated: true,
      },
      {
        id: 'concept_3',
        name: 'The Local Craftsmanship Story',
        territory: 'Pride of Craft & Legacy',
        tagline: `Made Fresh Daily Right Here in Your Neighborhood`,
        emotionalAngle: 'Pride & Authenticity',
        keyIdea: 'Behind-the-scenes view of master preparation and fresh local sourcing.',
        visualStyle: 'Cinematic close-ups, rustic textures, natural daylight',
        hookHeadline: `Why ${audience} keep coming back for our ${product}.`,
        tone: 'Authentic & Earnest',
        whyItWorks: 'Builds deep brand trust and local loyalty that discount competitors cannot copy.',
        isDifferentiated: true,
      },
    ];
  }

  private synthesizeBlueprintFromConcept(state: CreativeUXState, concept: CreativeConceptCard): any {
    return {
      blueprintId: `bp_${Date.now()}`,
      version: 1,
      strategyLocked: true,
      coreIdea: concept.keyIdea,
      territory: concept.territory,
      targetAudience: state.summary.targetAudience,
      hookDirection: concept.hookHeadline,
      visualDirection: concept.visualStyle,
      tone: concept.tone,
      offerRole: 'Supporting Conversion Element',
      creativeMechanism: concept.emotionalAngle,
      approvedAt: new Date().toISOString(),
    };
  }

  private synthesizeBlueprintFromMix(
    state: CreativeUXState,
    selections: ConceptMixComponentSelection[]
  ): any {
    const getConcept = (id: string) => state.concepts?.find((c) => c.id === id);

    const ideaSelection = selections.find((s) => s.component === 'idea');
    const visualSelection = selections.find((s) => s.component === 'visual');
    const hookSelection = selections.find((s) => s.component === 'hook');
    const toneSelection = selections.find((s) => s.component === 'tone');

    const ideaConcept = ideaSelection ? getConcept(ideaSelection.conceptId) : state.concepts?.[0];
    const visualConcept = visualSelection ? getConcept(visualSelection.conceptId) : state.concepts?.[1];
    const hookConcept = hookSelection ? getConcept(hookSelection.conceptId) : state.concepts?.[2];
    const toneConcept = toneSelection ? getConcept(toneSelection.conceptId) : state.concepts?.[0];

    return {
      blueprintId: `bp_mix_${Date.now()}`,
      version: 1,
      strategyLocked: true,
      coreIdea: ideaConcept?.keyIdea || 'Synthesized strategic direction',
      territory: ideaConcept?.territory || 'Mixed Strategy Territory',
      targetAudience: state.summary.targetAudience,
      hookDirection: hookConcept?.hookHeadline || 'Synthesized headline hook',
      visualDirection: visualConcept?.visualStyle || 'Synthesized visual style',
      tone: toneConcept?.tone || 'Synthesized brand tone',
      offerRole: 'Supporting Conversion Element',
      creativeMechanism: 'Multi-concept synthesis',
      mixedFromConcepts: selections.map((s) => s.conceptId),
      approvedAt: new Date().toISOString(),
    };
  }
}

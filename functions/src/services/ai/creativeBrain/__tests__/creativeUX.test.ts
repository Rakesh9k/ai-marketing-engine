/**
 * PHASE 23 — Progressive Disclosure UX Test Suite
 * Tests conversational stage transitions, Business Brain question suppression,
 * first-class [ I'm not sure ] fallback, opportunity confirmation, concept selection,
 * concept mixing, and execution handoff.
 */

import { CreativeUXService } from '../ux/creativeUXService';
import { UXQuestionComposer } from '../ux/uxQuestionComposer';

describe('PHASE 23 — Progressive Disclosure UX Engine', () => {
  let uxService: CreativeUXService;

  beforeEach(() => {
    uxService = new CreativeUXService();
    uxService.registerBusinessContext({
      businessId: 'biz_spicy_bites',
      businessName: 'Spicy Bites Bistro',
      category: 'Casual Dining',
      featuredProducts: ['Weekend Thali Special', 'Butter Chicken Combo', 'Chef Dessert Platter'],
      targetAudienceSegments: ['Local Families', 'Working Professionals', 'College Students'],
      brandTone: 'Warm & Festive',
    });
  });

  describe('Initial Session Creation & Intent Stage', () => {
    it('starts at INTENT stage with "What are we creating today?" conversation prompt', () => {
      const state = uxService.startSession('tenant_123', 'biz_spicy_bites');

      expect(state.sessionId).toBeDefined();
      expect(state.stage).toBe('INTENT');
      expect(state.currentQuestion).toBeDefined();
      expect(state.currentQuestion?.text).toContain('What are we creating for Spicy Bites Bistro today?');
      expect(state.currentQuestion?.options.length).toBeGreaterThanOrEqual(4);
    });

    it('provides [ I\'m not sure ] as a first-class option', () => {
      const state = uxService.startSession('tenant_123', 'biz_spicy_bites');
      const unsureOpt = state.currentQuestion?.options.find((o) => o.isUnsure);

      expect(unsureOpt).toBeDefined();
      expect(unsureOpt?.label).toContain("I'm not sure");
      expect(state.currentQuestion?.allowUnsure).toBe(true);
    });

    it('accepts initial prompt and initializes summary context', () => {
      const state = uxService.startSession('tenant_123', 'biz_spicy_bites', 'Promote Friday Thali Festival');

      expect(state.summary.campaignGoal).toBe('Promote Friday Thali Festival');
      expect(state.summary.businessName).toBe('Spicy Bites Bistro');
    });
  });

  describe('Question Suppression & Business Brain Integration', () => {
    it('suppresses redundant audience questions when Business Brain already provides target segments', () => {
      const composer = new UXQuestionComposer();
      const ctx = {
        businessId: 'biz_1',
        targetAudienceSegments: ['Local Families'],
      };
      const summary = {
        targetAudience: 'Local Families',
      };

      const canInfer = composer.canInferStage('AUDIENCE', ctx, summary);
      expect(canInfer).toBe(true);
    });

    it('does not re-ask product question if product focus was already selected in initial summary', () => {
      const composer = new UXQuestionComposer();
      const summary = { productOrOffer: 'Weekend Thali Special' };

      const canInfer = composer.canInferStage('SUBJECT', { businessId: 'biz_1' }, summary);
      expect(canInfer).toBe(true);
    });
  });

  describe('Conversational Stage Progression Flow', () => {
    it('progresses smoothly through stages when answering questions', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');

      // 1. Answer INTENT
      state = uxService.answerQuestion(state.sessionId, {
        questionId: state.currentQuestion!.questionId,
        stage: 'INTENT',
        selectedOptionIds: ['opt_sales'],
      });

      expect(state.summary.campaignGoal).toBeDefined();

      // 2. Answer SUBJECT
      if (state.stage === 'SUBJECT') {
        state = uxService.answerQuestion(state.sessionId, {
          questionId: state.currentQuestion!.questionId,
          stage: 'SUBJECT',
          selectedOptionIds: ['opt_prod_0'],
        });
      }

      // 3. Answer MOTIVATION
      if (state.stage === 'MOTIVATION') {
        state = uxService.answerQuestion(state.sessionId, {
          questionId: state.currentQuestion!.questionId,
          stage: 'MOTIVATION',
          selectedOptionIds: ['opt_mot_value'],
        });
      }

      // Reaches CONFIRMATION stage
      expect(['OPPORTUNITY', 'CONFIRMATION', 'DIFFERENTIATION']).toContain(state.stage);
    });

    it('handles [ I\'m not sure ] response gracefully without breaking execution', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');

      state = uxService.answerQuestion(state.sessionId, {
        questionId: state.currentQuestion!.questionId,
        stage: 'INTENT',
        isUnsure: true,
      });

      expect(state.summary.campaignGoal).toBe('Inferred by Mitra');
      expect(state.history.length).toBe(1);
    });
  });

  describe('Strategic Opportunity Confirmation & Concept Generation', () => {
    it('synthesizes strategic opportunity and generates candidate concepts upon approval', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');

      // Advance to confirmation
      state = uxService.answerQuestion(state.sessionId, {
        questionId: state.currentQuestion!.questionId,
        stage: 'INTENT',
        selectedOptionIds: ['opt_sales'],
      });

      // Force opportunity synthesis & confirmation
      state = uxService.confirmOpportunity(state.sessionId, true);

      expect(state.stage).toBe('CONCEPTS');
      expect(state.concepts).toBeDefined();
      expect(state.concepts?.length).toBe(3);

      const conceptNames = state.concepts?.map((c) => c.name);
      expect(conceptNames).toContain('The Family Table');
      expect(conceptNames).toContain('Unbeatable Value Shock');
      expect(conceptNames).toContain('The Local Craftsmanship Story');
    });

    it('allows strategic opportunity adjustment before concept generation', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');

      state = uxService.confirmOpportunity(state.sessionId, false, 'Focus on authentic organic ingredients');

      expect(state.stage).toBe('CONFIRMATION');
      expect(state.summary.uniqueAngle).toBe('Focus on authentic organic ingredients');
    });
  });

  describe('Concept Selection & Blueprint Synthesis', () => {
    it('creates locked Creative Blueprint when user selects a single concept', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');
      state = uxService.confirmOpportunity(state.sessionId, true);

      const chosenConceptId = state.concepts![0].id;
      state = uxService.selectConcept(state.sessionId, chosenConceptId);

      expect(state.stage).toBe('BLUEPRINT');
      expect(state.selectedConceptId).toBe(chosenConceptId);
      expect(state.mixedBlueprint).toBeDefined();
      expect(state.mixedBlueprint.strategyLocked).toBe(true);
      expect(state.summary.hasBlueprint).toBe(true);
    });

    it('synthesizes a new coherent Creative Blueprint when user mixes concepts (Phase 15)', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');
      state = uxService.confirmOpportunity(state.sessionId, true);

      state = uxService.mixConcepts(state.sessionId, [
        { conceptId: 'concept_1', component: 'idea' },
        { conceptId: 'concept_2', component: 'visual' },
        { conceptId: 'concept_3', component: 'hook' },
      ]);

      expect(state.stage).toBe('BLUEPRINT');
      expect(state.mixedBlueprint).toBeDefined();
      expect(state.mixedBlueprint.strategyLocked).toBe(true);
      expect(state.mixedBlueprint.mixedFromConcepts).toEqual(['concept_1', 'concept_2', 'concept_3']);
    });
  });

  describe('Execution Engine Handoff', () => {
    it('hands off locked blueprint to execution pipeline when approved', () => {
      let state = uxService.startSession('tenant_123', 'biz_spicy_bites');
      state = uxService.confirmOpportunity(state.sessionId, true);
      state = uxService.selectConcept(state.sessionId, state.concepts![0].id);

      state = uxService.approveBlueprint(state.sessionId);

      expect(state.stage).toBe('EXECUTION');
      expect(state.isComplete).toBe(true);
      expect(state.thinking.message).toContain('Handed off to Execution Engine');
    });
  });
});

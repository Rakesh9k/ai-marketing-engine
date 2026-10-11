/**
 * PHASE 25 — Uncertainty Engine Test Suite
 * Tests "I'm not sure", candidate generation, cognitive frame simplification,
 * user delegation ("Let Mitra decide"), "None of these" handling, max attempt budgets,
 * confidence preservation, and Golden Tests (#58 to #64).
 */

import { UncertaintyService } from '../uncertainty/uncertaintyService';
import { ConfidenceEngine } from '../confidence/confidenceEngine';

describe('PHASE 25 — Uncertainty Engine', () => {
  let uncertaintyService: UncertaintyService;
  let confidenceEngine: ConfidenceEngine;

  const mockBusinessContext = {
    businessId: 'biz_spicy_bites',
    businessName: 'Spicy Bites Bistro',
    category: 'Casual Dining',
    featuredProducts: ['Weekend Thali Special', 'Butter Chicken Combo'],
    targetAudienceSegments: ['Local Families', 'Working Professionals'],
    differentiators: ['Zero Wait Time & Speedy Delivery', 'Fresh Local Sourcing Daily'],
    proofPoints: ['Voted Best Local Thali 2025'],
  };

  beforeEach(() => {
    confidenceEngine = new ConfidenceEngine();
    uncertaintyService = new UncertaintyService(confidenceEngine);
  });

  describe('1. Golden Test #58 — Buying Motivation Uncertainty', () => {
    it('acknowledges uncertainty and generates grounded choices from Business Brain context', () => {
      const res = uncertaintyService.handleUserUncertainty(
        'sess_1',
        'camp_1',
        'q_motivation',
        'CUSTOMER_INSIGHT',
        mockBusinessContext
      );

      expect(res.acknowledgementMessage).toContain("That's okay");
      expect(res.options.length).toBeGreaterThanOrEqual(4);

      const labels = res.options.map((o) => o.label);
      expect(labels).toContain('Convenience & Quick Service');
      expect(labels).toContain('None of these');
      expect(labels).toContain('Let Mitra decide');
    });
  });

  describe('2. Golden Test #59 — Differentiator Proof Simplification', () => {
    it('simplifies abstract differentiator question into concrete compliments/proof question', () => {
      const res = uncertaintyService.handleUserUncertainty(
        'sess_2',
        'camp_2',
        'q_differentiator',
        'DIFFERENTIATOR',
        mockBusinessContext
      );

      expect(res.promptText).toContain('What do customers usually compliment');
      expect(res.options.length).toBeGreaterThan(0);
    });
  });

  describe('3. Golden Test #60 — Repeated Uncertainty & Attempt Budget', () => {
    it('switches to Mitra Recommendation after maximum uncertainty attempts (no infinite loop)', () => {
      // Attempt 1
      uncertaintyService.handleUserUncertainty(
        'sess_3',
        'camp_3',
        'q_diff',
        'DIFFERENTIATOR',
        mockBusinessContext
      );

      // Attempt 2
      uncertaintyService.handleUserUncertainty(
        'sess_3',
        'camp_3',
        'q_diff',
        'DIFFERENTIATOR',
        mockBusinessContext
      );

      // Attempt 3 (Max reached)
      const res3 = uncertaintyService.handleUserUncertainty(
        'sess_3',
        'camp_3',
        'q_diff',
        'DIFFERENTIATOR',
        mockBusinessContext
      );

      expect(res3.status).toBe('PROVISIONAL');
      expect(res3.attemptsRemaining).toBe(0);
      expect(res3.promptText).toContain('working direction');
      expect(res3.provisionalRecommendation).toBeDefined();
    });
  });

  describe('4. Golden Test #61 — "None of these" Handling', () => {
    it('reframes cognitive frame when user selects "None of these" without forcing prior options', () => {
      const res = uncertaintyService.handleNoneOfThese(
        'sess_4',
        'camp_4',
        'q_mot',
        'CUSTOMER_INSIGHT',
        mockBusinessContext
      );

      expect(res.acknowledgementMessage).toContain("Got it. Let's approach it differently");
      expect(res.promptText).toContain('last customer who left');
      expect(res.options.length).toBeGreaterThan(0);
    });
  });

  describe('5. Golden Test #62 — User Delegation ("Let Mitra decide")', () => {
    it('creates provisional recommendation and updates confidence engine when user delegates', () => {
      confidenceEngine.initializeConfidenceState('tenant_default', 'biz_spicy_bites', 'camp_5');

      const res = uncertaintyService.handleUserDelegation(
        'sess_5',
        'camp_5',
        'q_audience',
        'AUDIENCE',
        mockBusinessContext
      );

      expect(res.status).toBe('USER_DELEGATED');
      expect(res.provisionalRecommendation).toBeDefined();

      const confidenceState = confidenceEngine.getConfidenceState('camp_5');
      expect(confidenceState?.dimensions.AUDIENCE.score).toBeGreaterThan(0.0);
    });
  });

  describe('6. Golden Test #63 — Low Importance Uncertainty', () => {
    it('does not block strategic readiness when optional non-blocking dimension is uncertain', () => {
      const state = confidenceEngine.initializeConfidenceState('tenant_default', 'biz_spicy_bites', 'camp_6', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'High' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.95, explanation: 'High' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.98, explanation: 'High' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: 'High' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'USER_EXPLICIT', strength: 0.88, explanation: 'High' },
        { dimension: 'DIFFERENTIATOR', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'High' },
      ]);

      // User says "I'm not sure" for non-blocking CTA
      uncertaintyService.handleUserUncertainty(
        'sess_6',
        'camp_6',
        'q_cta',
        'CTA',
        mockBusinessContext
      );

      expect(state.overallReadiness.ready).toBe(true);
    });
  });

  describe('7. Golden Test #64 — High Importance Uncertainty', () => {
    it('requires resolution for weak blocking dimension before readiness is achieved', () => {
      const state = confidenceEngine.initializeConfidenceState('tenant_default', 'biz_spicy_bites', 'camp_7', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'High' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.95, explanation: 'High' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.98, explanation: 'High' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: 'High' },
      ]);

      // DIFFERENTIATOR is uncertain and blocking
      expect(state.overallReadiness.ready).toBe(false);

      // Resolve via candidate selection
      const res = uncertaintyService.handleUserUncertainty(
        'sess_7',
        'camp_7',
        'q_diff',
        'DIFFERENTIATOR',
        mockBusinessContext
      );

      uncertaintyService.resolveCandidateSelection(
        'sess_7',
        'camp_7',
        'DIFFERENTIATOR',
        res.candidates[0],
        mockBusinessContext
      );

      const updatedState = confidenceEngine.getConfidenceState('camp_7');
      expect(updatedState?.dimensions.DIFFERENTIATOR.score).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('8. Confidence Preservation on Uncertainty', () => {
    it('preserves existing system evidence when user says "I\'m not sure"', () => {
      confidenceEngine.initializeConfidenceState('tenant_default', 'biz_spicy_bites', 'camp_8', [
        { dimension: 'CUSTOMER_INSIGHT', source: 'BUSINESS_BRAIN', strength: 0.70, explanation: 'Existing insight' },
      ]);

      const stateBefore = confidenceEngine.getConfidenceState('camp_8');
      const scoreBefore = stateBefore?.dimensions.CUSTOMER_INSIGHT.score;

      uncertaintyService.handleUserUncertainty(
        'sess_8',
        'camp_8',
        'q_insight',
        'CUSTOMER_INSIGHT',
        mockBusinessContext
      );

      const stateAfter = confidenceEngine.getConfidenceState('camp_8');
      expect(stateAfter?.dimensions.CUSTOMER_INSIGHT.score).toEqual(scoreBefore);
    });
  });
});

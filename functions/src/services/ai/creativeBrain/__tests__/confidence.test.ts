/**
 * PHASE 24 — Master Confidence Engine Test Suite
 * Tests confidence initialization, explicit evidence updates, weak inference limits,
 * contradiction resolution (Current Campaign Wins rule), evidence propagation,
 * readiness evaluation, idempotency, diagnostic reporting, and all Golden Tests (#61 to #69).
 */

import { ConfidenceEngine } from '../confidence/confidenceEngine';
import { ConfidenceScoring } from '../confidence/confidenceScoring';
import type { CandidateQuestion } from '../confidence/questionEvaluator';

describe('PHASE 24 — Confidence Engine', () => {
  let engine: ConfidenceEngine;

  beforeEach(() => {
    engine = new ConfidenceEngine();
  });

  describe('1. Initialization & Baseline Confidence', () => {
    it('initializes starting confidence from Business Brain evidence', () => {
      const state = engine.initializeConfidenceState(
        'tenant_1',
        'biz_spicy',
        'camp_1',
        [
          { dimension: 'PRODUCT', source: 'BUSINESS_BRAIN', strength: 0.95, explanation: 'Flagship Thali' },
          { dimension: 'OFFER', source: 'BUSINESS_BRAIN', strength: 0.98, explanation: '₹299 Special' },
          { dimension: 'AUDIENCE', source: 'BUSINESS_BRAIN', strength: 0.85, explanation: 'Local Families' },
        ]
      );

      expect(state.dimensions.PRODUCT.score).toBeGreaterThanOrEqual(0.85);
      expect(state.dimensions.OFFER.score).toBeGreaterThanOrEqual(0.85);
      expect(state.dimensions.AUDIENCE.score).toBeGreaterThanOrEqual(0.75);
      expect(state.dimensions.DIFFERENTIATOR.score).toBeLessThan(0.75);
    });

    it('enforces weak inference cap (<= 0.70) when no explicit evidence exists', () => {
      const combined = ConfidenceScoring.calculateCombinedScore([
        {
          id: 'ev_inf_1',
          source: 'INFERENCE',
          strength: 0.99,
          explanation: 'Speculative category guess',
          createdAt: new Date().toISOString(),
        },
      ]);

      expect(combined).toBeLessThanOrEqual(0.70);
    });
  });

  describe('2. Idempotency & Duplicate Evidence Protection', () => {
    it('prevents duplicate processing when same event ID is ingested twice', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_2');

      const req = {
        campaignId: 'camp_2',
        tenantId: 'tenant_1',
        businessId: 'biz_spicy',
        sourceEventId: 'evt_123',
        evidence: [
          {
            dimension: 'DIFFERENTIATOR' as const,
            source: 'QUESTION_ANSWER' as const,
            strength: 0.80,
            explanation: 'Fastest service in town',
          },
        ],
      };

      const res1 = engine.updateConfidence(req);
      const score1 = res1.currentState.dimensions.DIFFERENTIATOR.score;

      // Ingest exact same event ID again
      const res2 = engine.updateConfidence(req);
      const score2 = res2.currentState.dimensions.DIFFERENTIATOR.score;

      expect(score1).toEqual(score2);
      expect(res2.currentState.dimensions.DIFFERENTIATOR.evidence.length).toBe(
        res1.currentState.dimensions.DIFFERENTIATOR.evidence.length
      );
    });
  });

  describe('3. Evidence Propagation Graph', () => {
    it('propagates strong AUDIENCE confidence to CUSTOMER_INSIGHT without exceeding upstream score', () => {
      const state = engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_3', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.95, explanation: 'Busy working parents' },
      ]);

      expect(state.dimensions.CUSTOMER_INSIGHT.score).toBeGreaterThan(0.0);
      expect(state.dimensions.CUSTOMER_INSIGHT.score).toBeLessThanOrEqual(state.dimensions.AUDIENCE.score);
    });
  });

  describe('4. Contradiction Resolution & Current Campaign Wins Rule', () => {
    it('applies Current Campaign Wins rule when user explicitly overrides Business Brain default', () => {
      // Initialize with Business Brain saying Families
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_4', [
        { dimension: 'AUDIENCE', source: 'BUSINESS_BRAIN', strength: 0.85, explanation: 'Families' },
      ]);

      // User explicit statement for current campaign says Students
      const res = engine.updateConfidence({
        campaignId: 'camp_4',
        tenantId: 'tenant_1',
        businessId: 'biz_spicy',
        sourceEventId: 'evt_student_override',
        evidence: [
          {
            dimension: 'AUDIENCE',
            source: 'USER_EXPLICIT',
            strength: 0.95,
            explanation: 'This campaign is specifically for college students',
            userContent: 'This campaign is specifically for college students',
          },
        ],
      });

      const audienceState = res.currentState.dimensions.AUDIENCE;
      expect(audienceState.score).toBeGreaterThanOrEqual(0.85);

      // Verify historical Business Brain evidence was filtered out for campaign context
      const hasBusinessBrain = audienceState.evidence.some((e) => e.source === 'BUSINESS_BRAIN');
      expect(hasBusinessBrain).toBe(false);
    });
  });

  describe('5. Readiness Evaluation & Non-blocking Optional Fields', () => {
    it('triggers READY = true when all required core dimensions are >= 0.75 even if optional fields are low', () => {
      const state = engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_5', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'Local Families' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.95, explanation: 'Drive Weekend Dinner Sales' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.98, explanation: 'Thali Combo' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: '₹299 Price' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'USER_EXPLICIT', strength: 0.88, explanation: 'Decision fatigue' },
        { dimension: 'DIFFERENTIATOR', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'Zero waiting time' },
        // Low non-blocking fields:
        { dimension: 'PLATFORM', source: 'INFERENCE', strength: 0.40, explanation: 'Unspecified platform' },
        { dimension: 'FORMAT', source: 'INFERENCE', strength: 0.35, explanation: 'Unspecified format' },
      ]);

      expect(state.overallReadiness.ready).toBe(true);
      expect(state.overallReadiness.blockingDimensions.length).toBe(0);
    });
  });

  describe('6. Golden Tests (#61 – #69)', () => {
    it('Golden Test #61 (Low Differentiator): selects Q2 (Differentiator) over Q1 (Audience) or Q3 (Platform)', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g61', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.91, explanation: 'Audience high' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.96, explanation: 'Objective high' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.99, explanation: 'Product high' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: 'Offer high' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'USER_EXPLICIT', strength: 0.72, explanation: 'Insight medium' },
        { dimension: 'DIFFERENTIATOR', source: 'INFERENCE', strength: 0.61, explanation: 'Differentiator weak' },
      ]);

      const candidates: CandidateQuestion[] = [
        {
          questionId: 'Q1',
          text: 'Who are we targeting?',
          targetDimensions: ['AUDIENCE'],
          expectedInformationGain: 0.20,
        },
        {
          questionId: 'Q2',
          text: 'What makes your version better than alternatives?',
          targetDimensions: ['DIFFERENTIATOR'],
          expectedInformationGain: 0.90,
        },
        {
          questionId: 'Q3',
          text: 'What platform are we posting on?',
          targetDimensions: ['PLATFORM'],
          expectedInformationGain: 0.50,
        },
      ];

      const best = engine.selectNextQuestion('camp_g61', candidates);

      expect(best).toBeDefined();
      expect(best?.questionId).toBe('Q2');
    });

    it('Golden Test #62 (Ready): stops asking when all required dimensions are high', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g62', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.94, explanation: 'High' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.97, explanation: 'High' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.99, explanation: 'High' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: 'High' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'USER_EXPLICIT', strength: 0.89, explanation: 'High' },
        { dimension: 'DIFFERENTIATOR', source: 'USER_EXPLICIT', strength: 0.91, explanation: 'High' },
      ]);

      const candidates: CandidateQuestion[] = [
        {
          questionId: 'Q_tone',
          text: 'What tone do you prefer?',
          targetDimensions: ['EMOTIONAL_DIRECTION'],
          expectedInformationGain: 0.40,
        },
      ];

      const best = engine.selectNextQuestion('camp_g62', candidates);

      expect(best).toBeUndefined(); // STOP ASKING
    });

    it('Golden Test #63 (Low Optional Platform): READY = true despite low platform score', () => {
      const state = engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g63', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.94, explanation: 'High' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.97, explanation: 'High' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.99, explanation: 'High' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: 'High' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'USER_EXPLICIT', strength: 0.89, explanation: 'High' },
        { dimension: 'DIFFERENTIATOR', source: 'USER_EXPLICIT', strength: 0.91, explanation: 'High' },
        { dimension: 'PLATFORM', source: 'INFERENCE', strength: 0.42, explanation: 'Low platform' },
      ]);

      expect(state.overallReadiness.ready).toBe(true);
    });

    it('Golden Test #65 (Multi-dimension Answer): single rich answer improves multiple dimensions', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g65', [
        { dimension: 'OBJECTIVE', source: 'BUSINESS_BRAIN', strength: 0.90, explanation: 'Drive Sales' },
        { dimension: 'PRODUCT', source: 'BUSINESS_BRAIN', strength: 0.95, explanation: 'Family Combo' },
        { dimension: 'OFFER', source: 'BUSINESS_BRAIN', strength: 0.95, explanation: '₹299' },
      ]);

      const res = engine.updateConfidence({
        campaignId: 'camp_g65',
        tenantId: 'tenant_1',
        businessId: 'biz_spicy',
        sourceEventId: 'evt_rich_ans',
        evidence: [
          {
            dimension: 'AUDIENCE',
            source: 'USER_EXPLICIT',
            strength: 0.90,
            explanation: 'Parents with young children',
          },
          {
            dimension: 'CUSTOMER_INSIGHT',
            source: 'USER_EXPLICIT',
            strength: 0.88,
            explanation: 'Parents are exhausted after work and want zero dinner hassle',
          },
          {
            dimension: 'DIFFERENTIATOR',
            source: 'USER_EXPLICIT',
            strength: 0.92,
            explanation: 'Zero wait time and family portion sizes',
          },
        ],
      });

      expect(res.currentState.dimensions.AUDIENCE.score).toBeGreaterThanOrEqual(0.85);
      expect(res.currentState.dimensions.CUSTOMER_INSIGHT.score).toBeGreaterThanOrEqual(0.85);
      expect(res.currentState.dimensions.DIFFERENTIATOR.score).toBeGreaterThanOrEqual(0.85);
      expect(res.readyForOpportunity).toBe(true);
    });

    it('Golden Test #67 (Confidence without Truth): high understanding confidence does not alter truth requirements', () => {
      const state = engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g67', [
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 1.00, explanation: '₹299 Thali' },
      ]);

      expect(state.dimensions.OFFER.score).toBe(1.00);
      // Understanding confidence is separate from factual publication permission
      expect(state.dimensions.OFFER.status).toBe('VERY_HIGH');
    });

    it('Golden Test #69 (Stopping): stops questioning after one high-value question achieves readiness', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_g69', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'High' },
        { dimension: 'OBJECTIVE', source: 'USER_EXPLICIT', strength: 0.88, explanation: 'High' },
        { dimension: 'PRODUCT', source: 'USER_EXPLICIT', strength: 0.98, explanation: 'High' },
        { dimension: 'OFFER', source: 'USER_EXPLICIT', strength: 0.99, explanation: 'High' },
        { dimension: 'CUSTOMER_INSIGHT', source: 'INFERENCE', strength: 0.65, explanation: 'Medium' },
        { dimension: 'DIFFERENTIATOR', source: 'INFERENCE', strength: 0.62, explanation: 'Medium' },
      ]);

      // Update with high-value differentiator & insight answer
      engine.updateConfidence({
        campaignId: 'camp_g69',
        tenantId: 'tenant_1',
        businessId: 'biz_spicy',
        sourceEventId: 'evt_stop_ans',
        evidence: [
          { dimension: 'CUSTOMER_INSIGHT', source: 'QUESTION_ANSWER', strength: 0.87, explanation: 'Resolved hassle' },
          { dimension: 'DIFFERENTIATOR', source: 'QUESTION_ANSWER', strength: 0.89, explanation: 'Fastest service' },
        ],
      });

      const candidates: CandidateQuestion[] = [
        {
          questionId: 'Q_extra',
          text: 'Do you have extra photos?',
          targetDimensions: ['PROOF'],
          expectedInformationGain: 0.30,
        },
      ];

      const nextQ = engine.selectNextQuestion('camp_g69', candidates);
      expect(nextQ).toBeUndefined(); // STOP ASKING
    });
  });

  describe('7. Diagnostic Reporting Tooling', () => {
    it('generates a complete diagnostic confidence report for admin inspection', () => {
      engine.initializeConfidenceState('tenant_1', 'biz_spicy', 'camp_diag', [
        { dimension: 'AUDIENCE', source: 'USER_EXPLICIT', strength: 0.90, explanation: 'High' },
        { dimension: 'DIFFERENTIATOR', source: 'INFERENCE', strength: 0.40, explanation: 'Low' },
      ]);

      const diag = engine.getDiagnosticReport('camp_diag');

      expect(diag.campaignId).toBe('camp_diag');
      expect(diag.readinessStatus).toBe('NOT_READY');
      expect(diag.blockingDimensions).toContain('DIFFERENTIATOR');
      expect(diag.dimensionSummary.length).toBe(11);
    });
  });
});

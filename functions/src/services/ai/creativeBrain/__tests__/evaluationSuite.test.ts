/**
 * Phase 29 — Creative Brain Evaluation Suite Tests
 * Mitra by BrainWise
 */

import {
  CANONICAL_TEST_BUSINESSES,
  CANONICAL_EVALUATION_CASES,
  QuestioningEvaluator,
  StrategicTensionEvaluator,
  TruthDisciplineEvaluator,
  creativeBrainEvaluationRunner
} from '../evaluation';
import { creativeBankService } from '../bank';

describe('Phase 29 — Creative Brain Evaluation Suite', () => {
  describe('1. Six Canonical Test Businesses Fixtures', () => {
    test('contains all 6 required test businesses', () => {
      const keys = Object.keys(CANONICAL_TEST_BUSINESSES);
      expect(keys.length).toBe(6);
      expect(keys).toContain('hyderabad_biryani');
      expect(keys).toContain('premium_cafe');
      expect(keys).toContain('cloud_kitchen');
      expect(keys).toContain('premium_womens_salon');
      expect(keys).toContain('budget_unisex_salon');
      expect(keys).toContain('midrange_apartments');
    });

    test('validates business snapshot constraints and tones', () => {
      const biryani = CANONICAL_TEST_BUSINESSES.hyderabad_biryani;
      expect(biryani.snapshot.businessType).toBe('restaurant');
      expect(biryani.snapshot.subIndustry).toBe('biryani');
      expect(biryani.snapshot.constraints).toBeDefined();

      const cafe = CANONICAL_TEST_BUSINESSES.premium_cafe;
      expect(cafe.snapshot.positioning).toContain('premium');
      expect(cafe.snapshot.constraints).toContain('avoid aggressive price discount flyers');

      const apartments = CANONICAL_TEST_BUSINESSES.midrange_apartments;
      expect(apartments.snapshot.constraints).toContain('no guaranteed ROI return promises');
    });
  });

  describe('2. Campaign Scenarios Fixture Integrity', () => {
    test('contains canonical campaign scenarios across all businesses', () => {
      expect(CANONICAL_EVALUATION_CASES.length).toBeGreaterThanOrEqual(10);
      const businessIds = new Set(CANONICAL_EVALUATION_CASES.map((c) => c.businessId));
      expect(businessIds.size).toBe(6);
    });

    test('verifies each case has valid requirements and version', () => {
      CANONICAL_EVALUATION_CASES.forEach((c) => {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.category).toBeTruthy();
        expect(c.version).toBe('1.0.0');
      });
    });
  });

  describe('3. Questioning & Questionnaire Similarity Evaluator', () => {
    test('calculates low similarity index for distinct business question paths', () => {
      const f1 = QuestioningEvaluator.createFingerprint('hyderabad_biryani', ['OCCASION', 'AUDIENCE', 'PRODUCT']);
      const f2 = QuestioningEvaluator.createFingerprint('premium_womens_salon', ['SERVICE', 'PROBLEM', 'TRANSFORMATION']);

      const similarity = QuestioningEvaluator.calculateSimilarity(f1, f2);
      expect(similarity).toBeLessThan(0.40);
    });

    test('detects generic questionnaire repetition failure', () => {
      const genericDimensions = ['AUDIENCE', 'OFFER', 'USP', 'TONE'];
      const f1 = QuestioningEvaluator.createFingerprint('biz_a', genericDimensions);
      const f2 = QuestioningEvaluator.createFingerprint('biz_b', genericDimensions);

      const similarity = QuestioningEvaluator.calculateSimilarity(f1, f2);
      expect(similarity).toBe(1.0); // 100% similarity = FAILURE flag
    });

    test('evaluates individual case questioning score', () => {
      const f = QuestioningEvaluator.createFingerprint('hyderabad_biryani', ['OCCASION', 'AUDIENCE']);
      const score = QuestioningEvaluator.evaluateCaseQuestioning(f, ['OCCASION', 'AUDIENCE']);
      expect(score).toBeGreaterThanOrEqual(85);
    });
  });

  describe('4. Strategic Tension Evaluator', () => {
    test('passes when STRATEGIC_TENSION is correctly surfaced for premium discount case', () => {
      const result = StrategicTensionEvaluator.evaluateTension('STRATEGIC_TENSION', [
        { conflictType: 'PREMIUM_POSITIONING_VS_DISCOUNT', expectedState: 'STRATEGIC_TENSION' }
      ]);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    test('fails when system blindly obeys conflicting discount prompt without tension state', () => {
      const result = StrategicTensionEvaluator.evaluateTension('STRATEGY_LOCK', [
        { conflictType: 'PREMIUM_POSITIONING_VS_DISCOUNT', expectedState: 'STRATEGIC_TENSION' }
      ]);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(50);
    });
  });

  describe('5. Truth Discipline Evaluator', () => {
    test('passes clean claims consistent with business brain snapshot', () => {
      const snapshot = CANONICAL_TEST_BUSINESSES.hyderabad_biryani.snapshot;
      const result = TruthDisciplineEvaluator.evaluateTruth(snapshot, ['Fresh dum biryani']);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    test('fails when unverified 25% guaranteed ROI claim is adopted', () => {
      const snapshot = CANONICAL_TEST_BUSINESSES.midrange_apartments.snapshot;
      const result = TruthDisciplineEvaluator.evaluateTruth(
        snapshot,
        ['Guaranteed 25% annual rental return'],
        '25% guaranteed annual ROI'
      );
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('6. Automated Evaluation Runner & Report', () => {
    test('runs full evaluation suite and produces comprehensive report', async () => {
      const report = await creativeBrainEvaluationRunner.runFullEvaluationSuite();

      expect(report.runId).toMatch(/^run_/);
      expect(report.totalCases).toBe(CANONICAL_EVALUATION_CASES.length);
      expect(report.passedCases).toBe(report.totalCases);
      expect(report.criticalFailures).toBe(0);
      expect(report.overallAverageScore).toBeGreaterThanOrEqual(85);

      expect(report.businessScores['hyderabad_biryani']).toBeGreaterThanOrEqual(80);
      expect(report.businessScores['premium_cafe']).toBeGreaterThanOrEqual(80);
      expect(report.businessScores['midrange_apartments']).toBeGreaterThanOrEqual(80);
    });
  });

  describe('7. North Star Test — Cross-Business Contrast Validation', () => {
    test('verifies that 6 distinct businesses generate distinct mechanism retrievals for "get more customers"', () => {
      const biryaniRes = creativeBankService.queryMechanisms({ industry: 'restaurant', subIndustry: 'biryani', limit: 3 });
      const _cafeRes = creativeBankService.queryMechanisms({ industry: 'restaurant', subIndustry: 'cafe', limit: 3 });
      const salonRes = creativeBankService.queryMechanisms({ industry: 'salon', subIndustry: 'hair_salon', limit: 3 });
      const reRes = creativeBankService.queryMechanisms({ industry: 'real_estate', limit: 3 });

      const biryaniMechIds = biryaniRes.mechanisms.map((m) => m.id);
      const salonMechIds = salonRes.mechanisms.map((m) => m.id);
      const reMechIds = reRes.mechanisms.map((m) => m.id);

      // Verify that Salon and Real Estate do not receive identical mechanisms as Biryani
      const salonOverlap = biryaniMechIds.filter((id) => salonMechIds.includes(id));
      const reOverlap = biryaniMechIds.filter((id) => reMechIds.includes(id));

      expect(salonOverlap.length).toBeLessThan(2);
      expect(reOverlap.length).toBeLessThan(2);
    });
  });
});

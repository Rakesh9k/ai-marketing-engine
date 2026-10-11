/**
 * PHASE 20 — Critic-Driven Creative Regeneration & Improvement Loop Tests
 * Verifies closed-loop iteration, targeted dimension regeneration, bounded revision budget,
 * regression protection/rollback, and credit-safe execution.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  CriticImprovementLoop,
  CreativeCriticService,
  ExecutionJobRunner,
  ExecutionPlanner,
  RegressionDetector,
  RevisionPlanner,
  StrategyFidelityService,
  StrategyLockService,
  type CreativeCriticResult,
  type CriticDimensionName,
  type CriticDimension,
} from '../index';

describe('Phase 20 — Critic-Driven Improvement Loop Suite', () => {
  let blueprintService: CreativeBlueprintService;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let planner: ExecutionPlanner;
  let jobRunner: ExecutionJobRunner;
  let criticService: CreativeCriticService;
  let revisionPlanner: RevisionPlanner;
  let regressionDetector: RegressionDetector;
  let improvementLoop: CriticImprovementLoop;

  let mockBlueprint: CreativeBlueprint;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_loop_001',
    businessBrain: {
      businessId: 'biz_loop_dining',
      tenantId: 'tenant_123',
      name: 'Mitra Grand Kitchen',
      industry: 'restaurant',
      subVertical: 'family_dining',
      positioning: 'Authentic regional family dining with zero compromise on freshness',
      brandVoice: {
        tone: 'Warm, hospitable, authentic',
        formality: 'CASUAL',
        languagePreference: 'English',
        forbiddenWords: ['cheap'],
        allowedClaims: ['Family Combos'],
      },
      verifiedEvidence: {
        hasTestimonials: true,
        hasReviewCount: true,
        reviewRating: 4.8,
        hasStatedExpiry: false,
        hasInventoryLimit: false,
        verifiedClaims: ['4.8 Star Rated'],
      },
    },
    campaignIntent: {
      intentId: 'intent_family_dinner',
      campaignObjective: 'ACQUISITION',
      decisionStage: 'CONSIDERATION',
      targetAudience: 'Families in Jubilee Hills',
      audienceSituation: 'Deciding where to take the family for Sunday dinner',
      product: 'Sunday Family Feast',
      offerDetails: {
        hasOffer: true,
        offerTitle: 'Family Feast ₹299',
        offerPrice: 299,
        hasStatedExpiry: false,
        hasInventoryLimit: false,
      },
    },
    creativeOpportunity: {
      opportunityId: 'opp_family_table',
      audience: 'Families',
      problemOrDesire: 'Food decision fatigue',
      customerTension: 'Kids want pizza, parents want thali',
      emotionalTerritory: 'Relief and togetherness',
      opportunity: 'Position restaurant as the family decision solution',
      strategicRecommendation: 'Focus on family harmony',
      thingsToAvoid: ['Pure price shock poster'],
    },
  };

  const mockMixedConcept: MixedConcept = {
    id: 'mix_critic_001',
    name: 'The Family Table',
    sourceConcepts: ['c1'],
    selectedComponents: [{ component: 'coreIdea', conceptId: 'c1' }],
    synthesizedIdea: 'Where family food arguments turn into shared smiles',
    synthesizedInsight: 'Family dining is stressful when everyone wants something different',
    synthesizedEmotion: { primary: 'Relief', secondary: 'Warmth' },
    synthesizedHook: 'Can’t agree on what to eat tonight?',
    synthesizedMechanism: { name: 'Recognition -> Relief', explanation: 'Show family debate resolving happily' },
    synthesizedVisualDirection: 'Happy family sharing a multi-cuisine table spread',
    synthesizedStoryDirection: 'Order -> Serve -> Enjoy',
    synthesizedOfferIntegration: 'Family Feast Combo ₹299 as supporting proof',
    synthesizedCTA: 'Reserve Your Table',
    recommendedFormat: { primary: 'single_image' },
    recommendedPlatform: { primary: 'instagram' },
    requiredAssets: { required: ['Product photo', 'Logo'], recommended: ['Family photo'], optional: [] },
    compatibilityScore: 95,
    strategicCoherenceScore: 90,
    adaptations: [],
    conflictsResolved: [],
  };

  function createMockCriticResult(
    overallScore: number,
    decision: 'APPROVE' | 'REVISE' | 'REJECT',
    scores: Partial<Record<CriticDimensionName, number>>
  ): CreativeCriticResult {
    const makeDim = (name: CriticDimensionName, score: number): CriticDimension => ({
      name,
      score,
      weight: 0.1,
      assessment: 'GOOD',
      evidence: ['Mock evidence'],
      confidence: 0.9,
    });

    return {
      campaignId: 'camp_loop_001',
      blueprintId: 'bp_loop_001',
      blueprintVersion: 1,
      assetId: 'asset_loop_001',
      overallScore,
      decision,
      dimensions: {
        hook: makeDim('hook', scores.hook ?? 80),
        relevance: makeDim('relevance', scores.relevance ?? 80),
        originality: makeDim('originality', scores.originality ?? 80),
        businessFit: makeDim('businessFit', scores.businessFit ?? 80),
        conceptFidelity: makeDim('conceptFidelity', scores.conceptFidelity ?? 80),
        visualCommunication: makeDim('visualCommunication', scores.visualCommunication ?? 80),
        offerClarity: makeDim('offerClarity', scores.offerClarity ?? 80),
        brand: makeDim('brand', scores.brand ?? 80),
        platformFit: makeDim('platformFit', scores.platformFit ?? 80),
        conversion: makeDim('conversion', scores.conversion ?? 80),
      },
      strengths: ['Great concept fidelity'],
      weaknesses: [],
      criticalIssues: [],
      recommendations: [],
      criticVersion: '1.0.0',
      createdAt: new Date().toISOString(),
    };
  }

  beforeEach(() => {
    blueprintService = new CreativeBlueprintService();
    lockService = new StrategyLockService();
    fidelityService = new StrategyFidelityService();
    planner = new ExecutionPlanner();
    jobRunner = new ExecutionJobRunner();
    criticService = new CreativeCriticService();
    revisionPlanner = new RevisionPlanner();
    regressionDetector = new RegressionDetector();

    improvementLoop = new CriticImprovementLoop(
      planner,
      jobRunner,
      criticService,
      revisionPlanner,
      regressionDetector
    );

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
  });

  describe('Revision Planner & Component Mapping', () => {
    it('isolates target components while protecting immutable strategy components', () => {
      const mockCriticResult = createMockCriticResult(65, 'REVISE', {
        conceptFidelity: 90,
        brand: 95,
        hook: 85,
        offerClarity: 90,
        originality: 45,
        visualCommunication: 50,
      });

      const plan = revisionPlanner.buildRevisionPlan(mockCriticResult, 0);

      expect(plan.targetDimensions).toContain('originality');
      expect(plan.protectedDimensions).toContain('conceptFidelity');
      expect(plan.protectedDimensions).toContain('brand');
      expect(plan.mutableComponents).toContain('visual');
      expect(plan.mutableComponents).toContain('layout');
      expect(plan.preservationConstraints.some((c) => c.component === 'coreConcept')).toBe(true);
      expect(plan.preservationConstraints.some((c) => c.component === 'offer')).toBe(true);
    });
  });

  describe('Regression Detector', () => {
    const baselineCritic = createMockCriticResult(72, 'REVISE', {
      conceptFidelity: 85,
      brand: 80,
      hook: 75,
      offerClarity: 85,
      originality: 55,
      visualCommunication: 60,
    });

    it('accepts revision when target dimension improves without regressing protected dimensions', () => {
      const candidateCritic = createMockCriticResult(82, 'APPROVE', {
        conceptFidelity: 85,
        brand: 80,
        hook: 75,
        offerClarity: 85,
        originality: 78, // Improved!
        visualCommunication: 75,
      });

      const plan = revisionPlanner.buildRevisionPlan(baselineCritic, 0);
      const acceptance = regressionDetector.evaluateRevision(baselineCritic, candidateCritic, plan);

      expect(acceptance.accepted).toBe(true);
      expect(acceptance.reason.includes('accepted')).toBe(true);
    });

    it('rejects candidate V2 when concept fidelity regresses significantly', () => {
      const candidateCritic = createMockCriticResult(68, 'REVISE', {
        conceptFidelity: 60, // Regressed protected dimension (< 70 hard limit)!
        brand: 80,
        originality: 80,
      });

      const plan = revisionPlanner.buildRevisionPlan(baselineCritic, 0);
      const acceptance = regressionDetector.evaluateRevision(baselineCritic, candidateCritic, plan);

      expect(acceptance.accepted).toBe(false);
      expect(acceptance.regressionsDetected.length).toBeGreaterThan(0);
      expect(acceptance.reason.includes('Concept Fidelity hard failure')).toBe(true);
    });

  });

  describe('Full Master Critic Improvement Loop Integration', () => {
    it('completes initial execution and returns asset immediately if Critic approves (Score >= 80)', async () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = await improvementLoop.executePostLoop(mockBlueprint, lock, fidelityService);

      expect(result.criticIterations).toBe(1);
      expect(result.finalAsset).toBeDefined();
      expect(result.finalCriticResult.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.revisionHistory.length).toBe(1);
      expect(result.creditContext.internalRevisionsUsed).toBe(0);
    });

    it('enforces maximum automatic revision budget of 2 attempts', async () => {
      const lock = lockService.createLock(mockBlueprint);

      const lowCritic = createMockCriticResult(65, 'REVISE', {
        conceptFidelity: 80,
        brand: 80,
        originality: 40,
        visualCommunication: 50,
      });

      jest.spyOn(criticService, 'evaluateExecution').mockReturnValue(lowCritic);

      const creditContext = {
        rootGenerationId: 'root_test',
        reservedCredits: 10,
        consumedCredits: 10,
        internalRevisionBudget: 2,
        internalRevisionsUsed: 0,
      };

      const result = await improvementLoop.executePostLoop(mockBlueprint, lock, fidelityService, creditContext);

      expect(result.criticIterations).toBe(2);
      expect(result.revisionHistory.length).toBe(2);
      expect(result.creditContext.internalRevisionsUsed).toBe(1);
    });

    it('rolls back to baseline V1 asset if candidate V2 regresses', async () => {
      const lock = lockService.createLock(mockBlueprint);

      const v1Critic = createMockCriticResult(72, 'REVISE', {
        conceptFidelity: 85,
        brand: 85,
        originality: 50,
      });

      const v2Critic = createMockCriticResult(60, 'REVISE', {
        conceptFidelity: 55, // Critical regression!
        originality: 70,
      });

      jest
        .spyOn(criticService, 'evaluateExecution')
        .mockReturnValueOnce(v1Critic)
        .mockReturnValueOnce(v2Critic);

      const result = await improvementLoop.executePostLoop(mockBlueprint, lock, fidelityService);

      expect(result.revisionHistory.length).toBe(2);
      const rev1 = result.revisionHistory[1];
      expect(rev1?.acceptanceResult?.accepted).toBe(false);
      expect(rev1?.acceptanceResult?.regressionsDetected.length).toBeGreaterThan(0);
      expect(result.finalCriticResult).toBe(v1Critic); // Kept V1!
    });
  });
});

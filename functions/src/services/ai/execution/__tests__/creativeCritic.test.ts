/**
 * PHASE 19 — Creative Critic Unit & Regression Tests
 * Tests 10-dimension evaluation, evidence generation, decision engine (APPROVE, REVISE, REJECT),
 * protected strategy revision requests, and regression comparison between iterations.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  CreativeCriticService,
  ExecutionJobRunner,
  ExecutionPlanner,
  MasterValidationGate,
  StrategyFidelityService,
  StrategyLockService,
  type CreativeCriticInput,
  type FinalPostAsset,
} from '../index';

describe('Phase 19 — Creative Critic Suite', () => {
  let blueprintService: CreativeBlueprintService;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let planner: ExecutionPlanner;
  let jobRunner: ExecutionJobRunner;
  let validationGate: MasterValidationGate;
  let criticService: CreativeCriticService;
  let mockBlueprint: CreativeBlueprint;
  let mockGoldenAsset: FinalPostAsset;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_critic_001',
    businessBrain: {
      businessId: 'biz_jubilee_dining',
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

  beforeEach(async () => {
    blueprintService = new CreativeBlueprintService();
    lockService = new StrategyLockService();
    fidelityService = new StrategyFidelityService();
    planner = new ExecutionPlanner();
    validationGate = new MasterValidationGate();
    jobRunner = new ExecutionJobRunner();
    criticService = new CreativeCriticService();

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
    mockBlueprint.offer.strategicRole = 'supporting_proof';
    mockBlueprint.messageHierarchy.primaryMessage = 'Finally, a Sunday dinner where everyone agrees.';

    const lock = lockService.createLock(mockBlueprint);
    const plan = planner.createPlan(mockBlueprint, lock);
    mockGoldenAsset = await jobRunner.executePostJob(mockBlueprint, lock, plan, fidelityService);
  });

  describe('Independent Creative Critic Evaluation', () => {
    it('should evaluate a compliant golden asset and return APPROVE decision with 10 dimension scores', () => {
      const input: CreativeCriticInput = {
        campaignId: mockBlueprint.campaignId,
        blueprintId: mockBlueprint.id,
        blueprintVersion: mockBlueprint.version,
        strategyHash: mockBlueprint.idempotencyKey,
        blueprint: mockBlueprint,
        businessContext: {
          businessId: 'biz_jubilee_dining',
          name: 'Mitra Grand Kitchen',
          industry: 'restaurant',
          subVertical: 'family_dining',
          positioning: 'Authentic regional family dining',
        },
        platformContext: {
          platform: 'instagram',
          format: 'single_image',
          aspectRatio: '1:1',
        },
        asset: mockGoldenAsset,
        validationResults: mockGoldenAsset.validation,
      };

      const result = criticService.evaluateExecution(input);

      expect(result.decision).toBe('APPROVE');
      expect(result.overallScore).toBeGreaterThanOrEqual(80);

      // Check 10 dimensions exist
      expect(result.dimensions.hook.score).toBeGreaterThan(0);
      expect(result.dimensions.relevance.score).toBeGreaterThan(0);
      expect(result.dimensions.originality.score).toBeGreaterThan(0);
      expect(result.dimensions.businessFit.score).toBeGreaterThan(0);
      expect(result.dimensions.conceptFidelity.score).toBeGreaterThan(0);
      expect(result.dimensions.visualCommunication.score).toBeGreaterThan(0);
      expect(result.dimensions.offerClarity.score).toBeGreaterThan(0);
      expect(result.dimensions.brand.score).toBeGreaterThan(0);
      expect(result.dimensions.platformFit.score).toBeGreaterThan(0);
      expect(result.dimensions.conversion.score).toBeGreaterThan(0);

      // Check evidence presence
      expect(result.dimensions.conceptFidelity.evidence.length).toBeGreaterThan(0);
      expect(result.twoSecondUnderstanding).toContain('The Family Table');
    });

    it('should reject execution when strategy drift occurs into price shock', () => {
      const lock = lockService.createLock(mockBlueprint);

      // Create a validation result representing strategy drift
      const driftedValidation = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 150000,
        buffer: Buffer.from('DRIFTED_RASTER'),
        headline: 'FLAT ₹299 DISCOUNT OFFER TODAY ONLY!', // Price shock
        offerProminence: 90, // Exceeds supporting limit
        hasLogo: true,
      });

      const input: CreativeCriticInput = {
        campaignId: mockBlueprint.campaignId,
        blueprintId: mockBlueprint.id,
        blueprintVersion: mockBlueprint.version,
        strategyHash: lock.strategicHash,
        blueprint: mockBlueprint,
        businessContext: {
          businessId: 'biz_jubilee_dining',
          name: 'Mitra Grand Kitchen',
          industry: 'restaurant',
          subVertical: 'family_dining',
          positioning: 'Authentic regional family dining',
        },
        platformContext: {
          platform: 'instagram',
          format: 'single_image',
          aspectRatio: '1:1',
        },
        asset: mockGoldenAsset,
        validationResults: driftedValidation,
      };

      const result = criticService.evaluateExecution(input);

      expect(result.decision).toBe('REJECT');
      expect(result.dimensions.conceptFidelity.score).toBeLessThan(60);
    });

    it('should throw error and block evaluation when mandatory CanonicalCreativeBlueprint is missing', () => {
      const badInput: any = {
        campaignId: 'camp_123',
        blueprintId: 'bp_123',
        asset: mockGoldenAsset,
      };

      expect(() => criticService.evaluateExecution(badInput)).toThrow(
        'Creative Critic Blocked: Mandatory CanonicalCreativeBlueprint missing.'
      );
    });
  });

  describe('Revision Request & Protected Constraints', () => {
    it('should package an ExecutionRevisionRequest targeting weak components while preserving protected constraints', () => {
      const input: CreativeCriticInput = {
        campaignId: mockBlueprint.campaignId,
        blueprintId: mockBlueprint.id,
        blueprintVersion: mockBlueprint.version,
        strategyHash: mockBlueprint.idempotencyKey,
        blueprint: mockBlueprint,
        businessContext: {
          businessId: 'biz_jubilee_dining',
          name: 'Mitra Grand Kitchen',
          industry: 'restaurant',
          subVertical: 'family_dining',
          positioning: 'Authentic regional family dining',
        },
        platformContext: {
          platform: 'instagram',
          format: 'single_image',
          aspectRatio: '1:1',
        },
        asset: mockGoldenAsset,
        validationResults: mockGoldenAsset.validation,
      };

      const criticResult = criticService.evaluateExecution(input);

      const revisionReq = criticService.prepareRevisionRequest(
        mockBlueprint.id,
        mockBlueprint.version,
        mockGoldenAsset.assetId,
        'critic_res_123',
        criticResult.recommendations,
        ['Family Table core concept', 'Warm tone', 'Supporting offer role']
      );

      expect(revisionReq.blueprintId).toBe(mockBlueprint.id);
      expect(revisionReq.preserveConstraints).toContain('Family Table core concept');
      expect(revisionReq.revisionInstruction).toContain('PRESERVE CONSTRAINTS');
    });
  });

  describe('Regression Comparison Between Iterations', () => {
    it('should perform regression comparison and recommend previous version if current version regressed on concept fidelity', () => {
      const previousResult = criticService.evaluateExecution({
        campaignId: mockBlueprint.campaignId,
        blueprintId: mockBlueprint.id,
        blueprintVersion: mockBlueprint.version,
        strategyHash: mockBlueprint.idempotencyKey,
        blueprint: mockBlueprint,
        businessContext: {
          businessId: 'biz_jubilee_dining',
          name: 'Mitra Grand Kitchen',
          industry: 'restaurant',
          subVertical: 'family_dining',
          positioning: 'Authentic regional family dining',
        },
        platformContext: { platform: 'instagram', format: 'single_image', aspectRatio: '1:1' },
        asset: mockGoldenAsset,
        validationResults: mockGoldenAsset.validation,
      });

      // Create a lower-quality current result with concept fidelity regression
      const currentResult = {
        ...previousResult,
        assetId: 'asset_v2_regressed',
        overallScore: 62,
        dimensions: {
          ...previousResult.dimensions,
          conceptFidelity: {
            ...previousResult.dimensions.conceptFidelity,
            score: 55, // Regressed score
          },
        },
      };

      const comparison = criticService.compareExecutions(previousResult, currentResult);

      expect(comparison.recommendedVersion).toBe('PREVIOUS');
      expect(comparison.regressions.length).toBeGreaterThan(0);
    });
  });
});

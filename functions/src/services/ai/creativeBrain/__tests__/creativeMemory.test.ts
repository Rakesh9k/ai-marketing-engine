/**
 * PHASE 21 — Canonical Creative Memory Unit & Integration Test Suite
 * Tests campaign memory creation, user edit/preference signal extraction, repetition detection & fatigue risk,
 * territory saturation mapping, exploration vs exploitation balance, cold-start handling,
 * tenant isolation, and explainable recommendations.
 */

import { CreativeBlueprintService } from '../blueprint/creativeBlueprintService';
import type { MixedConcept } from '../mixing/mixing.types';
import type { ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../types/creativeBlueprint.types';
import {
  CreativeCriticService,
  ExecutionJobRunner,
  ExecutionPlanner,
  StrategyFidelityService,
  StrategyLockService,
  type CreativeCriticResult,
  type FinalPostAsset,
} from '../../execution';
import {
  CreativeMemoryFactory,
  CreativeMemoryRetrievalEngine,
  CreativeMemoryService,
  PreferenceSignalEngine,
  RepetitionDetector,
  TerritoryTracker,
  type CanonicalCreativeMemory,
  type UserCreativeEdit,
} from '../memory';

describe('Phase 21 — Creative Memory System Suite', () => {
  let blueprintService: CreativeBlueprintService;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let planner: ExecutionPlanner;
  let jobRunner: ExecutionJobRunner;
  let criticService: CreativeCriticService;

  let memoryFactory: CreativeMemoryFactory;
  let repetitionDetector: RepetitionDetector;
  let territoryTracker: TerritoryTracker;
  let preferenceEngine: PreferenceSignalEngine;
  let retrievalEngine: CreativeMemoryRetrievalEngine;
  let memoryService: CreativeMemoryService;

  let mockBlueprint: CreativeBlueprint;
  let mockAsset: FinalPostAsset;
  let mockCriticResult: CreativeCriticResult;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_mem_001',
    businessBrain: {
      businessId: 'biz_mem_restaurant',
      tenantId: 'tenant_mem_001',
      name: 'Mitra Grand Kitchen',
      industry: 'restaurant',
      subVertical: 'family_dining',
      positioning: 'Authentic regional family dining',
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
    id: 'mix_mem_001',
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
    jobRunner = new ExecutionJobRunner();
    criticService = new CreativeCriticService();

    memoryFactory = new CreativeMemoryFactory();
    repetitionDetector = new RepetitionDetector();
    territoryTracker = new TerritoryTracker();
    preferenceEngine = new PreferenceSignalEngine();
    retrievalEngine = new CreativeMemoryRetrievalEngine(repetitionDetector, territoryTracker, preferenceEngine);
    memoryService = new CreativeMemoryService(memoryFactory, retrievalEngine);

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;

    const lock = lockService.createLock(mockBlueprint);
    const plan = planner.createPlan(mockBlueprint, lock);
    mockAsset = await jobRunner.executePostJob(mockBlueprint, lock, plan, fidelityService);

    mockCriticResult = criticService.evaluateExecution({
      campaignId: mockBlueprint.campaignId,
      blueprintId: mockBlueprint.id,
      blueprintVersion: mockBlueprint.version,
      strategyHash: lock.strategicHash,
      blueprint: mockBlueprint,
      businessContext: {
        businessId: 'biz_mem_restaurant',
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
      asset: mockAsset,
      validationResults: mockAsset.validation,
    });
  });

  describe('1. Canonical Creative Memory Creation & Structuring', () => {
    it('creates a complete, tenant-scoped CanonicalCreativeMemory record on campaign completion', () => {
      const userEdits: UserCreativeEdit[] = [
        {
          editId: 'edit_001',
          component: 'HOOK',
          before: 'Weekend deal for everyone!',
          after: 'Still arguing about where to eat?',
          reason: 'User prefers recognition-based hook',
          timestamp: new Date().toISOString(),
        },
      ];

      const memory = memoryService.recordCampaignMemory(mockBlueprint, mockAsset, mockCriticResult, {
        businessId: 'biz_mem_restaurant',
        userApproved: true,
        userEdits,
      });

      expect(memory.id).toBeDefined();
      expect(memory.tenantId).toBe('tenant_mem_001');
      expect(memory.businessId).toBe('biz_mem_restaurant');
      expect(memory.campaignId).toBe(mockBlueprint.campaignId);
      expect(memory.strategic.creativeMechanism).toBe('Recognition -> Relief');
      expect(memory.strategic.emotionalTerritory).toBe('Relief');
      expect(memory.creative.platform).toBe('instagram');
      expect(memory.userBehavior.approved).toBe(true);
      expect(memory.userBehavior.userEdits.length).toBe(1);
      expect(memory.userBehavior.userEdits[0].component).toBe('HOOK');
      expect(memory.quality.overallCriticScore).toBe(mockCriticResult.overallScore);
    });
  });

  describe('2. User Creative Preference Signal Engine', () => {
    it('calculates preference signals with calibrated confidence scaling to prevent single-edit overgeneralization', () => {
      const memory1 = memoryService.recordCampaignMemory(mockBlueprint, mockAsset, mockCriticResult, {
        businessId: 'biz_mem_restaurant',
        userApproved: true,
        userEdits: [{ editId: 'e1', component: 'HOOK', after: 'Conversational', timestamp: new Date().toISOString() }],
      });

      const signals1 = preferenceEngine.extractSignals([memory1]);
      expect(signals1.length).toBeGreaterThan(0);
      const hookSignal1 = signals1.find((s) => s.subject.includes('hook'));
      expect(hookSignal1?.evidenceCount).toBe(1);
      expect(hookSignal1?.confidence).toBe(0.28); // Low initial confidence

      // Add 4 more memories with the same edit
      const memories = [memory1];
      for (let i = 2; i <= 5; i++) {
        const mem = memoryService.recordCampaignMemory(
          { ...mockBlueprint, campaignId: `camp_00${i}` },
          mockAsset,
          mockCriticResult,
          {
            businessId: 'biz_mem_restaurant',
            userApproved: true,
            userEdits: [{ editId: `e${i}`, component: 'HOOK', after: 'Conversational', timestamp: new Date().toISOString() }],
          }
        );
        memories.push(mem);
      }

      const signals5 = preferenceEngine.extractSignals(memories);
      const hookSignal5 = signals5.find((s) => s.subject.includes('hook'));
      expect(hookSignal5?.evidenceCount).toBe(5);
      expect(hookSignal5?.confidence).toBe(0.85); // High confidence after 5 campaigns!
    });
  });

  describe('3. Repetition Detection & Fatigue Risk', () => {
    it('detects 3 consecutive price-led concepts, raising fatigue risk to HIGH and generating DIVERSIFY recommendation', () => {
      const memories: CanonicalCreativeMemory[] = [];

      for (let i = 1; i <= 3; i++) {
        const mem = memoryFactory.createMemory({
          blueprint: {
            ...mockBlueprint,
            campaignId: `camp_price_${i}`,
            creativeMechanism: {
              primaryMechanism: 'Price Shock',
              mechanismExplanation: 'Urgent price shock discount',
              intendedAudienceEffect: 'Price-driven urgency',
            },
          },
          executionAsset: mockAsset,
          criticResult: mockCriticResult,
          businessId: 'biz_mem_restaurant',
          userApproved: true,
        });
        memories.push(mem);
      }

      const repetitions = repetitionDetector.detectRepetitions(memories);
      expect(repetitions.length).toBeGreaterThan(0);

      const priceRep = repetitions.find((r) => r.pattern === 'Price Shock');
      expect(priceRep).toBeDefined();
      expect(priceRep?.consecutiveOccurrences).toBe(3);
      expect(priceRep?.fatigueRisk).toBe('HIGH');

      memoryService.seedMemories('tenant_mem_001', 'biz_mem_restaurant', memories);

      const context = memoryService.getMemoryContext({
        tenantId: 'tenant_mem_001',
        businessId: 'biz_mem_restaurant',
      });

      expect(context.recommendations.some((r) => r.type === 'DIVERSIFY')).toBe(true);
      expect(context.recommendations[0].suggestedDirection).toContain('customer-story');
    });
  });

  describe('4. Territory Saturation Mapping', () => {
    it('builds saturation scores across strategic territories and identifies underused territories', () => {
      const memories: CanonicalCreativeMemory[] = [];

      // 4 campaigns in Price Shock territory
      for (let i = 1; i <= 4; i++) {
        memories.push(
          memoryFactory.createMemory({
            blueprint: {
              ...mockBlueprint,
              campaignId: `camp_sat_${i}`,
              emotionalDirection: {
                primaryEmotion: 'Surprise',
                desiredAudienceFeeling: 'Urgent value surprise',
              },
            },
            executionAsset: mockAsset,
            criticResult: mockCriticResult,
            businessId: 'biz_mem_restaurant',
            userApproved: true,
          })
        );
      }

      const territoryMap = territoryTracker.buildTerritoryMap(memories);
      const surpriseTerritory = territoryMap.find((t) => t.territory === 'Surprise');

      expect(surpriseTerritory).toBeDefined();
      expect(surpriseTerritory?.usageCount).toBe(4);
      expect(surpriseTerritory?.saturationScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('5. Cold-Start Handling', () => {
    it('returns isColdStart = true and neutral context when a business has 0 campaign history', () => {
      const context = memoryService.getMemoryContext({
        tenantId: 'tenant_new_brand',
        businessId: 'biz_new_brand',
      });

      expect(context.isColdStart).toBe(true);
      expect(context.recentCampaigns.length).toBe(0);
      expect(context.recommendations.length).toBe(0);
      expect(context.fatigueSignals.length).toBe(0);
    });
  });

  describe('6. Tenant Isolation', () => {
    it('prevents Business A from retrieving or seeing memory belonging to Business B', () => {
      memoryService.clear();

      memoryService.recordCampaignMemory(mockBlueprint, mockAsset, mockCriticResult, {
        businessId: 'biz_mem_restaurant',
        userApproved: true,
      });

      // Query for Business B
      const retrievalB = memoryService.queryMemory({
        tenantId: 'tenant_mem_001',
        businessId: 'biz_other',
      });

      expect(retrievalB.memories.length).toBe(0);

      // Query for Business A
      const retrievalA = memoryService.queryMemory({
        tenantId: 'tenant_mem_001',
        businessId: 'biz_mem_restaurant',
      });

      expect(retrievalA.memories.length).toBe(1);
    });
  });

  describe('7. Exploration vs Exploitation Balance', () => {
    it('recommends REPEAT_SUCCESS for a proven mechanism with high user approval without high fatigue', () => {
      const memory1 = memoryFactory.createMemory({
        blueprint: mockBlueprint,
        executionAsset: mockAsset,
        criticResult: { ...mockCriticResult, overallScore: 88 },
        businessId: 'biz_mem_restaurant',
        userApproved: true,
      });

      memoryService.seedMemories('tenant_mem_001', 'biz_mem_restaurant', [memory1]);

      const retrieval = memoryService.queryMemory({
        tenantId: 'tenant_mem_001',
        businessId: 'biz_mem_restaurant',
      });

      expect(retrieval.recommendations.some((r) => r.type === 'REPEAT_SUCCESS')).toBe(true);
    });
  });
});

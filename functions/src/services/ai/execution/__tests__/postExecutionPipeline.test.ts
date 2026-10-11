/**
 * PHASE 18 — Post Execution Pipeline Unit Tests
 * Tests Execution Planning, Semantic Brief Construction, Asset Adaptation,
 * Composition Assembly, Rasterization, and Golden Post Execution.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  AssetAdaptationService,
  CompositionEngine,
  ExecutionJobRunner,
  ExecutionPlanner,
  LayoutEngine,
  PostRasterizer,
  StrategyFidelityService,
  StrategyLockService,
} from '../index';

describe('Phase 18 — Post Execution Pipeline', () => {
  let blueprintService: CreativeBlueprintService;
  let planner: ExecutionPlanner;
  let adaptationService: AssetAdaptationService;
  let layoutEngine: LayoutEngine;
  let compositionEngine: CompositionEngine;
  let rasterizer: PostRasterizer;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let jobRunner: ExecutionJobRunner;
  let mockBlueprint: CreativeBlueprint;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_post_001',
    businessBrain: {
      businessId: 'biz_jubilee_dining',
      tenantId: 'tenant_123',
      name: 'Mitra Grand Kitchen',
      industry: 'restaurant',
      subVertical: 'family_dining',
      positioning: 'Warm family food moments without decision arguments',
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
    id: 'mix_family_001',
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

  beforeEach(() => {
    blueprintService = new CreativeBlueprintService();
    planner = new ExecutionPlanner();
    adaptationService = new AssetAdaptationService();
    layoutEngine = new LayoutEngine();
    compositionEngine = new CompositionEngine(layoutEngine);
    rasterizer = new PostRasterizer();
    lockService = new StrategyLockService();
    fidelityService = new StrategyFidelityService();
    jobRunner = new ExecutionJobRunner();

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
    mockBlueprint.offer.strategicRole = 'supporting_proof';
    mockBlueprint.messageHierarchy.primaryMessage = 'Finally, a Sunday dinner where everyone agrees.';
  });

  describe('Execution Planning & Semantic Brief', () => {
    it('should translate CanonicalCreativeBlueprint into a post ExecutionPlan without altering strategy', () => {
      const lock = lockService.createLock(mockBlueprint);
      const plan = planner.createPlan(mockBlueprint, lock);

      expect(plan.blueprintId).toBe(mockBlueprint.id);
      expect(plan.strategyHash).toBe(lock.strategicHash);
      expect(plan.assetType).toBe('post');
      expect(plan.stages).toContain('COMPOSITION');
      expect(plan.stages).toContain('VALIDATION');
      expect(plan.outputRequirements.some((r) => r.aspectRatio === '1:1')).toBe(true);
      expect(plan.outputRequirements.some((r) => r.aspectRatio === '4:5')).toBe(true);
    });

    it('should construct a semantic visual brief consuming blueprint parameters', () => {
      const brief = planner.constructSemanticBrief(mockBlueprint, '1:1');

      expect(brief).toContain('The Family Table');
      expect(brief).toContain('Recognition -> Relief');
      expect(brief).toContain('Happy family sharing a multi-cuisine table spread');
      expect(brief).toContain('Evoke Relief');
    });
  });

  describe('Asset Adaptation & Composition', () => {
    it('should evaluate aspect ratio compatibility and recommend crop or ratio variant', () => {
      const mockAsset = {
        id: 'asset_hero_1',
        campaignId: 'camp_post_001',
        type: 'hero_visual',
        source: 'generated' as const,
        storagePath: 'hero.png',
        mimeType: 'image/png',
        width: 1080,
        height: 1080, // 1:1 square
      };

      // 1:1 to 4:5 (close aspect ratio) -> safe to crop
      const result45 = adaptationService.evaluateAdaptation(mockAsset, '4:5');
      expect(result45.safeToCrop).toBe(true);
      expect(result45.recommendedAction).toBe('CROP_AND_REPOSITION');

      // 1:1 to 9:16 (large aspect ratio jump) -> recommend generating ratio variant
      const result916 = adaptationService.evaluateAdaptation(mockAsset, '9:16');
      expect(result916.safeToCrop).toBe(false);
      expect(result916.recommendedAction).toBe('GENERATE_RATIO_VARIANT');
    });

    it('should build a CompositionSpec and SVG representation from blueprint and layout engine', () => {
      const spec = compositionEngine.buildCompositionSpec(mockBlueprint, '1:1', 'hero.png', 'logo.png');

      expect(spec.canvas.width).toBe(1080);
      expect(spec.canvas.height).toBe(1080);
      expect(spec.layers.some((l) => l.id === 'layer_headline')).toBe(true);
      expect(spec.layers.some((l) => l.id === 'layer_offer_badge')).toBe(true);

      const svg = compositionEngine.generateSVG(spec);
      expect(svg).toContain('<svg');
      expect(svg).toContain('Finally, a Sunday dinner where everyone agrees.');
    });
  });

  describe('Rasterization & Golden Post Execution', () => {
    it('should rasterize SVG to PNG buffer and validate output bytes', async () => {
      const spec = compositionEngine.buildCompositionSpec(mockBlueprint, '1:1');
      const svg = compositionEngine.generateSVG(spec);

      const raster = await rasterizer.rasterize(svg, 1080, 1080, 'png');
      expect(raster.format).toBe('png');
      expect(raster.width).toBe(1080);
      expect(raster.height).toBe(1080);

      const val = rasterizer.validateRasterOutput(raster);
      expect(val.valid).toBe(true);
    });

    it('should execute complete Golden Post Job producing FinalPostAsset with status READY', async () => {
      const lock = lockService.createLock(mockBlueprint);
      const plan = planner.createPlan(mockBlueprint, lock);

      const finalAsset = await jobRunner.executePostJob(mockBlueprint, lock, plan, fidelityService);

      expect(finalAsset.status).toBe('READY');
      expect(finalAsset.format).toBe('png');
      expect(finalAsset.width).toBe(1080);
      expect(finalAsset.height).toBe(1080);
      expect(finalAsset.validation.allPassed).toBe(true);
      expect(finalAsset.validation.strategyFidelity.approved).toBe(true);
    });
  });
});

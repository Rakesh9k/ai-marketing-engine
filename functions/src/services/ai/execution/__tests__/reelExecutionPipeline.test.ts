/**
 * PHASE 18 — Reel Execution Pipeline Unit Tests
 * Tests Reel Script Generation, Strategy Traceability, Shot List Planning,
 * Audio Priority Mixing, Timeline Assembly, and Golden Reel MP4 Job Execution.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  AudioEngine,
  ExecutionJobRunner,
  ExecutionPlanner,
  ReelExecutionPipeline,
  ReelScriptGenerator,
  ShotListPlanner,
  StrategyFidelityService,
  StrategyLockService,
  TimelineAssembler,
} from '../index';

describe('Phase 18 — Reel Execution Pipeline', () => {
  let blueprintService: CreativeBlueprintService;
  let scriptGenerator: ReelScriptGenerator;
  let shotPlanner: ShotListPlanner;
  let audioEngine: AudioEngine;
  let timelineAssembler: TimelineAssembler;
  let pipeline: ReelExecutionPipeline;
  let planner: ExecutionPlanner;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let jobRunner: ExecutionJobRunner;
  let mockBlueprint: CreativeBlueprint;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_reel_001',
    businessBrain: {
      businessId: 'biz_jubilee_dining',
      tenantId: 'tenant_123',
      name: 'Mitra Grand Kitchen',
      industry: 'restaurant',
      subVertical: 'family_dining',
      positioning: 'Authentic multi-cuisine dining',
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
      intentId: 'intent_family_reel',
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
    id: 'mix_family_reel',
    name: 'The Family Table Reel',
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
    recommendedFormat: { primary: 'reel' },
    recommendedPlatform: { primary: 'instagram' },
    requiredAssets: { required: ['Product photo', 'Logo'], recommended: ['Family photo'], optional: [] },
    compatibilityScore: 95,
    strategicCoherenceScore: 90,
    adaptations: [],
    conflictsResolved: [],
  };

  beforeEach(() => {
    blueprintService = new CreativeBlueprintService();
    scriptGenerator = new ReelScriptGenerator();
    shotPlanner = new ShotListPlanner();
    audioEngine = new AudioEngine();
    timelineAssembler = new TimelineAssembler();
    pipeline = new ReelExecutionPipeline(scriptGenerator, shotPlanner, audioEngine, timelineAssembler);
    planner = new ExecutionPlanner();
    lockService = new StrategyLockService();
    fidelityService = new StrategyFidelityService();
    jobRunner = new ExecutionJobRunner(undefined, undefined, undefined, pipeline);

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
    mockBlueprint.offer.strategicRole = 'supporting_proof';
    mockBlueprint.messageHierarchy.primaryMessage = 'Finally, a Sunday dinner where everyone agrees.';
  });

  describe('Reel Script & Strategy Traceability', () => {
    it('should generate ReelScript preserving strategySource traceability for every segment', () => {
      const script = scriptGenerator.generateScript(mockBlueprint);

      expect(script.hook.strategySource.blueprintField).toBe('hook');
      expect(script.beats.some((b) => b.strategySource.blueprintField.includes('primaryMessage'))).toBe(true);
      expect(script.cta.strategySource.blueprintField).toBe('cta.action');
      expect(script.totalDurationMs).toBeGreaterThan(0);
    });
  });

  describe('Shot List & Audio Priority Mixing', () => {
    it('should plan ReelShots mapping script beats to visual requirements and camera direction', () => {
      const script = scriptGenerator.generateScript(mockBlueprint);
      const shots = shotPlanner.planShots(script);

      expect(shots.length).toBeGreaterThanOrEqual(4);
      const shot0 = shots[0];
      expect(shot0?.sequenceOrder).toBe(1);
      expect(shot0?.cameraDirection).toBe('Quick push-in');
    });

    it('should configure audio tracks enforcing Voice = 1.0 > Music = 0.25 priority ducking', () => {
      const script = scriptGenerator.generateScript(mockBlueprint);
      const tracks = audioEngine.prepareAudioTracks(script, 'voice.mp3', 'music.mp3');

      const voice = tracks.find((t) => t.role === 'voice');
      const music = tracks.find((t) => t.role === 'music');

      expect(voice).toBeDefined();
      expect(voice?.volume).toBe(1.0); // Primary priority
      expect(music).toBeDefined();
      expect(music?.volume).toBe(0.25); // Ducked volume
    });
  });

  describe('Timeline Assembly & Golden Reel Execution', () => {
    it('should assemble a canonical Timeline contract for video renderer', () => {
      const script = scriptGenerator.generateScript(mockBlueprint);
      const shots = shotPlanner.planShots(script);
      const audioTracks = audioEngine.prepareAudioTracks(script);
      const timeline = timelineAssembler.assembleTimeline(shots, audioTracks);

      expect(timeline.durationMs).toBe(script.totalDurationMs);
      expect(timeline.videoTracks.length).toBe(shots.length);
      expect(timeline.captionTrack?.captions.length).toBeGreaterThan(0);
    });

    it('should execute Golden Reel Job producing FinalReelAsset with status READY and verified MP4 output', async () => {
      const lock = lockService.createLock(mockBlueprint);
      const plan = planner.createPlan(mockBlueprint, lock);

      const finalAsset = await jobRunner.executeReelJob(mockBlueprint, lock, plan, fidelityService);

      expect(finalAsset.status).toBe('READY');
      expect(finalAsset.format).toBe('mp4');
      expect(finalAsset.width).toBe(1080);
      expect(finalAsset.height).toBe(1920);
      expect(finalAsset.storagePath).toContain('.mp4');
      expect(finalAsset.validation.allPassed).toBe(true);
      expect(finalAsset.validation.strategyFidelity.approved).toBe(true);
    });
  });
});

/**
 * PHASE 17 — Strategy Fidelity Layer Unit Tests
 * Tests for Strategy Lock determinism, Lock verification, Strategy Manifest derivation,
 * Offer Dominance drift detection, Tone drift detection, and Golden Handoff Execution.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  StrategyFidelityService,
  StrategyFidelityValidator,
  StrategyLockService,
  StrategyManifestService,
} from '../strategyFidelity';

describe('Phase 17 — Strategy Fidelity Layer', () => {
  let lockService: StrategyLockService;
  let manifestService: StrategyManifestService;
  let validator: StrategyFidelityValidator;
  let service: StrategyFidelityService;
  let blueprintService: CreativeBlueprintService;
  let mockBlueprint: CreativeBlueprint;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_weekend_001',
    businessBrain: {
      businessId: 'biz_kondapur_dining',
      tenantId: 'tenant_123',
      name: 'Royal Spice Family Restaurant',
      industry: 'restaurant',
      subVertical: 'fine_dining',
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
      intentId: 'intent_weekend_lunch',
      campaignObjective: 'ACQUISITION',
      decisionStage: 'CONSIDERATION',
      targetAudience: 'Families in Jubilee Hills',
      audienceSituation: 'Deciding where to have weekend family lunch without food argument',
      product: 'Weekend Family Feast Combo',
      offerDetails: {
        hasOffer: true,
        offerTitle: 'Family Feast Combo ₹299',
        offerPrice: 299,
        hasStatedExpiry: false,
        hasInventoryLimit: false,
      },
    },
    creativeOpportunity: {
      opportunityId: 'opp_family_decisions',
      audience: 'Families',
      problemOrDesire: 'Food decision fatigue',
      customerTension: 'Kids want pizza, parents want thali',
      emotionalTerritory: 'Relief and togetherness',
      opportunity: 'Position restaurant as the peaceful family decision solution',
      strategicRecommendation: 'Focus on family harmony over pure discount',
      thingsToAvoid: ['Pure price shock poster', 'Aggressive discount framing'],
    },
  };

  const mockMixedConcept: MixedConcept = {
    id: 'mix_weekend_001',
    name: 'The Family Table',
    sourceConcepts: ['c1', 'c2'],
    selectedComponents: [
      { component: 'coreIdea', conceptId: 'c1' },
      { component: 'hook', conceptId: 'c2' },
    ],
    synthesizedIdea: 'Where family food arguments turn into shared smiles',
    synthesizedInsight: 'Family dining is stressful when everyone wants something different',
    synthesizedEmotion: { primary: 'Relief', secondary: 'Warmth' },
    synthesizedHook: 'Can’t agree on what to eat tonight?',
    synthesizedMechanism: { name: 'Recognition -> Relief', explanation: 'Show familiar family dinner debate resolving happily' },
    synthesizedVisualDirection: 'Happy family sharing a multi-cuisine table spread',
    synthesizedStoryDirection: 'Order -> Serve -> Enjoy',
    synthesizedOfferIntegration: 'Family Feast Combo ₹299 serves as supporting proof',
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
    lockService = new StrategyLockService();
    manifestService = new StrategyManifestService();
    validator = new StrategyFidelityValidator();
    service = new StrategyFidelityService(lockService, manifestService, validator);

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
    // Set offer strategic role to supporting_proof for tests expecting supporting offer
    mockBlueprint.offer.strategicRole = 'supporting_proof';
    mockBlueprint.messageHierarchy.primaryMessage = 'Finally, a Sunday dinner where everyone agrees.';
    mockBlueprint.tone.primary = 'Warm & Relieved';
  });

  describe('Strategy Lock Determinism & Verification', () => {
    it('should compute a deterministic SHA-256 hash and lock approved blueprint', () => {
      const lock1 = lockService.createLock(mockBlueprint);
      const lock2 = lockService.createLock(mockBlueprint);

      expect(lock1.strategicHash).toBe(lock2.strategicHash);
      expect(lock1.strategicHash).toHaveLength(64); // SHA-256 hex string length
      expect(lock1.status).toBe('LOCKED');
      expect(lockService.verifyLock(lock1, mockBlueprint)).toBe(true);
    });

    it('should detect lock tampering when strategic fields are modified in blueprint', () => {
      const lock = lockService.createLock(mockBlueprint);

      // Modify immutable field in blueprint copy
      const tamperedBlueprint: CreativeBlueprint = {
        ...mockBlueprint,
        coreConcept: {
          ...mockBlueprint.coreConcept,
          name: 'Flash Sale ₹299 Shock', // Tampered concept
        },
      };

      expect(lockService.verifyLock(lock, tamperedBlueprint)).toBe(false);
    });
  });

  describe('Strategy Manifest Derivation', () => {
    it('should derive prompt directives, message priorities, and forbidden reinterpretations', () => {
      const lock = lockService.createLock(mockBlueprint);
      const manifest = manifestService.deriveManifest(mockBlueprint, lock);

      expect(manifest.lockId).toBe(lock.id);
      expect(manifest.strategicHash).toBe(lock.strategicHash);

      // Prompt Directives
      expect(manifest.promptDirectives).toContainEqual(
        expect.stringContaining('The Family Table')
      );
      expect(manifest.promptDirectives).toContainEqual(
        expect.stringContaining('Recognition -> Relief')
      );

      // Message Priority List
      expect(manifest.messagePriorityList).toContain(
        '[PRIMARY] Finally, a Sunday dinner where everyone agrees.'
      );

      // Offer Role Constraint
      expect(manifest.offerRoleConstraint).toContain('supporting proof element');

      // Forbidden Reinterpretations
      const offerDominanceRule = manifest.forbiddenReinterpretations.find(
        (r) => r.type === 'OFFER_DOMINANCE'
      );
      expect(offerDominanceRule).toBeDefined();
      expect(offerDominanceRule?.description).toContain('Do not convert concept into a price/discount poster');
    });
  });

  describe('Offer Dominance Drift Detection', () => {
    it('should reject candidate output when supporting offer is converted into price shock headline with high prominence', () => {
      const request = service.prepareExecutionRequest(mockBlueprint);

      const candidateOutput = {
        headline: 'FLAT ₹299 DISCOUNT OFFER TODAY ONLY!',
        copy: 'Get huge discounts on family feast',
        visualConcept: 'Giant ₹299 text poster with food background',
        offerProminence: 95, // Exceeds 60% threshold for supporting_proof
        tone: 'Aggressive sale',
        cta: 'Claim Discount',
      };

      const result = service.verifyFidelity(request, candidateOutput);

      expect(result.isFitted).toBe(false);
      expect(result.approved).toBe(false);
      expect(result.drift.offerDominanceDetected).toBe(true);
      expect(result.reason).toContain('Offer Dominance Drift');
    });

    it('should allow high offer prominence when offer strategic role is primary_hook', () => {
      const primaryHookBlueprint: CreativeBlueprint = {
        ...mockBlueprint,
        offer: {
          ...mockBlueprint.offer,
          strategicRole: 'primary_hook',
        },
      };

      const request = service.prepareExecutionRequest(primaryHookBlueprint);

      const candidateOutput = {
        headline: 'Sunday Feast at ₹299 Special Deal!',
        copy: 'Enjoy the special discount family feast',
        visualConcept: 'Prominent ₹299 banner',
        offerProminence: 85, // Allowed because role is primary_hook
        tone: 'Warm & Relieved',
        cta: 'Reserve Your Table',
      };

      const result = service.verifyFidelity(request, candidateOutput);

      expect(result.drift.offerDominanceDetected).toBe(false);
      expect(result.score.passesThreshold).toBe(true);
      expect(result.approved).toBe(true);
    });
  });

  describe('Tone & Message Drift Detection', () => {
    it('should flag tone drift when candidate uses aggressive sales tone instead of warm tone', () => {
      const request = service.prepareExecutionRequest(mockBlueprint);

      const candidateOutput = {
        headline: 'Finally, a Sunday dinner where everyone agrees.',
        copy: 'Hurry up and book before tables fill up fast!',
        visualConcept: 'Happy family dining',
        offerProminence: 40,
        tone: 'Aggressive hard_sell',
        cta: 'Reserve Your Table',
      };

      const result = service.verifyFidelity(request, candidateOutput);

      expect(result.drift.driftFactors).toContain('TONE_DRIFT');
      expect(result.score.breakdown.tone).toBeLessThan(5);
    });
  });

  describe('Golden Handoff Execution Flow', () => {
    it('should pass validation with high fidelity score when candidate faithfully executes approved blueprint', () => {
      const request = service.prepareExecutionRequest(mockBlueprint);

      const candidateOutput = {
        headline: 'Finally, a Sunday dinner where everyone agrees.',
        copy: 'Where family food debates turn into happy weekend moments. 50+ options under one roof.',
        visualConcept: 'Happy family sharing a multi-cuisine table spread',
        offerProminence: 35, // Well within supporting_proof limit (<= 60)
        tone: 'Warm & Relieved',
        cta: 'Reserve Your Table',
      };

      const result = service.verifyFidelity(request, candidateOutput);

      expect(result.isFitted).toBe(true);
      expect(result.approved).toBe(true);
      expect(result.score.passesThreshold).toBe(true);
      expect(result.score.overallScore).toBeGreaterThanOrEqual(80);
      expect(result.drift.hasDrift).toBe(false);
      expect(result.drift.offerDominanceDetected).toBe(false);
    });
  });
});

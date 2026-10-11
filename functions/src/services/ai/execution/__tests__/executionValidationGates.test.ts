/**
 * PHASE 18 — Master Validation Gates Unit & Failure Injection Tests
 * Tests Technical, Truth, Brand, Creative Quality, Platform, and Strategy Fidelity gates,
 * ensuring non-compliant or drifting assets are blocked before reaching READY.
 */

import { CreativeBlueprintService } from '../../creativeBrain/blueprint/creativeBlueprintService';
import type { MixedConcept } from '../../creativeBrain/mixing/mixing.types';
import type { ConceptSynthesisInput } from '../../creativeBrain/synthesis/synthesis.types';
import type { CanonicalCreativeBlueprint as CreativeBlueprint } from '../../creativeBrain/types/creativeBlueprint.types';
import {
  MasterValidationGate,
  StrategyFidelityService,
  StrategyLockService,
} from '../index';

describe('Phase 18 — Master Validation Gates & Failure Injection', () => {
  let blueprintService: CreativeBlueprintService;
  let lockService: StrategyLockService;
  let fidelityService: StrategyFidelityService;
  let validationGate: MasterValidationGate;
  let mockBlueprint: CreativeBlueprint;

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_val_001',
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
      intentId: 'intent_family_val',
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
    id: 'mix_family_val',
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
    lockService = new StrategyLockService();
    fidelityService = new StrategyFidelityService();
    validationGate = new MasterValidationGate();

    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    mockBlueprint = handoff.creativeBlueprint;
    mockBlueprint.offer.strategicRole = 'supporting_proof';
    mockBlueprint.messageHierarchy.primaryMessage = 'Finally, a Sunday dinner where everyone agrees.';
    mockBlueprint.prohibitedClaims = [
      { claim: 'cheap food', reason: 'Degrades premium brand image', severity: 'critical' },
    ];
    mockBlueprint.brandConstraints = [
      { category: 'FORBIDDEN_WORD', rule: 'cheap', severity: 'critical' },
    ];
  });

  describe('Clean Golden Validation Pass', () => {
    it('should pass all blocking and advisory gates for a compliant asset', () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 150000,
        buffer: Buffer.from('VALID_RASTER_BUFFER_DATA_PNG_FORMAT'),
        headline: 'Finally, a Sunday dinner where everyone agrees.',
        copy: 'Enjoy 50+ options under one roof.',
        visualConcept: 'Happy family sharing multi-cuisine table spread',
        offerProminence: 35,
        tone: 'Warm & Relieved',
        cta: 'Reserve Your Table',
        hasLogo: true,
      });

      expect(result.allPassed).toBe(true);
      expect(result.technicalCheck.passed).toBe(true);
      expect(result.truthCheck.passed).toBe(true);
      expect(result.brandCheck.passed).toBe(true);
      expect(result.creativeQualityCheck.passed).toBe(true);
      expect(result.platformCheck.passed).toBe(true);
      expect(result.strategyFidelity.approved).toBe(true);
      expect(result.blockingFailure).toBeUndefined();
    });
  });

  describe('Failure Injections', () => {
    it('should block asset when raster image is corrupted (0 bytes)', () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 0,
        buffer: Buffer.from(''),
        headline: 'Finally, a Sunday dinner where everyone agrees.',
        hasLogo: true,
      });

      expect(result.allPassed).toBe(false);
      expect(result.technicalCheck.passed).toBe(false);
      expect(result.blockingFailure).toContain('Technical Error');
    });

    it('should block asset when prohibited claim is present in headline', () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 150000,
        buffer: Buffer.from('VALID_RASTER_DATA'),
        headline: 'Get cheap food at our Sunday family feast!', // Prohibited word
        hasLogo: true,
      });

      expect(result.allPassed).toBe(false);
      expect(result.truthCheck.passed).toBe(false);
      expect(result.blockingFailure).toContain('Truth Check Violation');
    });

    it('should block asset when mandatory brand logo is missing', () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 150000,
        buffer: Buffer.from('VALID_RASTER_DATA'),
        headline: 'Finally, a Sunday dinner where everyone agrees.',
        hasLogo: false, // Logo missing
      });

      expect(result.allPassed).toBe(false);
      expect(result.brandCheck.passed).toBe(false);
      expect(result.blockingFailure).toContain('Brand Check Violation');
    });

    it('should block asset when Offer Dominance strategy drift occurs', () => {
      const lock = lockService.createLock(mockBlueprint);

      const result = validationGate.validatePostAsset(mockBlueprint, lock, fidelityService, {
        width: 1080,
        height: 1080,
        aspectRatio: '1:1',
        sizeBytes: 150000,
        buffer: Buffer.from('VALID_RASTER_DATA'),
        headline: 'FLAT ₹299 DISCOUNT OFFER TODAY ONLY!', // Price shock
        offerProminence: 90, // Exceeds supporting_proof limit (60)
        hasLogo: true,
      });

      expect(result.allPassed).toBe(false);
      expect(result.strategyFidelity.approved).toBe(false);
      expect(result.blockingFailure).toContain('Offer Dominance Drift');
    });
  });
});

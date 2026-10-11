/**
 * PHASE 16 — Canonical Creative Blueprint Handoff Contract Unit & Integration Tests
 * Validates blueprint construction (5 Core Questions), readiness gates, brand/truth precedence,
 * tenant security isolation, idempotency keying, and execution handoff contracts.
 */

import { CreativeBlueprintService } from '../blueprint/creativeBlueprintService';
import type { ConceptSynthesisInput } from '../synthesis/synthesis.types';
import type { MixedConcept } from '../mixing/mixing.types';
import type { BusinessContextContract, CampaignIntentContract } from '../types/creativeArchitecture.types';

describe('PHASE 16 — Canonical Creative Blueprint Test Suite', () => {
  let blueprintService: CreativeBlueprintService;

  const mockBusinessBrain: BusinessContextContract = {
    businessId: 'biz_kondapur_dining',
    tenantId: 'tenant_123',
    name: 'Royal Spice Family Restaurant',
    industry: 'restaurant',
    subVertical: 'fine_dining',
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
      verifiedClaims: ['4.8 Star Rated', 'Serving Kondapur since 2018'],
    },
  };

  const mockCampaignIntent: CampaignIntentContract = {
    intentId: 'intent_weekend_lunch',
    campaignObjective: 'ACQUISITION',
    decisionStage: 'CONSIDERATION',
    targetAudience: 'Young families in Kondapur',
    audienceSituation: 'Deciding where to have weekend family lunch without food argument',
    product: 'Weekend Family Feast Combo',
    offerDetails: {
      hasOffer: true,
      offerTitle: 'Family Feast Combo ₹699',
      offerPrice: 699,
      hasStatedExpiry: false,
      hasInventoryLimit: false,
    },
  };

  const mockOpportunity: any = {
    id: 'opp_weekend_family_relief',
    opportunityId: 'opp_weekend_family_relief',
    coreInsight: 'Weekend dining should feel relaxing, but choosing something everyone agrees on creates decision fatigue for parents.',
    strategicProblem: 'Parents are exhausted managing competing food preferences on weekends.',
    desiredAudienceShift: 'Shift from decision fatigue to instant ordering relief with one complete family combo.',
    recommendedAngle: 'Position the Family Combo as the single zero-debate solution that satisfies everyone.',
    customerTension: 'Parents want family togetherness without food choice arguments.',
    productOrService: 'Weekend Family Feast Combo',
    offer: 'Family Feast Combo ₹699',
  };

  const validInput: ConceptSynthesisInput = {
    campaignId: 'camp_weekend_001',
    businessBrain: mockBusinessBrain,
    campaignIntent: mockCampaignIntent,
    creativeOpportunity: mockOpportunity,
  };

  const mockMixedConcept: MixedConcept = {
    id: 'mix_weekend_001',
    name: 'The Family Table - Everyone Sorted',
    sourceConcepts: ['c1', 'c2', 'c3'],
    selectedComponents: [
      { component: 'coreIdea', conceptId: 'c1' },
      { component: 'hook', conceptId: 'c3' },
    ],
    synthesizedIdea: 'Turn the family food decision into the relief of having everyone sorted with one meal.',
    synthesizedInsight: 'Parents want simple family meal decisions on weekends.',
    synthesizedEmotion: { primary: 'Relief', secondary: 'Warmth' },
    synthesizedHook: 'For once, the family group chat agrees.',
    synthesizedMechanism: { name: 'Decision Elimination', explanation: 'Eliminates meal choice negotiations.' },
    synthesizedVisualDirection: 'Steaming family combo at the center of a happy family dining table.',
    synthesizedStoryDirection: 'Order -> Serve -> Enjoy.',
    synthesizedOfferIntegration: 'Family Feast Combo ₹699 serves as the decision solution.',
    synthesizedCTA: 'Order your family combo this weekend.',
    recommendedFormat: { primary: 'Short Reel' },
    recommendedPlatform: { primary: 'Instagram' },
    requiredAssets: { required: ['Product photo', 'Logo'], recommended: ['Family photo'], optional: [] },
    compatibilityScore: 95,
    strategicCoherenceScore: 90,
    adaptations: [],
    conflictsResolved: [],
  };

  beforeEach(() => {
    blueprintService = new CreativeBlueprintService();
  });

  // -------------------------------------------------------------
  // TEST 1 — BLUEPRINT CONSTRUCTION & 5 CORE QUESTIONS
  // -------------------------------------------------------------
  test('Test 1 — Constructs Canonical Creative Blueprint answering WHO, WHY, WHAT, HOW, and WHAT MUST NOT HAPPEN', () => {
    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    const bp = handoff.creativeBlueprint;

    // 1. WHO?
    expect(bp.audience.primaryAudience).toBe('Young families in Kondapur');

    // 2. WHY?
    expect(bp.campaignObjective.primary).toBe('acquisition');
    expect(bp.creativeOpportunity.opportunityId).toBe('opp_weekend_family_relief');

    // 3. WHAT?
    expect(bp.product.name).toBe('Weekend Family Feast Combo');
    expect(bp.offer.name).toBe('Family Feast Combo ₹699');

    // 4. HOW?
    expect(bp.coreConcept.name).toBe(mockMixedConcept.name);
    expect(bp.hook.hookIdea).toBe('For once, the family group chat agrees.');
    expect(bp.creativeMechanism.primaryMechanism).toBe('Decision Elimination');
    expect(bp.visualDirection.visualConcept).toContain('Steaming family combo');
    expect(bp.cta.action).toBe('Order your family combo this weekend.');

    // 5. WHAT MUST NOT HAPPEN?
    expect(bp.brandConstraints.some((b) => b.rule.includes('cheap'))).toBe(true);
    expect(bp.truthConstraints.length).toBeGreaterThan(0);
    expect(bp.prohibitedClaims.some((p) => p.claim === 'cheap')).toBe(true);

    // Validation Status
    expect(bp.status).toBe('READY');
    expect(bp.validation.valid).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 2 — VALIDATION READINESS GATES
  // -------------------------------------------------------------
  test('Test 2 — Blueprint Validation: Passes readiness gates (Strategic >= 80, Brand >= 90, Truth >= 90, Execution >= 85)', () => {
    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);
    const val = handoff.creativeBlueprint.validation;

    expect(val.strategicCoherence).toBeGreaterThanOrEqual(80);
    expect(val.brandCompliance).toBeGreaterThanOrEqual(90);
    expect(val.truthReadiness).toBeGreaterThanOrEqual(90);
    expect(val.executionReadiness).toBeGreaterThanOrEqual(85);
    expect(val.blockingIssues.length).toEqual(0);
  });

  // -------------------------------------------------------------
  // TEST 3 — TRUTH & BRAND GATE PRECEDENCE (BLOCKED STATUS)
  // -------------------------------------------------------------
  test('Test 3 — Brand/Truth Precedence: Blocks blueprint (status = BLOCKED) when headline contains prohibited claim or forbidden word', () => {
    const invalidConcept: MixedConcept = {
      ...mockMixedConcept,
      synthesizedHook: 'Get cheap discount-bin food today!',
    };

    const handoff = blueprintService.createBlueprint(validInput, invalidConcept);
    const bp = handoff.creativeBlueprint;

    expect(bp.status).toBe('BLOCKED');
    expect(bp.validation.valid).toBe(false);
    expect(bp.validation.blockingIssues.some((issue) => issue.includes('forbidden brand word'))).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 4 — TENANT SECURITY ISOLATION
  // -------------------------------------------------------------
  test('Test 4 — Tenant Security: Throws SecurityError on tenant ID mismatch', () => {
    expect(() => blueprintService.createBlueprint(validInput, mockMixedConcept, undefined, { tenantId: 'tenant_attacker_999' })).toThrow(
      'SecurityError: Tenant authorization failed'
    );
  });

  // -------------------------------------------------------------
  // TEST 5 — IDEMPOTENCY KEY GENERATION
  // -------------------------------------------------------------
  test('Test 5 — Idempotency Key: Generates deterministic idempotency key for retries', () => {
    const handoff1 = blueprintService.createBlueprint(validInput, mockMixedConcept, undefined, { version: 1 });
    const handoff2 = blueprintService.createBlueprint(validInput, mockMixedConcept, undefined, { version: 1 });

    expect(handoff1.creativeBlueprint.idempotencyKey).toBe(handoff2.creativeBlueprint.idempotencyKey);
    expect(handoff1.creativeBlueprint.idempotencyKey).toContain('camp_weekend_001');
    expect(handoff1.creativeBlueprint.idempotencyKey).toContain('tenant_123');
  });

  // -------------------------------------------------------------
  // TEST 6 — EXECUTION HANDOFF CONTRACT
  // -------------------------------------------------------------
  test('Test 6 — Execution Handoff Contract: Wraps blueprint for execution without exposing Creative Brain state machine internals', () => {
    const handoff = blueprintService.createBlueprint(validInput, mockMixedConcept);

    expect(handoff.campaignId).toBe('camp_weekend_001');
    expect(handoff.tenantId).toBe('tenant_123');
    expect(handoff.businessBrainReference.businessId).toBe('biz_kondapur_dining');
    expect(handoff.executionContext.executionMode).toBe('AUTOMATIC');
    expect(handoff.creativeBlueprint.id).toBeDefined();
  });
});

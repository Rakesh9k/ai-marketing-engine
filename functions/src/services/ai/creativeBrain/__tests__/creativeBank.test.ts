/**
 * Phase 28 — Creative Bank Unit & Integration Tests
 * Mitra by BrainWise
 */

import {
  creativeBankService,
  MechanismRetrievalEngine,
  V1_CORE_MECHANISMS,
  RESTAURANT_MECHANISMS,
  SALON_MECHANISMS,
  REAL_ESTATE_MECHANISMS,
  LOCAL_CROSS_INDUSTRY_MECHANISMS
} from '../bank';

describe('Phase 28 — Creative Bank Engine', () => {
  describe('1. V1 Core Mechanisms Library Integrity', () => {
    test('contains at least 30-50 high-quality mechanisms in total library', () => {
      expect(V1_CORE_MECHANISMS.length).toBeGreaterThanOrEqual(30);
      expect(V1_CORE_MECHANISMS.length).toBeLessThanOrEqual(50);
      expect(V1_CORE_MECHANISMS.length).toBe(40);
    });

    test('verifies counts across industry sectors', () => {
      expect(RESTAURANT_MECHANISMS.length).toBe(10);
      expect(SALON_MECHANISMS.length).toBe(10);
      expect(REAL_ESTATE_MECHANISMS.length).toBe(10);
      expect(LOCAL_CROSS_INDUSTRY_MECHANISMS.length).toBe(10);
    });

    test('ensures every mechanism answers the 5 core strategic questions', () => {
      V1_CORE_MECHANISMS.forEach((mechanism) => {
        expect(mechanism.humanTensionResolved).toBeTruthy();
        expect(mechanism.whyAudienceCares).toBeTruthy();
        expect(mechanism.creativeChanges).toBeTruthy();
        expect(mechanism.whenAppropriate).toBeTruthy();
        expect(mechanism.whenToAvoid).toBeTruthy();

        expect(mechanism.id).toMatch(/^mech_/);
        expect(mechanism.category.length).toBeGreaterThan(0);
        expect(mechanism.applicableIndustries.length).toBeGreaterThan(0);
        expect(mechanism.status).toBe('active');
      });
    });
  });

  describe('2. Mechanism Retrieval & Industry Filtering', () => {
    test('retrieves restaurant mechanisms for restaurant industry query', () => {
      const result = creativeBankService.queryMechanisms({
        industry: 'restaurant',
        limit: 5
      });

      expect(result.mechanisms.length).toBe(5);
      result.mechanisms.forEach((m) => {
        const isCompatible =
          m.applicableIndustries.includes('restaurant') ||
          m.applicableIndustries.includes('all');
        expect(isCompatible).toBe(true);
      });
    });

    test('retrieves salon mechanisms for hair salon sub-industry query', () => {
      const result = creativeBankService.queryMechanisms({
        industry: 'salon',
        subIndustry: 'hair_salon',
        audienceSituation: 'seeking_makeover',
        limit: 3
      });

      expect(result.mechanisms.length).toBe(3);
      expect(result.mechanisms[0].id).toBe('mech_transformation_reveal');
    });

    test('retrieves real estate mechanisms for home seller scenario', () => {
      const result = creativeBankService.queryMechanisms({
        industry: 'real_estate',
        offerRole: 'agent_branding',
        limit: 3
      });

      expect(result.mechanisms.length).toBe(3);
      expect(result.mechanisms.some((m) => m.id === 'mech_trust_builder_agent')).toBe(true);
    });
  });

  describe('3. Mechanism Composition Rules (1 Primary + 0–2 Secondary)', () => {
    test('composes 1 primary and up to 2 non-overlapping secondary mechanisms', () => {
      const result = creativeBankService.queryMechanisms({
        industry: 'restaurant',
        audienceSituation: 'busy_family_dinner',
        limit: 5
      });

      expect(result.composition.primaryMechanism).toBeDefined();
      expect(result.composition.secondaryMechanisms.length).toBeLessThanOrEqual(2);
      expect(result.composition.compositionRationale).toContain('Primary mechanism');
    });

    test('prevents secondary mechanisms from duplicating primary categories', () => {
      const primary = creativeBankService.getMechanism('mech_craving_trigger')!;
      const secondary1 = creativeBankService.getMechanism('mech_sensory_reveal')!; // Has ATTENTION category like Craving
      const secondary2 = creativeBankService.getMechanism('mech_decision_relief_dining')!; // Has AUDIENCE_TENSION, VALUE

      const composition = MechanismRetrievalEngine.composeMechanisms([
        primary,
        secondary1,
        secondary2
      ]);

      expect(composition.primaryMechanism.id).toBe('mech_craving_trigger');
      // secondary1 is skipped because both have ATTENTION category
      expect(composition.secondaryMechanisms.map((m) => m.id)).not.toContain('mech_sensory_reveal');
      expect(composition.secondaryMechanisms.map((m) => m.id)).toContain('mech_decision_relief_dining');
    });
  });

  describe('4. Semantic Duplicate Detection', () => {
    test('detects when duplicate mechanism definitions are submitted', () => {
      const m1 = creativeBankService.getMechanism('mech_craving_trigger')!;
      const m1Clone = { ...m1, id: 'mech_craving_trigger_clone' };

      const duplicateCheck = creativeBankService.detectSemanticDuplicates([m1, m1Clone]);
      expect(duplicateCheck.isDuplicate).toBe(true);
      expect(duplicateCheck.duplicatePairs.length).toBe(1);
    });

    test('returns false when mechanism set is semantically unique', () => {
      const m1 = creativeBankService.getMechanism('mech_craving_trigger')!;
      const m2 = creativeBankService.getMechanism('mech_decision_relief_dining')!;

      const duplicateCheck = creativeBankService.detectSemanticDuplicates([m1, m2]);
      expect(duplicateCheck.isDuplicate).toBe(false);
    });
  });

  describe('5. Fatigue Tracking & Phase 22 Explore/Exploit Ratio', () => {
    test('applies fatigue penalty to recently used mechanisms for a business', () => {
      const businessId = 'biz_restaurant_123';
      const mechId = 'mech_craving_trigger';

      // Record usage twice
      creativeBankService.recordMechanismUsage(businessId, mechId);
      creativeBankService.recordMechanismUsage(businessId, mechId);

      const result = creativeBankService.queryMechanisms({
        businessId,
        industry: 'restaurant',
        limit: 25
      });

      const cravingScore = result.scores.find((s) => s.mechanismId === mechId);
      expect(cravingScore).toBeDefined();
      expect(cravingScore!.fatiguePenalty).toBe(20);
    });

    test('flags explore choices according to 70/30 exploit/explore ratio', () => {
      const result = creativeBankService.queryMechanisms({
        industry: 'salon',
        exploreRatio: 0.3,
        limit: 5
      });

      expect(result.explored).toBe(true);
      const exploreChoices = result.scores.filter((s) => s.isExploreChoice);
      expect(exploreChoices.length).toBeGreaterThan(0);
    });
  });

  describe('6. Master Service Facade API', () => {
    test('getMechanism returns mechanism by ID', () => {
      const mechanism = creativeBankService.getMechanism('mech_local_ritual');
      expect(mechanism).toBeDefined();
      expect(mechanism?.name).toBe('Local Ritual');
    });

    test('getAllMechanisms returns all 40 registered core mechanisms', () => {
      const all = creativeBankService.getAllMechanisms();
      expect(all.length).toBe(40);
    });
  });
});

/**
 * PHASE 22 — Creative Preference Learning Unit & Integration Test Suite
 * Tests concept selection learning, comparative choice signals, semantic edit taxonomy classification,
 * targeted visual regeneration, explicit preference overrides, confidence scaling,
 * exploration vs exploitation parameters, idempotency protection, and tenant isolation.
 */

import { BehaviorRecorder } from '../behavior/behaviorRecorder';
import type { CreativeBehaviorEvent, ExplicitCreativePreference } from '../behavior/behavior.types';
import { CreativeBehaviorService } from '../behavior/creativeBehaviorService';
import { PreferenceEngine } from '../behavior/preferenceEngine';
import { PreferenceProfileService } from '../behavior/preferenceProfileService';
import { SemanticEditAnalyzer } from '../behavior/semanticEditAnalyzer';

describe('Phase 22 — Creative Preference Learning Suite', () => {
  let recorder: BehaviorRecorder;
  let semanticAnalyzer: SemanticEditAnalyzer;
  let preferenceEngine: PreferenceEngine;
  let profileService: PreferenceProfileService;
  let behaviorService: CreativeBehaviorService;

  beforeEach(() => {
    recorder = new BehaviorRecorder();
    semanticAnalyzer = new SemanticEditAnalyzer();
    preferenceEngine = new PreferenceEngine(semanticAnalyzer);
    profileService = new PreferenceProfileService();
    behaviorService = new CreativeBehaviorService(recorder, preferenceEngine, profileService);
  });

  describe('1. Semantic Edit Classification', () => {
    it('infers taxonomy shifts from copy edits rather than comparing raw strings', () => {
      const classification = semanticAnalyzer.analyzeEdit(
        'HOOK',
        'Get our amazing weekend offer today!',
        'Still deciding where to eat?'
      );

      expect(classification.component).toBe('HOOK');
      expect(classification.beforeCategory).toBe('PROMOTIONAL_OFFER');
      expect(classification.afterCategory).toBe('AUDIENCE_RECOGNITION');
      expect(classification.shiftDescription).toContain('Shifted hook from offer-led promotion');
    });
  });

  describe('2. Concept Selection & Comparative Choice Signals', () => {
    it('records comparative choice signals when user selects one concept over alternatives', () => {
      const event: CreativeBehaviorEvent = {
        id: 'evt_select_001',
        tenantId: 'tenant_beh_001',
        businessId: 'biz_beh_restaurant',
        campaignId: 'camp_001',
        userId: 'user_001',
        eventType: 'CONCEPT_SELECTED',
        targetType: 'CONCEPT',
        targetId: 'concept_family_table',
        fingerprint: {
          conceptId: 'concept_family_table',
          creativeMechanism: 'Recognition -> Relief',
          hookType: 'Conversational',
          tone: 'Warm',
          visualStyle: 'Human-Centered Photography',
        },
        choiceContext: {
          selectedConceptId: 'concept_family_table',
          rejectedConceptIds: ['concept_price_shock', 'concept_educational'],
          availableConceptIds: ['concept_family_table', 'concept_price_shock', 'concept_educational'],
        },
        createdAt: new Date().toISOString(),
      };

      const recorded = behaviorService.recordEvent(event);
      expect(recorded).toBeDefined();

      const profile = behaviorService.getPreferenceProfile('tenant_beh_001', 'biz_beh_restaurant');
      expect(profile.preferredMechanisms.some((m) => m.name === 'Recognition -> Relief')).toBe(true);
      expect(profile.preferredTones.some((t) => t.name === 'Warm')).toBe(true);
    });
  });

  describe('3. Targeted Regeneration Signals', () => {
    it('records visual dissatisfaction signal when visual is regenerated without rejecting the strategy', () => {
      const regenEvt: CreativeBehaviorEvent = {
        id: 'evt_regen_001',
        tenantId: 'tenant_beh_001',
        businessId: 'biz_beh_restaurant',
        campaignId: 'camp_001',
        userId: 'user_001',
        eventType: 'VISUAL_REGENERATED',
        targetType: 'VISUAL',
        fingerprint: {
          visualStyle: 'Text-Heavy Graphic',
        },
        createdAt: new Date().toISOString(),
      };

      behaviorService.recordEvent(regenEvt);

      const profile = behaviorService.getPreferenceProfile('tenant_beh_001', 'biz_beh_restaurant');
      expect(profile.disfavoredPatterns.some((d) => d.name === 'Text-Heavy Graphic')).toBe(true);
    });
  });

  describe('4. Explicit Preferences Outrank Inferred Signals', () => {
    it('prioritizes explicit user statements (confidence = 1.0) over inferred implicit preferences', () => {
      // 1. Record implicit event favoring promotional
      behaviorService.recordEvent({
        id: 'evt_implicit_001',
        tenantId: 'tenant_beh_001',
        businessId: 'biz_beh_restaurant',
        campaignId: 'camp_001',
        userId: 'user_001',
        eventType: 'HOOK_EDITED',
        targetType: 'HOOK',
        beforeValue: 'Generic',
        afterValue: 'Get our deal today',
        createdAt: new Date().toISOString(),
      });

      // 2. Record explicit preference statement explicitly disfavoring promotional copy
      const explicit: ExplicitCreativePreference = {
        id: 'exp_001',
        businessId: 'biz_beh_restaurant',
        dimension: 'HOOK',
        value: 'Promotional',
        polarity: 'DISFAVORED',
        statement: 'I don’t want promotional-sounding copy.',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        source: 'USER',
      };

      behaviorService.recordExplicitPreference(explicit);

      const context = behaviorService.getPreferenceContextForBrain('tenant_beh_001', 'biz_beh_restaurant');
      expect(context.explicitPreferences.length).toBe(1);
      expect(context.explicitPreferences[0].statement).toContain('promotional-sounding copy');
    });
  });

  describe('5. Confidence Scaling & Evidence Thresholds', () => {
    it('scales preference confidence from 0.28 for single edit up to 0.85 for 5 consistent choices', () => {
      for (let i = 1; i <= 5; i++) {
        behaviorService.recordEvent({
          id: `evt_scale_${i}`,
          tenantId: 'tenant_beh_001',
          businessId: 'biz_beh_restaurant',
          campaignId: `camp_00${i}`,
          userId: 'user_001',
          eventType: 'HOOK_EDITED',
          targetType: 'HOOK',
          beforeValue: 'Promotional deal',
          afterValue: 'Still deciding where to eat?',
          createdAt: new Date().toISOString(),
        });
      }

      const profile = behaviorService.getPreferenceProfile('tenant_beh_001', 'biz_beh_restaurant');
      const hookRating = profile.preferredHooks.find((h) => h.name.includes('RECOGNITION'));

      expect(hookRating).toBeDefined();
      expect(hookRating?.evidenceCount).toBeGreaterThanOrEqual(5);
      expect(hookRating?.confidence).toBeGreaterThanOrEqual(0.80);
      expect(hookRating?.ratingStars).toBe(4);
    });
  });

  describe('6. Exploration vs Exploitation Parameters', () => {
    it('returns 70% Exploit / 30% Explore parameters and advisory statement for Creative Brain', () => {
      const context = behaviorService.getPreferenceContextForBrain('tenant_beh_001', 'biz_beh_restaurant');

      expect(context.exploitRatio).toBe(0.70);
      expect(context.exploreRatio).toBe(0.30);
      expect(context.advisoryStatement).toContain('must not override Business Brain constraints');
    });
  });

  describe('7. Idempotency & Failed System Action Protection', () => {
    it('prevents duplicate events with identical idempotencyKey from inflating confidence', () => {
      const event: CreativeBehaviorEvent = {
        id: 'evt_dup_001',
        idempotencyKey: 'key_idempotent_123',
        tenantId: 'tenant_beh_001',
        businessId: 'biz_beh_restaurant',
        campaignId: 'camp_001',
        userId: 'user_001',
        eventType: 'CONCEPT_SELECTED',
        targetType: 'CONCEPT',
        fingerprint: { creativeMechanism: 'Recognition' },
        createdAt: new Date().toISOString(),
      };

      const firstResult = behaviorService.recordEvent(event);
      const secondResult = behaviorService.recordEvent(event);

      expect(firstResult).not.toBeNull();
      expect(secondResult).toBeNull(); // Duplicate rejected!
    });

    it('does not generate negative preference signals if system regeneration action failed', () => {
      const failedRegenEvt: CreativeBehaviorEvent = {
        id: 'evt_failed_001',
        tenantId: 'tenant_beh_001',
        businessId: 'biz_beh_restaurant',
        campaignId: 'camp_001',
        userId: 'user_001',
        eventType: 'VISUAL_REGENERATED',
        targetType: 'VISUAL',
        systemActionCompleted: false, // Network timeout / error
        fingerprint: { visualStyle: 'Photography' },
        createdAt: new Date().toISOString(),
      };

      behaviorService.recordEvent(failedRegenEvt);

      const profile = behaviorService.getPreferenceProfile('tenant_beh_001', 'biz_beh_restaurant');
      expect(profile.disfavoredPatterns.some((d) => d.name === 'Photography')).toBe(false);
    });
  });

  describe('8. Tenant & Business Isolation', () => {
    it('ensures Business A behavior events do not leak into Business B preference profile', () => {
      behaviorService.clear();

      behaviorService.recordEvent({
        id: 'evt_biz_a',
        tenantId: 'tenant_A',
        businessId: 'biz_A',
        campaignId: 'camp_A',
        userId: 'user_A',
        eventType: 'CONCEPT_SELECTED',
        targetType: 'CONCEPT',
        fingerprint: { tone: 'Playful' },
        createdAt: new Date().toISOString(),
      });

      const profileA = behaviorService.getPreferenceProfile('tenant_A', 'biz_A');
      const profileB = behaviorService.getPreferenceProfile('tenant_A', 'biz_B');

      expect(profileA.preferredTones.length).toBe(1);
      expect(profileB.preferredTones.length).toBe(0);
    });
  });
});

/**
 * PHASE 26 — Strategic Tension Engine Test Suite
 * Tests tension detection, conflict classification (Truth vs Brand vs Tension vs Preference),
 * trade-off explanations, option generation, user resolution, override tracking, and Golden Tests (#49 to #55).
 */

import { StrategicTensionService } from '../tension/strategicTensionService';
import { StrategicTensionClassifier } from '../tension/strategicTensionClassifier';

describe('PHASE 26 — Strategic Tension Engine', () => {
  let tensionService: StrategicTensionService;

  const mockPremiumProfile = {
    businessId: 'biz_gourmet',
    businessName: 'Gourmet Haven',
    positioning: 'Premium Neighborhood Fine Dining',
    brandTone: 'Warm & Refined',
    targetAudience: 'Affluent Local Families',
    confidenceScore: 0.95,
  };

  beforeEach(() => {
    tensionService = new StrategicTensionService();
  });

  describe('1. Conflict Classifier', () => {
    it('classifies unverified claims as TRUTH_CONSTRAINT', () => {
      const category = StrategicTensionClassifier.classifyConflict({
        dimension: 'POSITIONING',
        userStatement: 'Say we are #1 in Hyderabad',
        businessContextStatement: 'Premium Dining',
        isTruthClaimUnverified: true,
      });

      expect(category).toBe('TRUTH_CONSTRAINT');
    });

    it('classifies prohibited brand actions as BRAND_CONSTRAINT_CONFLICT', () => {
      const category = StrategicTensionClassifier.classifyConflict({
        dimension: 'POSITIONING',
        userStatement: 'Create 50% OFF deal',
        businessContextStatement: 'Never advertise discounts',
        isExplicitBrandProhibition: true,
      });

      expect(category).toBe('BRAND_CONSTRAINT_CONFLICT');
    });

    it('classifies minor tone differences as CREATIVE_PREFERENCE_DIFFERENCE', () => {
      const category = StrategicTensionClassifier.classifyConflict({
        dimension: 'BRAND_TONE',
        userStatement: 'Warm friendly tone',
        businessContextStatement: 'Warm tone',
      });

      expect(category).toBe('CREATIVE_PREFERENCE_DIFFERENCE');
    });

    it('classifies genuine strategic trade-offs as STRATEGIC_TENSION', () => {
      const category = StrategicTensionClassifier.classifyConflict({
        dimension: 'PRICE',
        userStatement: 'Make a ₹299 cheap discount poster',
        businessContextStatement: 'Premium Fine Dining',
      });

      expect(category).toBe('STRATEGIC_TENSION');
    });
  });

  describe('2. Golden Test #49 — Premium vs Discount Tension Detection', () => {
    it('detects strategic tension for premium positioning + heavy discount request without error/refusal', () => {
      const tension = tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g49',
        'Make a ₹299 discount poster',
        mockPremiumProfile
      );

      expect(tension).not.toBeNull();
      expect(tension?.category).toBe('STRATEGIC_TENSION');
      expect(tension?.conflictExplanation).toContain("There's a strategic tension here");
      expect(tension?.recommendedOptions.length).toBe(3);

      const optionIds = tension?.recommendedOptions.map((o) => o.id);
      expect(optionIds).toContain('opt_lead_price');
      expect(optionIds).toContain('opt_lead_premium');
      expect(optionIds).toContain('opt_show_both');
    });
  });

  describe('3. Golden Test #50 — User Chooses Price ("Lead with price")', () => {
    it('applies FOLLOW_USER_DIRECTION resolution with strategic override = true while preserving quality', () => {
      tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g50',
        'Make a ₹299 discount poster',
        mockPremiumProfile
      );

      const outcome = tensionService.resolveTension('camp_g50', 'opt_lead_price');

      expect(outcome.resolution).toBe('FOLLOW_USER_DIRECTION');
      expect(outcome.strategicOverride).toBe(true);
      expect(outcome.adaptedStrategyDirectives.heroMessage).toContain('Price-led value');
      expect(outcome.adaptedStrategyDirectives.visualQuality).toContain('High-end production');
      expect(outcome.memoryRecord.selectedDirection).toBe('Lead with price');
    });
  });

  describe('4. Golden Test #51 — User Chooses Premium ("Protect premium positioning")', () => {
    it('applies FOLLOW_BUSINESS_STRATEGY resolution putting experience as hero and offer as supporting proof', () => {
      tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g51',
        'Make a ₹299 discount poster',
        mockPremiumProfile
      );

      const outcome = tensionService.resolveTension('camp_g51', 'opt_lead_premium');

      expect(outcome.resolution).toBe('FOLLOW_BUSINESS_STRATEGY');
      expect(outcome.strategicOverride).toBe(false);
      expect(outcome.adaptedStrategyDirectives.heroMessage).toContain('Premium experience');
      expect(outcome.adaptedStrategyDirectives.offerRole).toContain('Supporting Accessibility Proof');
    });
  });

  describe('5. Golden Test #52 — "Show Me Both"', () => {
    it('generates two strategically distinct concept directions when user selects "Show me both"', () => {
      tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g52',
        'Make a ₹299 discount poster',
        mockPremiumProfile
      );

      const outcome = tensionService.resolveTension('camp_g52', 'opt_show_both');

      expect(outcome.resolution).toBe('COMPARE_OPTIONS');
      expect(outcome.comparedDirections).toBeDefined();
      expect(outcome.comparedDirections?.length).toBe(2);
      expect(outcome.comparedDirections![0].name).toContain('Price-Led');
      expect(outcome.comparedDirections![1].name).toContain('Premium Experience-Led');
    });
  });

  describe('6. Golden Test #53 — Hard Brand Constraint', () => {
    it('classifies explicit brand prohibition as BRAND_CONSTRAINT_CONFLICT (hard block)', () => {
      const tension = tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g53',
        'Create a discount deal',
        {
          ...mockPremiumProfile,
          prohibitedClaims: ['discount'],
        }
      );

      expect(tension?.category).toBe('BRAND_CONSTRAINT_CONFLICT');
      expect(tension?.conflictExplanation).toContain('prohibits');
    });
  });

  describe('7. Golden Test #54 — Truth Constraint', () => {
    it('classifies unverified #1 claims as TRUTH_CONSTRAINT (hard block)', () => {
      const tension = tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g54',
        'Say we are the #1 restaurant in Hyderabad',
        mockPremiumProfile
      );

      expect(tension?.category).toBe('TRUTH_CONSTRAINT');
      expect(tension?.conflictExplanation).toContain("I can't support the");
    });
  });

  describe('8. Golden Test #55 — Low Confidence Phrasing', () => {
    it('uses soft phrasing when positioning confidence score is low (< 0.80)', () => {
      const tension = tensionService.evaluateTension(
        'tenant_1',
        'biz_gourmet',
        'camp_g55',
        'Make a ₹299 discount poster',
        {
          ...mockPremiumProfile,
          confidenceScore: 0.50, // Low confidence
        }
      );

      expect(tension?.conflictExplanation).toContain('I see a possible strategic tension here');
    });
  });
});

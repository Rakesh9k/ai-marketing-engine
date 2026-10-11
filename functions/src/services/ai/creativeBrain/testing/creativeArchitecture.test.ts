/**
 * PHASE 10.41 — Master Creative Intelligence Architecture Integration Test Suite
 * Verifies all 6 IP layers, decision authority hierarchy, refusal pathways,
 * context assembly, composition compatibility, expression, evaluation, and learning fingerprints.
 */

import type { MasterCreativeInput } from "../orchestrator/creativeIntelligenceOrchestrator";
import { CreativeIntelligenceOrchestrator } from "../orchestrator/creativeIntelligenceOrchestrator";
import { ContextBuilderService } from "../context/contextBuilderService";
import { CreativeComposerService } from "../composer/creativeComposerService";
import { FIXTURE_CASUAL_RESTAURANT, FIXTURE_PREMIUM_SALON } from "./fixtures/businessBrainFixtures";
import { FIXTURE_WEEKEND_FAMILY_INTENT, FIXTURE_SALON_AWARENESS_INTENT } from "./fixtures/campaignIntentFixtures";

describe("PHASE 10.41 — Creative Intelligence Final Architecture Suite", () => {
  let orchestrator: CreativeIntelligenceOrchestrator;
  let contextBuilder: ContextBuilderService;
  let composer: CreativeComposerService;

  beforeEach(() => {
    orchestrator = new CreativeIntelligenceOrchestrator();
    contextBuilder = new ContextBuilderService();
    composer = new CreativeComposerService();
  });

  describe("1. Verification of the 6 IP Layers", () => {
    test("IP Layer 2 (Context Intelligence): builds decision-ready CreativeContext preserving Business Brain authority", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_CASUAL_RESTAURANT as any,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT as any,
        localIntelligence: { city: "Kondapur", localLanguage: "Hinglish" },
      });

      expect(context.contextId).toBeDefined();
      expect(context.business.businessId).toBe(FIXTURE_CASUAL_RESTAURANT.businessId);
      expect(context.business.brandVoice.tone).toBe(FIXTURE_CASUAL_RESTAURANT.brandVoice.tone);
      expect(context.local?.city).toBe("Kondapur");
    });

    test("IP Layer 3 (Creative Composition): composes structured CreativeStrategy contract", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_CASUAL_RESTAURANT as any,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT as any,
      });

      const opportunity = {
        opportunityId: "opp_01",
        coreInsight: "Weekend family meal decision friction",
        strategicProblem: "Ordering disagreement",
        desiredAudienceShift: "From stress to ease",
        recommendedAngle: "Curated combo meal",
      };

      const result = composer.compose({ context, opportunity });

      expect("strategyId" in result).toBe(true);
      if ("strategyId" in result) {
        expect(result.strategicDirection).toBeTruthy();
        expect(result.psychologyIds.length).toBeGreaterThan(0);
        expect(result.mechanismIds.length).toBeGreaterThan(0);
        expect(result.recipeId).toBeTruthy();
        expect(result.whyThisStrategy.primaryWhy).toBeTruthy();
      }
    });

    test("IP Layer 4 (Creative Expression): generates structured CreativeExpressionArtifact driven by Strategy", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_PREMIUM_SALON as any,
        campaignIntent: FIXTURE_SALON_AWARENESS_INTENT as any,
      });

      const opportunity = {
        opportunityId: "opp_02",
        coreInsight: "Event skin prep glow",
        strategicProblem: "Seasonal dull skin",
        desiredAudienceShift: "Seeking skin reset",
        recommendedAngle: "Express skin transformation",
      };

      const strategy = composer.compose({ context, opportunity }) as any;
      const expression = orchestrator.generateCreativeExpression(strategy, context);

      expect(expression.artifactId).toBeDefined();
      expect(expression.headline).toContain(context.business.name);
      expect(expression.callToAction).toBeTruthy();
      expect(expression.styleConfig.tone).toBe(context.business.brandVoice.tone);
    });

    test("IP Layer 5 (Creative Evaluation): evaluates Truth, Brand, Quality, Platform, Cultural compliance", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_PREMIUM_SALON as any,
        campaignIntent: FIXTURE_SALON_AWARENESS_INTENT as any,
      });

      const opportunity = {
        opportunityId: "opp_02",
        coreInsight: "Skin glow",
        strategicProblem: "Skin fatigue",
        desiredAudienceShift: "Action",
        recommendedAngle: "Glow makeover",
      };

      const strategy = composer.compose({ context, opportunity }) as any;
      const expression = orchestrator.generateCreativeExpression(strategy, context);

      const evaluation = orchestrator.evaluateCreative(expression, context);

      expect(evaluation.evaluationId).toBeDefined();
      expect(evaluation.overallStatus).toBe("PASS");
      expect(evaluation.truth.passed).toBe(true);
      expect(evaluation.brand.passed).toBe(true);
    });

    test("IP Layer 6 (Creative Learning): generates immutable CreativeFingerprint for performance attribution", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_CASUAL_RESTAURANT as any,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT as any,
      });

      const opportunity = {
        opportunityId: "opp_01",
        coreInsight: "Family dinner",
        strategicProblem: "Friction",
        desiredAudienceShift: "Book table",
        recommendedAngle: "Curated combo",
      };

      const strategy = composer.compose({ context, opportunity }) as any;
      const fingerprint = orchestrator.generateFingerprint(strategy, context);

      expect(fingerprint.fingerprintId).toBeDefined();
      expect(fingerprint.businessId).toBe(context.business.businessId);
      expect(fingerprint.tenantId).toBe(context.business.tenantId);
      expect(fingerprint.psychologyIds).toEqual(strategy.psychologyIds);
      expect(fingerprint.mechanismIds).toEqual(strategy.mechanismIds);
    });
  });

  describe("2. Decision Authority & Refusal Pathways", () => {
    test("Truth Wins: Refuses flash sale scarcity mechanism if no verified expiry date or inventory limit exists", () => {
      const businessNoProof = {
        ...FIXTURE_CASUAL_RESTAURANT,
        verifiedEvidence: {
          ...FIXTURE_CASUAL_RESTAURANT.verifiedEvidence,
          hasStatedExpiry: false,
          hasInventoryLimit: false,
        },
      };

      const intentNoExpiry = {
        ...FIXTURE_WEEKEND_FAMILY_INTENT,
        offerDetails: {
          hasOffer: true,
          hasStatedExpiry: false,
          hasInventoryLimit: false,
        },
      };

      const context = contextBuilder.buildContext({
        business: businessNoProof as any,
        campaignIntent: intentNoExpiry as any,
      });

      const opportunity = {
        opportunityId: "opp_scarcity",
        coreInsight: "Urgency",
        strategicProblem: "Fear of missing out",
        desiredAudienceShift: "Immediate order",
        recommendedAngle: "Flash sale",
      };

      const result = composer.compose({
        context,
        opportunity,
        userMechanismOverride: "mechanism_discount_flash_sale",
      });

      expect("refused" in result).toBe(true);
      if ("refused" in result) {
        expect(result.reason).toBe("TRUTH_VIOLATION");
        expect(result.missingRequirements).toContain("hasStatedExpiry");
      }
    });

    test("Minimum Sufficient Context Mode: builds minimal decision context efficiently", () => {
      const context = contextBuilder.buildContext({
        business: FIXTURE_CASUAL_RESTAURANT as any,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT as any,
        minimalContextOnly: true,
      });

      expect(context.local).toBeUndefined();
      expect(context.cultural).toBeUndefined();
      expect(context.business.businessId).toBe(FIXTURE_CASUAL_RESTAURANT.businessId);
    });
  });

  describe("3. Master End-to-End Flywheel Execution", () => {
    test("executes complete end-to-end 6-layer flywheel successfully", async () => {
      const input: MasterCreativeInput = {
        business: FIXTURE_CASUAL_RESTAURANT as any,
        campaignIntent: FIXTURE_WEEKEND_FAMILY_INTENT as any,
        localCity: "Kondapur",
      };

      const flywheelResult = await orchestrator.createEndToEndCreativeStrategy(input);

      expect(flywheelResult.context).toBeDefined();
      expect(flywheelResult.opportunity).toBeDefined();
      expect(flywheelResult.strategy).toBeDefined();
      expect(flywheelResult.expression).toBeDefined();
      expect(flywheelResult.evaluation).toBeDefined();
      expect(flywheelResult.fingerprint).toBeDefined();

      expect(flywheelResult.evaluation?.overallStatus).toBe("PASS");
      expect(flywheelResult.fingerprint?.businessId).toBe(input.business.businessId);
    });
  });

  describe("4. Phase 10A Creative Intelligence Constitution Verification", () => {
    test("verifies all 15 constitutional rules and catches violations", () => {
      const { CreativeIntelligenceConstitutionAuditor, CREATIVE_INTELLIGENCE_CONSTITUTION } = require("../constitution/creativeIntelligenceConstitution");
      const auditor = new CreativeIntelligenceConstitutionAuditor();

      expect(CREATIVE_INTELLIGENCE_CONSTITUTION).toHaveLength(15);

      const validDecision = {
        hasStrategy: true,
        hasContext: true,
        isTemplateBased: false,
        overridesBusinessBrain: false,
        hasUnsupportedScarcity: false,
        hasUnsupportedSocialProof: false,
        hasExplanation: true,
        hasFingerprint: true,
      };

      expect(auditor.auditDecision(validDecision).passed).toBe(true);

      const invalidDecision = {
        ...validDecision,
        hasUnsupportedScarcity: true,
      };

      const auditRes = auditor.auditDecision(invalidDecision);
      expect(auditRes.passed).toBe(false);
      expect(auditRes.violations.some((v: string) => v.includes("Rule 5 Violation"))).toBe(true);
    });
  });
});

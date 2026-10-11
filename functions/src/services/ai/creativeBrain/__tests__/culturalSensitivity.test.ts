/**
 * PHASE 10.35 — Build Cultural Sensitivity Unit & Integration Test Suite
 */

import { CulturalSensitivityService } from "../../culturalIntelligence/culturalSensitivityService";
import { CulturalRiskService } from "../../culturalIntelligence/culturalRiskService";
import { LocalReferenceService } from "../../culturalIntelligence/localReferenceService";
import { LocalizationDecisionService } from "../../culturalIntelligence/localizationDecisionService";
import { CulturalRelevanceService } from "../../culturalIntelligence/culturalRelevanceService";

describe("Phase 10.35 — Cultural Sensitivity Layer", () => {
  const service = new CulturalSensitivityService();
  const riskService = new CulturalRiskService();
  const _referenceService = new LocalReferenceService();
  const _decisionService = new LocalizationDecisionService();
  const _relevanceService = new CulturalRelevanceService();

  const BIZ_1 = "biz_salon_kondapur";
  const BIZ_REST = "biz_rest_gachibowli";
  const TENANT_A = "tenant_hyderabad_salon";
  const TENANT_B = "tenant_unauthorized";

  describe("1. Forced Localization Detector & Naturalness Test", () => {
    it("should flag superficial city/neighborhood name insertion as FORCED_LOCALIZATION risk", () => {
      const { risks, forcedLocalizationRisk, riskPenalty } = riskService.evaluateCulturalRisks(
        {
          businessId: BIZ_1,
          businessCategory: "SALON",
          campaignIntent: "Hair transformation",
          location: { city: "Hyderabad", neighborhood: "Kondapur" },
        },
        "Feel beautiful in Kondapur! Come visit us near HITEC City!"
      );

      expect(forcedLocalizationRisk).toBe("HIGH");
      expect(riskPenalty).toBeGreaterThan(0);
      expect(risks.some((r) => r.type === "FORCED_LOCALIZATION")).toBe(true);
    });

    it("should pass natural situational localization with low forced localization risk", () => {
      const { forcedLocalizationRisk, riskPenalty } = riskService.evaluateCulturalRisks(
        {
          businessId: BIZ_REST,
          businessCategory: "RESTAURANT",
          campaignIntent: "Weekday office lunch",
          audience: "IT professionals",
          location: { city: "Hyderabad", neighborhood: "Gachibowli" },
        },
        "Lunch sorted before your next meeting."
      );

      expect(forcedLocalizationRisk).toBe("LOW");
      expect(riskPenalty).toBe(0);
    });
  });

  describe("2. Cultural Expression Levels (NONE, SUBTLE, MODERATE, EXPLICIT)", () => {
    it("should select Level 1 (SUBTLE) localization for weekday office lunch in Gachibowli", async () => {
      const evalResult = await service.evaluateCulturalContext({
        businessId: BIZ_REST,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        campaignIntent: "Weekday office lunch",
        audience: "IT professionals",
        location: { city: "Hyderabad", neighborhood: "Gachibowli" },
      });

      expect(evalResult.localizationDecision.shouldLocalize).toBe(true);
      expect(evalResult.localizationDecision.expressionLevel).toBe("SUBTLE");
      expect(evalResult.explanation).toContain("Level 1 (SUBTLE)");
    });

    it("should select Level 3 (EXPLICIT) localization for a dedicated cultural festival campaign", async () => {
      const evalResult = await service.evaluateCulturalContext({
        businessId: BIZ_REST,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        campaignIntent: "Hyderabad food festival celebration",
        audience: "Food enthusiasts",
        location: { city: "Hyderabad", neighborhood: "Banjara Hills" },
      });

      expect(evalResult.localizationDecision.expressionLevel).toBe("EXPLICIT");
    });
  });

  describe("3. Business Brain > Local Intelligence Override", () => {
    it("should enforce business preference (ENGLISH_ONLY) over generic local language recommendations", async () => {
      await service.saveBusinessOverride({
        businessId: BIZ_REST,
        tenantId: TENANT_A,
        preferenceType: "LANGUAGE_CHOICE",
        value: "ENGLISH_ONLY",
        reason: "Brand voice is English-first premium",
      });

      const evalResult = await service.evaluateCulturalContext({
        businessId: BIZ_REST,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        location: { city: "Hyderabad", neighborhood: "Kondapur" },
      });

      expect(evalResult.localizationDecision.recommendedLanguages).toEqual(["English"]);
      expect(evalResult.explanation).toBeDefined();
    });
  });

  describe("4. Sensitivity Rules & Policy Verification", () => {
    it("should flag inappropriate commercialization of religious terms", () => {
      const { warnings, blocked } = service["ruleService"].checkCampaignSensitivity(
        { businessId: BIZ_1, businessCategory: "SALON" },
        "Get holy biryani deal now!"
      );

      expect(blocked).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe("5. Multi-Tenant Security & Audit Logging", () => {
    it("should enforce tenant security on business cultural overrides", async () => {
      await expect(service.getBusinessOverrides(BIZ_REST, TENANT_B)).rejects.toThrow(
        "Tenant Security Exception"
      );
    });

    it("should log audit events when cultural context is evaluated", async () => {
      await service.evaluateCulturalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "SALON",
        location: { city: "Hyderabad" },
      });

      const events = await service.getAuditEvents(BIZ_1);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe("CULTURAL_RECOMMENDATION_SHOWN");
    });
  });

  describe("6. Explain Why Integration (Phase 10.30)", () => {
    it("should explain why explicit local markers were intentionally omitted when using SUBTLE localization", async () => {
      const evalResult = await service.evaluateCulturalContext({
        businessId: BIZ_REST,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        campaignIntent: "Weekday office lunch",
        location: { city: "Hyderabad", neighborhood: "Gachibowli" },
      });

      expect(evalResult.explanation).toContain("explicit location names were intentionally omitted");
    });
  });
});

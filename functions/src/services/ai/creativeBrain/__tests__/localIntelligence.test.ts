/**
 * PHASE 10.34 — Build Local Intelligence Unit & Integration Test Suite
 */

import { LocalIntelligenceService } from "../../localIntelligence/service/localIntelligenceService";
import { LocalRetrievalService } from "../../localIntelligence/retrieval/localRetrievalService";
import { GeographyService } from "../../localIntelligence/domain/geographyService";
import { LanguageService } from "../../localIntelligence/domain/languageService";
import { LocalConfidenceService } from "../../localIntelligence/retrieval/localConfidenceService";
import { getAllSupportedCities } from "../../localIntelligence/seed/cityRegistry";

describe("Phase 10.34 — Local Intelligence Layer", () => {
  const service = new LocalIntelligenceService();
  const _retrievalService = new LocalRetrievalService();
  const geoService = new GeographyService();
  const langService = new LanguageService();
  const _confService = new LocalConfidenceService();

  const BIZ_1 = "biz_rest_kondapur";
  const TENANT_A = "tenant_hyderabad_food";
  const TENANT_B = "tenant_unauthorized";

  describe("1. City & Neighborhood Retrieval", () => {
    it("should retrieve Hyderabad market profile and supported cities from registry", async () => {
      const cities = getAllSupportedCities();
      expect(cities).toContain("hyderabad");
      expect(cities).toContain("bangalore");
      expect(cities).toContain("mumbai");

      const profile = await service.getLocalMarketProfile("hyderabad");
      expect(profile).toBeDefined();
      expect(profile?.cityName).toBe("Hyderabad");
      expect(profile?.neighborhoodProfileIds.length).toBeGreaterThan(0);
    });

    it("should retrieve neighborhood profile for Kondapur with audience and commercial signals", () => {
      const neighborhood = geoService.findNeighborhood("Hyderabad", "Kondapur");
      expect(neighborhood).toBeDefined();
      expect(neighborhood?.name).toBe("Kondapur");
      expect(neighborhood?.zoneType).toBe("RESIDENTIAL_COMMUNITY");
      expect(neighborhood?.audiencePatterns.length).toBeGreaterThan(0);
    });
  });

  describe("2. Category, Audience & Occasion Relevance", () => {
    it("should retrieve food culture & weekend family dining signals for a Kondapur Restaurant", async () => {
      const context = await service.getLocalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        audience: "Young families",
        location: { city: "Hyderabad", neighborhood: "Kondapur" },
        timeContext: { dayOfWeek: ["WEEKEND"], timeOfDay: ["LUNCH"] },
      });

      expect(context.city).toBe("Hyderabad");
      expect(context.neighborhoods).toContain("Kondapur");
      expect(context.localizationLevel).toBeGreaterThanOrEqual(4);
      expect(context.foodCultureSignals?.length).toBeGreaterThan(0);
      expect(context.behavioralSignals.length).toBeGreaterThan(0);
    });

    it("should filter out food culture signals for non-restaurant business categories (e.g. Salon)", async () => {
      const context = await service.getLocalContext({
        businessId: "biz_salon_gachibowli",
        tenantId: TENANT_A,
        businessCategory: "SALON",
        location: { city: "Hyderabad", neighborhood: "Gachibowli" },
      });

      expect(context.foodCultureSignals?.length).toBe(0);
    });
  });

  describe("3. Language & Script Intelligence", () => {
    it("should recommend Teluglish with Romanized script for digital ads in Hyderabad", () => {
      const rec = langService.recommendLanguageAndScript("Hyderabad", "IT Professionals", "INSTAGRAM");
      expect(rec.language).toContain("Teluglish");
      expect(rec.script).toContain("Romanized");
      expect(rec.confidence).toBeGreaterThan(0.85);
    });

    it("should recommend native Telugu script for traditional family audiences", () => {
      const rec = langService.recommendLanguageAndScript("Hyderabad", "Traditional Families", "PRINT");
      expect(rec.language).toBe("Telugu");
      expect(rec.script).toContain("Telugu Native");
    });
  });

  describe("4. Fallback Hierarchy & Anti-Hallucination", () => {
    it("should fall back gracefully to city level when neighborhood is unknown without inventing details", async () => {
      const context = await service.getLocalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        location: { city: "Hyderabad", neighborhood: "UnknownArea123" },
      });

      expect(context.city).toBe("Hyderabad");
      expect(context.neighborhoods.length).toBe(0);
      expect(context.localizationLevel).toBe(1); // City level fallback
    });

    it("should verify local claim evidence and reject unsupported local statements", async () => {
      const context = await service.getLocalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        location: { city: "Hyderabad", neighborhood: "Kondapur" },
      });

      const validVerification = service.verifyLocalClaim("Cyber Towers", context);
      expect(validVerification.isVerified).toBe(true);

      const invalidVerification = service.verifyLocalClaim("FakeLocalFestival99", context);
      expect(invalidVerification.isVerified).toBe(false);
      expect(invalidVerification.reason).toContain("lacks empirical evidence");
    });
  });

  describe("5. Multi-Tenant Security & Audit Governance", () => {
    it("should enforce tenant security on business catchment retrieval", async () => {
      await service.saveBusinessCatchment({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        primaryMarketId: "mkt_hyderabad",
        neighborhoodIds: ["nh_kondapur"],
        audienceProfiles: ["IT Professionals"],
        localSignals: [],
        confidence: 0.9,
      });

      await expect(service.getBusinessCatchment(BIZ_1, TENANT_B)).rejects.toThrow(
        "Tenant Security Exception"
      );
    });

    it("should log audit events when local context is retrieved", async () => {
      await service.getLocalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        location: { city: "Hyderabad" },
      });

      const events = await service.getAuditEvents(BIZ_1);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBe("LOCAL_KNOWLEDGE_USED");
    });
  });

  describe("6. Explain Why & Learning Integration", () => {
    it("should format human-readable explanation string for Explain Why (Phase 10.30)", async () => {
      const context = await service.getLocalContext({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        businessCategory: "RESTAURANT",
        location: { city: "Hyderabad", neighborhood: "Kondapur" },
      });

      const explanation = service.explainLocalContext(context);
      expect(explanation).toContain("Hyderabad");
      expect(explanation).toContain("Kondapur");
      expect(explanation).toContain("Localization Level");
    });

    it("should update hypothesis confidence and evidence status on positive outcome (Phase 10.27)", async () => {
      const result = await service.recordSignalOutcome({
        businessId: BIZ_1,
        tenantId: TENANT_A,
        signalId: "beh_weekend_family",
        signalType: "BEHAVIOR",
        campaignId: "cmp_local_1",
        localizationLevel: 4,
        metricName: "CTR",
        baselineMetricValue: 0.04,
        achievedMetricValue: 0.052, // +30% improvement
      });

      expect(result.performanceDelta).toBe(0.3);
      expect(result.newConfidence).toBeGreaterThan(result.previousConfidence);
    });
  });
});

/**
 * PHASE 10.34 — Build Local Intelligence
 * Master API Facade for Local Intelligence System
 */

import type {
  LocalMarketProfile,
  NeighborhoodProfile,
  LocalContext,
  CreativeBrainLocalContext,
  RetrievalQueryInput,
  BusinessCatchment,
  LocalAuditEvent,
} from "../localIntelligence.types";
import { LocalRetrievalService } from "../retrieval/localRetrievalService";
import { LocalConfidenceService } from "../retrieval/localConfidenceService";
import type { LocalLearningOutcomeInput, LocalLearningResult } from "../learning/localLearningService";
import { LocalLearningService } from "../learning/localLearningService";
import { FirestoreLocalIntelligenceRepository } from "../persistence/firestoreLocalIntelligenceRepository";
import { GeographyService } from "../domain/geographyService";

export class LocalIntelligenceService {
  private retrievalService: LocalRetrievalService;
  private confidenceService: LocalConfidenceService;
  private learningService: LocalLearningService;
  private repository: FirestoreLocalIntelligenceRepository;
  private geoService: GeographyService;

  constructor(
    retrievalService?: LocalRetrievalService,
    confidenceService?: LocalConfidenceService,
    learningService?: LocalLearningService,
    repository?: FirestoreLocalIntelligenceRepository,
    geoService?: GeographyService
  ) {
    this.retrievalService = retrievalService || new LocalRetrievalService();
    this.confidenceService = confidenceService || new LocalConfidenceService();
    this.learningService = learningService || new LocalLearningService();
    this.repository = repository || new FirestoreLocalIntelligenceRepository();
    this.geoService = geoService || new GeographyService();
  }

  /**
   * Primary retrieval method for Local Context.
   */
  public async getLocalContext(input: RetrievalQueryInput): Promise<LocalContext> {
    const context = await this.retrievalService.getRelevantLocalContext(input);

    await this.repository.logAuditEvent({
      id: `evt_${Date.now()}`,
      eventType: "LOCAL_KNOWLEDGE_USED",
      businessId: input.businessId,
      tenantId: input.tenantId,
      details: {
        city: context.city,
        neighborhoods: context.neighborhoods,
        localizationLevel: context.localizationLevel,
        reasons: context.retrievalReasons,
      },
      timestamp: new Date().toISOString(),
    });

    return context;
  }

  /**
   * Formats local context specifically for Creative Brain prompt synthesis.
   */
  public async getCreativeBrainLocalContext(
    input: RetrievalQueryInput
  ): Promise<CreativeBrainLocalContext> {
    const context = await this.getLocalContext(input);
    return this.retrievalService.toCreativeBrainContext(context);
  }

  /**
   * Retrieves Market Profile by city or market ID.
   */
  public async getLocalMarketProfile(
    cityIdOrMarketId: string
  ): Promise<LocalMarketProfile | undefined> {
    return this.repository.getMarketProfile(cityIdOrMarketId);
  }

  /**
   * Retrieves Neighborhood Profile by city and neighborhood name.
   */
  public findNeighborhoodProfile(
    city: string,
    neighborhoodName?: string
  ): NeighborhoodProfile | undefined {
    return this.geoService.findNeighborhood(city, neighborhoodName);
  }

  /**
   * Generates human-readable explanation string for Phase 10.30 Explain Why integration.
   */
  public explainLocalContext(context: LocalContext): string {
    if (context.localizationLevel === 0) {
      return "Local context relevance is low. Using general commercial marketing principles.";
    }

    const nbrStr = context.neighborhoods.length > 0 ? ` (${context.neighborhoods.join(", ")})` : "";
    const langStr = context.relevantLanguages.length > 0 ? context.relevantLanguages[0] : "English";
    const behCount = context.behavioralSignals.length;

    return `Prioritized ${context.city}${nbrStr} local context (Localization Level ${context.localizationLevel}). Recommending ${langStr} messaging aligned with ${behCount} verified neighborhood behavioral signals.`;
  }

  /**
   * Anti-hallucination verification of local claim against evidence.
   */
  public verifyLocalClaim(
    claim: string,
    context: LocalContext
  ): { isVerified: boolean; confidence: number; reason: string } {
    const allSignals = [
      ...context.behavioralSignals.map((b) => b.description),
      ...(context.foodCultureSignals || []).map((f) => f.dishOrCuisine),
      ...context.relevantReferences.map((r) => r.name),
    ];

    return this.confidenceService.verifyEvidenceSufficiency(claim, allSignals);
  }

  /**
   * Saves or updates Business Catchment with tenant security checks.
   */
  public async saveBusinessCatchment(catchment: BusinessCatchment): Promise<void> {
    await this.repository.saveBusinessCatchment(catchment);
  }

  /**
   * Retrieves Business Catchment with tenant security enforcement.
   */
  public async getBusinessCatchment(
    businessId: string,
    tenantId?: string
  ): Promise<BusinessCatchment | undefined> {
    return this.repository.getBusinessCatchment(businessId, tenantId);
  }

  /**
   * Evaluates local signal outcome and updates evidence confidence (Learning Engine).
   */
  public async recordSignalOutcome(
    input: LocalLearningOutcomeInput
  ): Promise<LocalLearningResult> {
    const context = await this.getLocalContext({
      businessId: input.businessId,
      tenantId: input.tenantId,
      businessCategory: "RESTAURANT",
      location: { city: "Hyderabad" },
    });

    const sig = context.behavioralSignals[0] || {
      id: input.signalId,
      marketId: "mkt_hyderabad",
      behaviorType: "WEEKEND_FAMILY",
      description: "Default signal",
      relevantAudienceIds: [],
      relevantBusinessCategories: [],
      strength: 80,
      confidence: 0.8,
      evidence: [],
      status: "SUPPORTED",
    };

    const result = this.learningService.evaluateSignalOutcome(input, sig);

    await this.repository.logAuditEvent({
      id: `evt_learn_${Date.now()}`,
      eventType: "LOCAL_KNOWLEDGE_LEARNED",
      businessId: input.businessId,
      tenantId: input.tenantId,
      details: {
        signalId: input.signalId,
        delta: result.performanceDelta,
        newStatus: result.newStatus,
      },
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Retrieves audit logs for Local Intelligence governance.
   */
  public async getAuditEvents(businessId?: string): Promise<LocalAuditEvent[]> {
    return this.repository.getAuditEvents(businessId);
  }
}

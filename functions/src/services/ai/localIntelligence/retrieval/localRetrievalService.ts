/**
 * PHASE 10.34 — Build Local Intelligence
 * Local Retrieval Service: Primary Orchestrator for Context Retrieval & Budgeting
 */

import type {
  RetrievalQueryInput,
  LocalContext,
  CreativeBrainLocalContext,
  ContextBudgetConfig,
} from "../localIntelligence.types";
import { GeographyService } from "../domain/geographyService";
import { LanguageService } from "../domain/languageService";
import { BehaviorService, OccasionService } from "../domain/behaviorAndOccasionServices";
import { FoodCultureService, ReferenceService, AudienceDomainService, SeasonalityDomainService } from "../domain/foodCultureAndReferenceServices";
import { LocalConfidenceService } from "./localConfidenceService";

const DEFAULT_BUDGET: ContextBudgetConfig = {
  maxLocalSignals: 10,
  maxReferences: 5,
  maxBehavioralSignals: 5,
  maxLanguageSignals: 3,
  maxOccasions: 4,
};

export class LocalRetrievalService {
  private geoService: GeographyService;
  private langService: LanguageService;
  private behService: BehaviorService;
  private occService: OccasionService;
  private foodService: FoodCultureService;
  private refService: ReferenceService;
  private audService: AudienceDomainService;
  private seasService: SeasonalityDomainService;
  private confService: LocalConfidenceService;

  constructor(
    geoService?: GeographyService,
    langService?: LanguageService,
    behService?: BehaviorService,
    occService?: OccasionService,
    foodService?: FoodCultureService,
    refService?: ReferenceService,
    audService?: AudienceDomainService,
    seasService?: SeasonalityDomainService,
    confService?: LocalConfidenceService
  ) {
    this.geoService = geoService || new GeographyService();
    this.langService = langService || new LanguageService();
    this.behService = behService || new BehaviorService();
    this.occService = occService || new OccasionService();
    this.foodService = foodService || new FoodCultureService();
    this.refService = refService || new ReferenceService();
    this.audService = audService || new AudienceDomainService();
    this.seasService = seasService || new SeasonalityDomainService();
    this.confService = confService || new LocalConfidenceService();
  }

  /**
   * Retrieves relevance-budgeted LocalContext for campaign generation.
   */
  public async getRelevantLocalContext(
    input: RetrievalQueryInput,
    budgetConfig: ContextBudgetConfig = DEFAULT_BUDGET
  ): Promise<LocalContext> {
    const city = input.location?.city || "Hyderabad";
    const neighborhoodName = input.location?.neighborhood;

    const neighborhood = this.geoService.findNeighborhood(city, neighborhoodName);
    const catchment = this.geoService.getBusinessCatchment(input.businessId, city, neighborhoodName);

    const relevanceScore = this.confService.calculateRelevanceScore(input, neighborhood);

    const langRec = this.langService.recommendLanguageAndScript(
      city,
      input.audience,
      input.format
    );

    const behaviorSignals = this.behService.getBehaviorSignals(
      city,
      input.businessCategory,
      neighborhoodName
    ).slice(0, budgetConfig.maxBehavioralSignals);

    const occasions = this.occService.getLocalOccasions(
      city,
      input.businessCategory,
      neighborhoodName
    ).slice(0, budgetConfig.maxOccasions);

    const references = this.refService.getLocalReferences(city).slice(0, budgetConfig.maxReferences);
    const foodSignals = this.foodService.getFoodCultureSignals(city, input.businessCategory);
    const audienceSignals = this.audService.getLocalAudienceProfiles(city);
    const seasonalSignals = this.seasService.getSeasonalSignals(city);

    // Determine Localization Level (0 to 5)
    let level: 0 | 1 | 2 | 3 | 4 | 5 = 1;
    if (relevanceScore.overall < 40) {
      level = 0;
    } else if (!neighborhood && neighborhoodName) {
      // Specified neighborhood was not found -> fallback gracefully to City Level
      level = 1;
    } else if (relevanceScore.overall >= 90 && neighborhood && behaviorSignals.length > 0) {
      level = 5;
    } else if (relevanceScore.overall >= 80 && behaviorSignals.length > 0) {
      level = 4;
    } else if (relevanceScore.overall >= 70 && neighborhood) {
      level = 3;
    } else if (neighborhood) {
      level = 2;
    }

    const retrievalReasons: string[] = [
      `Geographic fit for ${city}${neighborhoodName ? ` / ${neighborhoodName}` : ""}`,
      `Category fit for ${input.businessCategory}`,
      `Language recommendation: ${langRec.language} (${langRec.script})`,
    ];

    if (behaviorSignals.length > 0) {
      retrievalReasons.push(`Matched ${behaviorSignals.length} local behavioral signals`);
    }

    return {
      marketId: catchment.primaryMarketId,
      city,
      neighborhoods: neighborhood ? [neighborhood.name] : [],
      relevantLanguages: [langRec.language],
      relevantReferences: references,
      behavioralSignals: behaviorSignals,
      relevantOccasions: occasions,
      audienceSignals,
      commerceSignals: neighborhood ? neighborhood.commercialPatterns : [],
      foodCultureSignals: foodSignals,
      seasonalSignals,
      confidence: relevanceScore.confidence,
      retrievalReasons,
      localizationLevel: level,
    };
  }

  /**
   * Formats LocalContext into lightweight CreativeBrainLocalContext for prompt synthesis.
   */
  public toCreativeBrainContext(context: LocalContext): CreativeBrainLocalContext {
    return {
      market: context.city,
      neighborhood: context.neighborhoods.length > 0 ? context.neighborhoods[0] : undefined,
      audienceSignals: context.audienceSignals.map((a) => `${a.name}: ${a.description}`),
      behavioralSignals: context.behavioralSignals.map((b) => b.description),
      occasionSignals: context.relevantOccasions.map((o) => o.name),
      languageSignals: context.relevantLanguages,
      culturalSignals: (context.foodCultureSignals || []).map((f) => f.culturalRelevance),
      relevantReferences: context.relevantReferences.map((r) => `${r.name} (${r.type})`),
      confidence: context.confidence,
      localizationLevel: context.localizationLevel,
    };
  }
}

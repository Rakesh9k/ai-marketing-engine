/**
 * PHASE 10.35 — Build Cultural Sensitivity
 * Master API Facade for Cultural Sensitivity Layer
 */

import type {
  CulturalEvalInput,
  CulturalCreativeContext,
  CulturalContext,
  CulturalPreferenceOverride,
  CulturalAuditEvent,
} from "./culturalIntelligence.types";
import { CulturalRelevanceService } from "./culturalRelevanceService";
import { CulturalRiskService } from "./culturalRiskService";
import { LocalReferenceService } from "./localReferenceService";
import { SensitivityRuleService } from "./sensitivityRuleService";
import { LocalizationDecisionService } from "./localizationDecisionService";
import { CulturalExplanationService } from "./culturalExplanationService";
import type { CulturalPreferenceFeedbackInput } from "./culturalLearningService";
import { CulturalLearningService } from "./culturalLearningService";
import { FirestoreCulturalIntelligenceRepository } from "./firestoreCulturalIntelligenceRepository";
import { LocalIntelligenceService } from "../localIntelligence/service/localIntelligenceService";

export class CulturalSensitivityService {
  private relevanceService: CulturalRelevanceService;
  private riskService: CulturalRiskService;
  private referenceService: LocalReferenceService;
  private ruleService: SensitivityRuleService;
  private decisionService: LocalizationDecisionService;
  private explanationService: CulturalExplanationService;
  private learningService: CulturalLearningService;
  private repository: FirestoreCulturalIntelligenceRepository;
  private localService: LocalIntelligenceService;

  constructor(
    relevanceService?: CulturalRelevanceService,
    riskService?: CulturalRiskService,
    referenceService?: LocalReferenceService,
    ruleService?: SensitivityRuleService,
    decisionService?: LocalizationDecisionService,
    explanationService?: CulturalExplanationService,
    learningService?: CulturalLearningService,
    repository?: FirestoreCulturalIntelligenceRepository,
    localService?: LocalIntelligenceService
  ) {
    this.relevanceService = relevanceService || new CulturalRelevanceService();
    this.riskService = riskService || new CulturalRiskService();
    this.referenceService = referenceService || new LocalReferenceService();
    this.ruleService = ruleService || new SensitivityRuleService();
    this.decisionService = decisionService || new LocalizationDecisionService();
    this.explanationService = explanationService || new CulturalExplanationService();
    this.learningService = learningService || new CulturalLearningService();
    this.repository = repository || new FirestoreCulturalIntelligenceRepository();
    this.localService = localService || new LocalIntelligenceService();
  }

  /**
   * Primary API method to evaluate Cultural Context & Localization Decision for Creative Brain.
   */
  public async evaluateCulturalContext(
    input: CulturalEvalInput,
    proposedCopy?: string
  ): Promise<CulturalCreativeContext> {
    // 1. Retrieve Local Context from Phase 10.34
    const localContext = await this.localService.getLocalContext({
      businessId: input.businessId,
      tenantId: input.tenantId,
      businessCategory: input.businessCategory,
      campaignIntent: input.campaignIntent,
      audience: input.audience,
      objective: input.objective,
      location: input.location,
      format: input.format,
    });

    // 2. Fetch tenant business overrides
    const overrides = await this.repository.getBusinessOverrides(input.businessId, input.tenantId);

    // 3. Compute Cultural Relevance Score
    const relevanceScore = this.relevanceService.calculateRelevanceScore(input);

    // 4. Evaluate candidate local references (Naturalness Test)
    const referenceContexts = this.referenceService.evaluateLocalReferences(
      localContext.relevantReferences,
      input
    );

    // 5. Compute Localization Decision & Strategy
    const { decision, strategy } = this.decisionService.makeLocalizationDecision(
      input,
      relevanceScore,
      referenceContexts,
      overrides
    );

    // 6. Evaluate Risks & Forced Localization
    const { risks } = this.riskService.evaluateCulturalRisks(input, proposedCopy);

    // 7. Check Sensitivity Rules
    const sensitivityRules = this.ruleService.getSensitivityRules(localContext.marketId);

    // 8. Generate Explanation for Explain Why (Phase 10.30)
    const explanation = this.explanationService.explainLocalizationDecision(strategy);

    // 9. Build CulturalContext object
    const culturalContext: CulturalContext = {
      marketId: localContext.marketId,
      culturalSignals: [],
      localReferences: referenceContexts,
      sensitivityRules,
      culturalRelevanceScore: relevanceScore.overall,
      expressionRecommendation: decision.expressionLevel,
      confidence: relevanceScore.confidence,
      retrievedAt: new Date().toISOString(),
    };

    // 10. Log Audit Event
    await this.repository.logAuditEvent({
      id: `evt_cult_${Date.now()}`,
      eventType: "CULTURAL_RECOMMENDATION_SHOWN",
      businessId: input.businessId,
      tenantId: input.tenantId,
      details: {
        expressionLevel: decision.expressionLevel,
        relevanceScore: relevanceScore.overall,
        explanation,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      localizationDecision: decision,
      culturalContext,
      sensitivityRules,
      localReferences: referenceContexts,
      culturalRisks: risks,
      explanation,
    };
  }

  /**
   * Records user cultural preference override.
   */
  public async saveBusinessOverride(
    feedback: CulturalPreferenceFeedbackInput
  ): Promise<CulturalPreferenceOverride> {
    const override = this.learningService.processPreferenceFeedback(feedback);
    await this.repository.saveBusinessOverride(override);

    await this.repository.logAuditEvent({
      id: `evt_override_${Date.now()}`,
      eventType: "CULTURAL_OVERRIDE_CREATED",
      businessId: feedback.businessId,
      tenantId: feedback.tenantId,
      details: {
        preferenceType: feedback.preferenceType,
        value: feedback.value,
      },
      timestamp: new Date().toISOString(),
    });

    return override;
  }

  /**
   * Retrieves business overrides with tenant security enforcement.
   */
  public async getBusinessOverrides(
    businessId: string,
    tenantId?: string
  ): Promise<CulturalPreferenceOverride[]> {
    return this.repository.getBusinessOverrides(businessId, tenantId);
  }

  /**
   * Retrieves audit events for Cultural Intelligence governance.
   */
  public async getAuditEvents(businessId?: string): Promise<CulturalAuditEvent[]> {
    return this.repository.getAuditEvents(businessId);
  }
}

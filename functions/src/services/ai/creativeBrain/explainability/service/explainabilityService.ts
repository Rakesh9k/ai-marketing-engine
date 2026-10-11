import type {
  CreativeExplanation,
  CreativeReasoningGraph,
  ExplanationDepth,
  UserOverrideRecord,
  DecisionTrace,
} from "../../types/explainability";
import { FirestoreTraceRepository } from "../persistence/firestoreTraceRepository";
import { DecisionTraceService } from "../trace/decisionTraceService";
import { ReasoningGraphService } from "../reasoning/reasoningGraphService";
import { ExplanationService } from "../explanation/explanationService";
import { ExplanationValidator } from "../validation/explanationValidator";
import { UserOverrideService } from "../overrides/userOverrideService";

export class ExplainabilityService {
  private traceRepo: FirestoreTraceRepository;
  private traceService: DecisionTraceService;
  private graphService: ReasoningGraphService;
  private explanationService: ExplanationService;
  private validator: ExplanationValidator;
  private overrideService: UserOverrideService;

  constructor(
    traceRepo?: FirestoreTraceRepository,
    traceService?: DecisionTraceService,
    graphService?: ReasoningGraphService,
    explanationService?: ExplanationService,
    validator?: ExplanationValidator,
    overrideService?: UserOverrideService
  ) {
    this.traceRepo = traceRepo || new FirestoreTraceRepository();
    this.traceService = traceService || new DecisionTraceService(this.traceRepo);
    this.graphService = graphService || new ReasoningGraphService();
    this.explanationService = explanationService || new ExplanationService(this.graphService);
    this.validator = validator || new ExplanationValidator();
    this.overrideService = overrideService || new UserOverrideService(this.traceRepo);
  }

  /**
   * Retrieves and formats an explanation for a single decision within a trace.
   */
  public async explainDecision(
    sessionId: string,
    tenantId: string,
    decisionId?: string,
    depth: ExplanationDepth = "STRATEGIC"
  ): Promise<CreativeExplanation> {
    const trace = await this.getValidatedTraceBySession(sessionId, tenantId);
    const explanation = this.explanationService.generateExplanation(trace, decisionId, depth);

    const validation = this.validator.validateExplanation(explanation, trace, tenantId);
    if (!validation.isValid) {
      throw new Error(`Explanation Validation Failed: ${validation.violations.join("; ")}`);
    }

    return explanation;
  }

  /**
   * Retrieves and formats a holistic strategy explanation for a campaign.
   */
  public async explainCampaignStrategy(
    campaignId: string,
    tenantId: string,
    depth: ExplanationDepth = "STRATEGIC"
  ): Promise<CreativeExplanation> {
    const trace = await this.traceRepo.getTraceByCampaignId(campaignId);
    if (!trace) {
      throw new Error(`No decision trace found for campaign ID '${campaignId}'`);
    }

    if (trace.tenantId && trace.tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access campaign trace for '${campaignId}'`);
    }

    const explanation = this.explanationService.generateCampaignExplanation(trace, depth);
    const validation = this.validator.validateExplanation(explanation, trace, tenantId);

    if (!validation.isValid) {
      throw new Error(`Campaign Explanation Validation Failed: ${validation.violations.join("; ")}`);
    }

    return explanation;
  }

  /**
   * Explains why a specific alternative was rejected in favor of the selected decision.
   */
  public async explainRejection(
    sessionId: string,
    tenantId: string,
    decisionId: string,
    alternativeName: string
  ): Promise<string> {
    const trace = await this.getValidatedTraceBySession(sessionId, tenantId);
    const decision = trace.decisions.find((d) => d.id === decisionId);

    if (!decision) {
      throw new Error(`Decision '${decisionId}' not found in trace '${sessionId}'`);
    }

    const alternative = decision.alternatives.find(
      (a) => a.name.toLowerCase() === alternativeName.toLowerCase() || a.id === alternativeName
    );

    if (!alternative) {
      return `Alternative '${alternativeName}' was not among the evaluated options for ${decision.decisionType}. Selected option was '${decision.selectedName}' (score: ${decision.confidence.score.toFixed(2)}).`;
    }

    const diff = ((decision.confidence.score || 0) - (alternative.score || 0)).toFixed(2);
    const reasons = alternative.rejectionReasons.length > 0
      ? alternative.rejectionReasons.join("; ")
      : `Scored ${alternative.score?.toFixed(2)} vs selected '${decision.selectedName}' score ${decision.confidence.score.toFixed(2)}`;

    return `'${alternative.name}' was rejected in favor of '${decision.selectedName}' for ${decision.decisionType} (Score difference: ${diff}). Rejection reasons: ${reasons}.`;
  }

  /**
   * Returns the Directed Acyclic Graph (DAG) for a decision session.
   */
  public async getReasoningGraph(sessionId: string, tenantId: string): Promise<CreativeReasoningGraph> {
    const trace = await this.getValidatedTraceBySession(sessionId, tenantId);
    return this.graphService.buildReasoningGraph(trace);
  }

  /**
   * Records a user override signal.
   */
  public async recordUserOverride(override: UserOverrideRecord): Promise<void> {
    await this.overrideService.recordOverride(override);
  }

  /**
   * Returns user override history for a tenant.
   */
  public async getUserOverrides(tenantId: string): Promise<UserOverrideRecord[]> {
    return this.overrideService.getOverridesForTenant(tenantId);
  }

  /**
   * Helper to fetch trace and enforce multi-tenant isolation.
   */
  private async getValidatedTraceBySession(sessionId: string, tenantId: string): Promise<DecisionTrace> {
    const trace = await this.traceRepo.getTraceBySessionId(sessionId);
    if (!trace) {
      throw new Error(`Decision trace not found for session ID '${sessionId}'`);
    }

    if (trace.tenantId && trace.tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access session trace for '${sessionId}'`);
    }

    return trace;
  }
}

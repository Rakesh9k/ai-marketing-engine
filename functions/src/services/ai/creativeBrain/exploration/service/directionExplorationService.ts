import type {
  StrategicDirectionCandidate,
  StrategicExploreDirectionRequest,
  ExploreDirectionsResult,
  DirectionSelectionResult,
  DirectionComparison,
} from "../../types/directions";
import { DirectionCandidateGenerator } from "../generation/directionCandidateGenerator";
import { DirectionDiversityEngine } from "../diversity/directionDiversityEngine";
import { DirectionScoringEngine } from "../scoring/directionScoringEngine";
import { DirectionDifferenceExplainer } from "../explainer/directionDifferenceExplainer";
import { DirectionSwitchingEngine } from "../switching/directionSwitchingEngine";
import { FirestoreDirectionRepository } from "../persistence/firestoreDirectionRepository";
import { UserOverrideService } from "../../explainability/overrides/userOverrideService";

export class DirectionExplorationService {
  private generator: DirectionCandidateGenerator;
  private diversityEngine: DirectionDiversityEngine;
  private scoringEngine: DirectionScoringEngine;
  private explainer: DirectionDifferenceExplainer;
  private switchingEngine: DirectionSwitchingEngine;
  private repository: FirestoreDirectionRepository;
  private overrideService: UserOverrideService;

  private activeExplorationPool: Map<string, StrategicDirectionCandidate[]> = new Map();

  constructor(
    generator?: DirectionCandidateGenerator,
    diversityEngine?: DirectionDiversityEngine,
    scoringEngine?: DirectionScoringEngine,
    explainer?: DirectionDifferenceExplainer,
    switchingEngine?: DirectionSwitchingEngine,
    repository?: FirestoreDirectionRepository,
    overrideService?: UserOverrideService
  ) {
    this.generator = generator || new DirectionCandidateGenerator();
    this.diversityEngine = diversityEngine || new DirectionDiversityEngine();
    this.scoringEngine = scoringEngine || new DirectionScoringEngine();
    this.explainer = explainer || new DirectionDifferenceExplainer();
    this.switchingEngine = switchingEngine || new DirectionSwitchingEngine();
    this.repository = repository || new FirestoreDirectionRepository();
    this.overrideService = overrideService || new UserOverrideService();
  }

  /**
   * Explores strategically distinct alternative directions for a campaign.
   */
  public async exploreDirections(
    request: StrategicExploreDirectionRequest
  ): Promise<ExploreDirectionsResult> {
    // Fetch active direction or generate initial
    let activeDirection = await this.repository.getActiveDirectionBySessionId(request.sessionId);
    if (!activeDirection) {
      const initialPool = this.generator.generateCandidatePool({
        sessionId: request.sessionId,
        campaignId: request.campaignId,
        tenantId: request.tenantId,
      });
      activeDirection = initialPool[0];
      await this.repository.saveActiveDirection(request.sessionId, activeDirection);
    }

    // Security & Multi-Tenant check
    if (activeDirection.tenantId && activeDirection.tenantId !== request.tenantId) {
      throw new Error(
        `Tenant Security Exception: Tenant '${request.tenantId}' cannot access session '${request.sessionId}'`
      );
    }

    // 1. Generate Candidate Pool (8-12 candidates)
    const rawCandidates = this.generator.generateCandidatePool({
      sessionId: request.sessionId,
      campaignId: request.campaignId,
      tenantId: request.tenantId,
      currentDirectionName: activeDirection.name,
    });

    // 2. Score candidates & enforce viability threshold (MIN_VIABILITY_THRESHOLD = 70)
    const scoredCandidates = this.scoringEngine.evaluateAndScoreCandidates(rawCandidates);

    // 3. Apply Diversity Engine to extract non-duplicate diverse directions
    const count = request.count || 3;
    const diverseAlternatives = this.diversityEngine.filterDiverseCandidates(
      activeDirection,
      scoredCandidates,
      count
    );

    // 4. Annotate with strategic difference explanations & tradeoffs
    const annotatedAlternatives = this.explainer.annotateDirectionsWithExplanations(
      activeDirection,
      diverseAlternatives
    );

    // Store in active pool for selection lookup
    this.activeExplorationPool.set(request.sessionId, [activeDirection, ...annotatedAlternatives]);

    // Build side-by-side comparison matrix
    const comparison = this.scoringEngine.buildComparisons([activeDirection, ...annotatedAlternatives]);

    return {
      currentDirection: activeDirection,
      alternatives: annotatedAlternatives,
      comparison,
      explorationSummary: `Found ${annotatedAlternatives.length} strategically distinct alternative directions for '${activeDirection.name}'.`,
      confidence: activeDirection.confidence,
    };
  }

  /**
   * Selects an alternative direction, executing a strategic direction switch.
   */
  public async selectDirection(
    sessionId: string,
    tenantId: string,
    directionId: string
  ): Promise<DirectionSelectionResult> {
    const activeDirection = await this.repository.getActiveDirectionBySessionId(sessionId);
    if (!activeDirection) {
      throw new Error(`No active direction found for session ID '${sessionId}'`);
    }

    if (activeDirection.tenantId && activeDirection.tenantId !== tenantId) {
      throw new Error(
        `Tenant Security Exception: Tenant '${tenantId}' cannot access session '${sessionId}'`
      );
    }

    const pool = this.activeExplorationPool.get(sessionId) || [activeDirection];
    const selectedCandidate = pool.find((d) => d.id === directionId);

    if (!selectedCandidate) {
      throw new Error(`Direction ID '${directionId}' not found in active exploration pool for session '${sessionId}'`);
    }

    // Execute switch
    const switchResult = this.switchingEngine.executeDirectionSwitch(
      activeDirection,
      selectedCandidate,
      pool
    );

    // Save newly active direction
    await this.repository.saveActiveDirection(sessionId, switchResult.selectedDirection);

    // Record User Override Signal for Phase 10.30 & Phase 10.27
    await this.overrideService.recordOverride({
      id: `ovr_dir_${directionId}_${Date.now()}`,
      decisionId: activeDirection.id,
      originalSelection: activeDirection.name,
      userSelection: selectedCandidate.name,
      reason: selectedCandidate.whyItFits,
      tenantId,
      createdAt: new Date().toISOString(),
    });

    return switchResult;
  }

  /**
   * Compares multiple directions side-by-side.
   */
  public async compareDirections(
    sessionId: string,
    tenantId: string,
    directionIds?: string[]
  ): Promise<DirectionComparison[]> {
    const pool = this.activeExplorationPool.get(sessionId) || [];
    const targetPool = directionIds && directionIds.length > 0
      ? pool.filter((d) => directionIds.includes(d.id))
      : pool;

    return this.scoringEngine.buildComparisons(targetPool);
  }

  /**
   * Retrieves full direction history for a session.
   */
  public async getDirectionHistory(
    sessionId: string,
    tenantId: string
  ): Promise<StrategicDirectionCandidate[]> {
    const history = await this.repository.getDirectionHistory(sessionId);
    if (history.length > 0 && history[0].tenantId && history[0].tenantId !== tenantId) {
      throw new Error(`Tenant Security Exception: Tenant '${tenantId}' cannot access history for '${sessionId}'`);
    }
    return history;
  }

  /**
   * Creates an A/B experiment between two or more strategic directions.
   */
  public async createDirectionExperiment(
    sessionId: string,
    tenantId: string,
    directionIds: string[]
  ): Promise<{ experimentId: string; status: string; directionCount: number }> {
    const pool = this.activeExplorationPool.get(sessionId) || [];
    const validDirections = pool.filter((d) => directionIds.includes(d.id));

    if (validDirections.length < 2) {
      throw new Error("A/B Direction Experiment requires at least 2 valid directions");
    }

    return {
      experimentId: `exp_dir_${sessionId}_${Date.now()}`,
      status: "CREATED",
      directionCount: validDirections.length,
    };
  }
}

import type {
  CreativeIntelligenceContext,
  CreativeLearning,
  LearningContextWarning,
  FailureLearning,
  RankedMechanism,
} from "../../types/learningLoop";
import type { ConfidenceLevel } from "../../types/enums";
import type { Score } from "../../types/primitives";

export interface RetrievalQuery {
  industry?: string;
  objective?: string;
  platform?: string;
  tenantId?: string;
}

/**
 * Creative Learning Retrieval Service.
 * Ranks and retrieves validated creative learnings for Creative Brain context.
 * 
 * CRITICAL INVARIANT: Learnings INFLUENCE concept generation, but DO NOT become rigid rules.
 * Creative Intelligence remains adaptive to current intent and strategic context.
 */
export class CreativeLearningService {
  /**
   * Ranks learnings by priority score: relevance * confidence * recency * evidenceStrength.
   */
  calculatePriorityScore(learning: CreativeLearning, query: RetrievalQuery): Score {
    let relevance = 0.5;

    if (query.industry && (learning.context.industry as unknown as string) === query.industry) relevance += 0.2;
    if (query.objective && (learning.context.objective as unknown as string) === query.objective) relevance += 0.2;
    if (query.platform && (learning.context.platform as unknown as string) === query.platform) relevance += 0.1;

    const strengthMult =
      learning.evidenceStrength === "VERY_STRONG"
        ? 1.0
        : learning.evidenceStrength === "STRONG"
        ? 0.85
        : learning.evidenceStrength === "MODERATE"
        ? 0.7
        : 0.5;

    const recencyMult = learning.recencyScore || 0.9;

    const priority = relevance * learning.confidenceScore * strengthMult * recencyMult;
    return Number(Math.min(1.0, Math.max(0.0, priority)).toFixed(4));
  }

  /**
   * Builds full CreativeIntelligenceContext for Creative Brain consumption.
   */
  getCreativeIntelligenceContext(
    learnings: CreativeLearning[],
    failures: FailureLearning[],
    query: RetrievalQuery
  ): CreativeIntelligenceContext {
    const relevant = learnings.filter((l) => {
      if (l.status !== "VALIDATED" && l.status !== "EMERGING") return false;
      if (query.industry && l.context.industry && (l.context.industry as unknown as string) !== query.industry) return false;
      return true;
    });


    // Sort by priority score
    relevant.sort((a, b) => this.calculatePriorityScore(b, query) - this.calculatePriorityScore(a, query));

    const strongMechanisms: RankedMechanism[] = [];
    const weakMechanisms: RankedMechanism[] = [];
    const emergingMechanisms: RankedMechanism[] = [];

    for (const l of relevant) {
      const confLevel: ConfidenceLevel =
        l.confidenceScore > 0.8 ? "HIGH" : l.confidenceScore > 0.5 ? "MEDIUM" : "LOW";

      const ranked: RankedMechanism = {
        mechanismId: l.mechanismId,
        score: this.calculatePriorityScore(l, query),
        confidence: confLevel,
        evidenceCount: l.sampleSize,
        relativeLift: l.relativeLift || 0,
        reason: l.observation,
      };

      if (l.status === "VALIDATED" && (l.relativeLift || 0) >= 0.1) {
        strongMechanisms.push(ranked);
      } else if (l.status === "EMERGING") {
        emergingMechanisms.push(ranked);
      }
    }

    // Process failures into contextual warnings
    const contextualWarnings: LearningContextWarning[] = failures.map((f) => ({
      warningId: `warn_${f.failureId}`,
      mechanismId: f.mechanismId,
      severity: "HIGH",
      message: `Avoid mechanism [${f.mechanismId}] in ${f.avoidContext.industry || "this"} context: ${
        f.observedNegativeOutcome
      }`,
      context: String(f.avoidContext.industry || ""),
    }));

    return {
      relevantLearnings: relevant.slice(0, 10),
      strongMechanisms,
      weakMechanisms,
      emergingMechanisms,
      contextualWarnings,
    };
  }
}

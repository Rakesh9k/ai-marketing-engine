import type {
  DecisionTrace,
  CreativeReasoningGraph,
  ReasoningEdge,
  DecisionType,
} from "../../types/explainability";

const DECISION_HIERARCHY: DecisionType[] = [
  "AUDIENCE",
  "OBJECTIVE",
  "OPPORTUNITY",
  "PSYCHOLOGY",
  "MECHANISM",
  "CONCEPT",
  "HOOK",
  "STORY",
  "VISUAL",
  "COPY",
  "OFFER",
  "CTA",
  "RECIPE",
  "STYLE",
  "FORMAT",
  "PLATFORM",
];

export class ReasoningGraphService {
  /**
   * Constructs a Directed Acyclic Graph (DAG) representing the causal chain of decisions.
   */
  public buildReasoningGraph(trace: DecisionTrace): CreativeReasoningGraph {
    const nodes = trace.decisions;
    const edges: ReasoningEdge[] = [];

    const sortedDecisions = [...nodes].sort((a, b) => {
      const idxA = DECISION_HIERARCHY.indexOf(a.decisionType);
      const idxB = DECISION_HIERARCHY.indexOf(b.decisionType);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });

    for (let i = 0; i < sortedDecisions.length - 1; i++) {
      const source = sortedDecisions[i];
      const target = sortedDecisions[i + 1];

      const relationship = this.determineRelationship(source.decisionType, target.decisionType);

      edges.push({
        fromDecisionId: source.id,
        toDecisionId: target.id,
        relationship,
        explanation: `Decision '${source.selectedName}' (${source.decisionType}) ${relationship.toLowerCase()} '${target.selectedName}' (${target.decisionType})`,
      });
    }

    for (const target of sortedDecisions) {
      for (const constraint of target.constraints) {
        const source = sortedDecisions.find((d) => d.decisionType === constraint.type);
        if (source && source.id !== target.id) {
          edges.push({
            fromDecisionId: source.id,
            toDecisionId: target.id,
            relationship: "CONSTRAINED",
            explanation: `Constraint '${constraint.type}' (${constraint.description}) imposed on ${target.decisionType}`,
          });
        }
      }
    }

    return {
      sessionId: trace.sessionId,
      nodes,
      edges,
      rootDecisionId: sortedDecisions.length > 0 ? sortedDecisions[0].id : "",
    };
  }

  private determineRelationship(fromType: DecisionType, _toType: DecisionType): ReasoningEdge["relationship"] {
    if (fromType === "AUDIENCE" || fromType === "OPPORTUNITY") {
      return "CAUSED";
    }
    if (fromType === "PSYCHOLOGY" || fromType === "MECHANISM") {
      return "ENABLED";
    }
    if (fromType === "CONCEPT" || fromType === "HOOK") {
      return "SUPPORTED";
    }
    if (fromType === "FORMAT" || fromType === "PLATFORM") {
      return "CONSTRAINED";
    }
    return "DERIVED_FROM";
  }
}

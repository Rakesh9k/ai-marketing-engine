import type {
  DecisionTrace,
  CreativeDecision,
  CreativeExplanation,
  ExplanationDepth,
  DecisionSensitivity,
} from "../../types/explainability";
import { ReasoningGraphService } from "../reasoning/reasoningGraphService";

export class ExplanationService {
  private reasoningGraphService: ReasoningGraphService;

  constructor(reasoningGraphService?: ReasoningGraphService) {
    this.reasoningGraphService = reasoningGraphService || new ReasoningGraphService();
  }

  /**
   * Generates a structured explanation for a specific decision or full trace.
   */
  public generateExplanation(
    trace: DecisionTrace,
    decisionId?: string,
    depth: ExplanationDepth = "STRATEGIC"
  ): CreativeExplanation {
    const targetDecision = decisionId
      ? trace.decisions.find((d) => d.id === decisionId)
      : trace.decisions[0];

    if (!targetDecision) {
      throw new Error(`Decision with ID '${decisionId}' not found in trace '${trace.sessionId}'`);
    }

    const whyNotAlternatives = targetDecision.alternatives.map((alt) => ({
      option: alt.name,
      whyNot:
        alt.rejectionReasons[0] ||
        `Scored lower (${alt.score ?? 0}) compared to selected '${targetDecision.selectedName}'`,
    }));

    const whatWouldChangeThis = this.computeSensitivity(targetDecision);
    const summary = this.assembleSummary(targetDecision, depth);
    const why = targetDecision.reasoning.primaryReason;

    const evidenceBreakdown = targetDecision.evidence.map((e) => ({
      scope: e.scope,
      claim: e.claim,
    }));

    const sourceReferences = targetDecision.inputs
      .filter((i) => i.sourceId)
      .map((i) => ({ type: i.type, id: String(i.sourceId) }));

    return {
      decisionId: targetDecision.id,
      decisionType: targetDecision.decisionType,
      depth,
      summary,
      why,
      whyPsychology: this.findReasoningForType(trace, "PSYCHOLOGY"),
      whyMechanism: this.findReasoningForType(trace, "MECHANISM"),
      whyHook: this.findReasoningForType(trace, "HOOK"),
      whyVisual: this.findReasoningForType(trace, "VISUAL"),
      whyCopy: this.findReasoningForType(trace, "COPY"),
      whyOffer: this.findReasoningForType(trace, "OFFER"),
      whyCta: this.findReasoningForType(trace, "CTA"),
      whyNotAlternatives,
      whatWouldChangeThis,
      evidenceBreakdown,
      confidence: targetDecision.confidence,
      sourceReferences,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a holistic strategy explanation for the entire decision trace.
   */
  public generateCampaignExplanation(
    trace: DecisionTrace,
    depth: ExplanationDepth = "STRATEGIC"
  ): CreativeExplanation {
    const rootDecision = trace.decisions[0];

    const allEvidence = trace.decisions.flatMap((d) => d.evidence);
    const evidenceBreakdown = allEvidence.map((e) => ({
      scope: e.scope,
      claim: e.claim,
    }));

    const chainSummary = trace.decisions
      .map((d) => `${d.decisionType}: ${d.selectedName}`)
      .join(" -> ");

    const summary =
      depth === "SIMPLE"
        ? `Selected creative direction for campaign based on ${trace.decisions.length} strategic decisions.`
        : depth === "STRATEGIC"
        ? `Strategic campaign framework selected: ${chainSummary}.`
        : `Full campaign reasoning graph compiled with ${trace.decisions.length} decisions across overall context snapshot.`;

    const why = trace.decisions.map((d) => `[${d.decisionType}] ${d.selectedName}: ${d.reasoning.primaryReason}`).join("; ");

    const avgScore =
      trace.decisions.length > 0
        ? trace.decisions.reduce((sum, d) => sum + d.confidence.score, 0) / trace.decisions.length
        : 0.8;

    return {
      decisionId: rootDecision ? rootDecision.id : "root",
      decisionType: rootDecision ? rootDecision.decisionType : "CONCEPT",
      depth,
      summary,
      why,
      whyNotAlternatives: trace.decisions.flatMap((d) =>
        d.alternatives.map((alt) => ({
          option: `${d.decisionType} - ${alt.name}`,
          whyNot: alt.rejectionReasons[0] || `Lower relative fit for ${d.decisionType}`,
        }))
      ),
      whatWouldChangeThis: rootDecision ? this.computeSensitivity(rootDecision) : [],
      evidenceBreakdown,
      confidence: rootDecision
        ? rootDecision.confidence
        : { score: avgScore, level: "HIGH", basis: ["Full strategy chain"], evidenceCount: allEvidence.length, evidenceQuality: 0.85 },
      sourceReferences: trace.decisions.flatMap((d) =>
        d.inputs.filter((i) => i.sourceId).map((i) => ({ type: i.type, id: String(i.sourceId) }))
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  private findReasoningForType(trace: DecisionTrace, type: CreativeDecision["decisionType"]): string | undefined {
    const dec = trace.decisions.find((d) => d.decisionType === type);
    return dec ? `${dec.selectedName}: ${dec.reasoning.primaryReason}` : undefined;
  }

  private assembleSummary(decision: CreativeDecision, depth: ExplanationDepth): string {
    if (depth === "SIMPLE") {
      return `We chose '${decision.selectedName}' because it best matches your business goal and target audience needs.`;
    }
    if (depth === "STRATEGIC") {
      return `Selected '${decision.selectedName}' (${decision.decisionType}) to address audience tension using strategic reasoning: ${decision.reasoning.primaryReason}`;
    }
    return `Decision '${decision.selectedName}' (${decision.decisionType}) achieved confidence score ${decision.confidence.score.toFixed(2)} (${decision.confidence.level} level).`;
  }

  private computeSensitivity(decision: CreativeDecision): DecisionSensitivity[] {
    return decision.inputs.slice(0, 3).map((input) => ({
      factor: input.type,
      currentValue: input.value,
      alternativeValue: "Alternative Value",
      expectedImpact: `Changing input '${input.type}' would alter the selected '${decision.decisionType}' decision.`,
      wouldChangeDecision: input.importance > 0.7,
    }));
  }
}

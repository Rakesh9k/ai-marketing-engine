import type {
  CreativeMemory,
  CreativeMemoryExplanation,
  CreativeMemoryScore,
} from "../../types/memory";

/**
 * Generates structured, human-readable explanations for Creative Memory retrieval and ranking signals.
 */
export function explainCreativeMemory(
  memory: CreativeMemory,
  _score?: CreativeMemoryScore
): CreativeMemoryExplanation {
  const limitations: string[] = [];

  if (memory.performanceEvidence.length < 3) {
    limitations.push("Small evidence sample size (< 3 historical campaign observations)");
  }

  if (memory.generalization.overall < 0.4) {
    limitations.push("Low generalization score across different industries or platforms");
  }

  if (memory.confidence === "LOW") {
    limitations.push("Low confidence evidence classification");
  }

  const conclusion = `Creative memory indicates ${memory.observation}`;

  let recommendation: string | undefined;
  if (memory.status === "ACTIVE" && memory.confidence === "HIGH") {
    recommendation = `Recommended for high-priority creative direction in matching ${memory.context.industry || "target"} context.`;
  } else if (memory.status === "INVALIDATED") {
    recommendation = "Not recommended due to historically negative relative lift.";
  } else {
    recommendation = "Consider testing with small campaign budget budget allocation.";
  }

  return {
    memoryId: memory.memoryId,
    conclusion,
    supportingEvidence: memory.performanceEvidence,
    context: memory.context,
    confidence: memory.confidence,
    limitations,
    recommendation,
  };
}

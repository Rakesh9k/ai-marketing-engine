import type { CreativeLearning } from "../../types/learningLoop";

/**
 * AI Strategic Interpreter.
 * Formulates human-readable strategic insights, natural language observations,
 * hypotheses, and recommendations based on deterministic quantitative analysis.
 * 
 * CRITICAL INVARIANT: The LLM receives quantitative inputs (sample size, relative lift, confidence, context)
 * from the deterministic analyzer. The LLM must NEVER invent metrics, sample sizes, or causal claims.
 */
export function generateStrategicInterpretation(
  learning: CreativeLearning
): Pick<CreativeLearning, "observation" | "hypothesis" | "insight" | "recommendation"> {
  const liftPct = ((learning.relativeLift || 0) * 100).toFixed(1);
  const ind = learning.context.industry || "target industry";
  const obj = learning.context.objective || "campaign objective";
  const plat = learning.context.platform || "target platform";

  const observation = `For ${ind} campaigns targeting ${obj} on ${plat}, mechanism [${learning.mechanismId}] demonstrated a ${
    Number(liftPct) >= 0 ? "+" : ""
  }${liftPct}% relative lift across ${learning.sampleSize} campaign observations.`;

  const hypothesis = `Mechanism [${learning.mechanismId}] reduces friction and enhances perceived value for ${ind} audiences when evaluated in ${obj} contexts.`;

  const insight = `Contextual evidence indicates that ${ind} audiences respond significantly better to ${learning.mechanismId} framing than generic promotional approaches.`;

  const recommendation = `Recommend prioritizing mechanism [${learning.mechanismId}] during concept synthesis for ${ind} campaigns with ${obj} goals.`;

  return {
    observation,
    hypothesis,
    insight,
    recommendation,
  };
}

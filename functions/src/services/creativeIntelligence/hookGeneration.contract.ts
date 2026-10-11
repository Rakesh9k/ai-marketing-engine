// Hook generation contract – Phase 10.6

/**
 * Input shape for the downstream Gemini hook wording generation.
 * All upstream entities are already resolved to concrete ids/objects.
 */
export interface HookGenerationInput {
  /** Business brain context (high‑level campaign metadata). */
  businessContext: Record<string, unknown>;
  /** Audience situation selected for the campaign. */
  audienceSituation: Record<string, unknown>;
  /** Insight pattern that drives the communication. */
  insightPattern: Record<string, unknown>;
  /** Marketing objective (awareness, lead‑gen, etc.). */
  marketingObjective: Record<string, unknown>;
  /** Psychology(s) that justify the hook. */
  psychology: Record<string, unknown>[];
  /** Creative mechanism(s) that will be employed. */
  creativeMechanism: Record<string, unknown>;
  /** Hook pattern (grammar) to use. */
  hookPattern: Record<string, unknown>;
  /** Resolved variables for the pattern (name -> value). */
  variables: Record<string, unknown>;
  /** Brand voice guidelines. */
  brandVoice: Record<string, unknown>;
  /** Offer / product information. */
  offer: Record<string, unknown>;
  /** Proof / evidence items that can be referenced. */
  proof?: Record<string, unknown>;
  /** Target platform (e.g., Instagram Reel). */
  platform?: string;
  /** Output format (e.g., short‑form, carousel). */
  format?: string;
  /** Ethical constraints inherited from the Hook Pattern. */
  ethicalConstraints?: string[];
}

/**
 * Output shape returned by Gemini after generating one or more hook candidates.
 */
export interface HookGenerationOutput {
  /** Array of generated hook candidates. */
  hooks: Array<{
    /** The final hook copy. */
    text: string;
    /** Reference to the pattern id used. */
    patternId: string;
    /** Resolved variable values that produced this text. */
    variableValues: Record<string, unknown>;
    /** Reasoning string explaining why this variant was chosen. */
    reasoning: string;
    /** Sources (ids) that back any factual claim inside the hook. */
    truthSources: string[];
    /** Confidence level for the factual claims. */
    confidence: 'unknown' | 'hypothesis' | 'weak_evidence' | 'moderate_evidence' | 'strong_evidence' | 'validated';
    /** Flags for any detected risk (e.g., clickbait, false urgency). */
    riskFlags: string[];
  }>;
}

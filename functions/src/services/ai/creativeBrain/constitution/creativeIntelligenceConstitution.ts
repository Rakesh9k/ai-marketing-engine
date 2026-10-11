/**
 * PHASE 10A — Creative Intelligence Constitution
 * Non-negotiable principles governing Mitra's Creative Intelligence System (10A–10O).
 */

export interface ConstitutionalRule {
  id: number;
  name: string;
  statement: string;
  rationale: string;
}

export const CREATIVE_INTELLIGENCE_CONSTITUTION: ConstitutionalRule[] = [
  {
    id: 1,
    name: "Strategy Before Expression",
    statement: "Strategic direction (Psychology, Mechanism, Recipe) must be determined before copy, visual, or layout expression is generated.",
    rationale: "Prevents superficial generation without underlying behavioral strategy.",
  },
  {
    id: 2,
    name: "Context Before Selection",
    statement: "Full decision context (Business, Campaign, Audience, Situation, Local, Cultural, Diversity, Fatigue) must be assembled before mechanism selection.",
    rationale: "Ensures mechanism retrieval is grounded in exact situational reality.",
  },
  {
    id: 3,
    name: "Mechanism Before Template",
    statement: "Creative reasoning uses composable strategic mechanisms and recipes, never static ad templates or fill-in-the-blank layouts.",
    rationale: "Protects creative flexibility and avoids repetitive template fatigue.",
  },
  {
    id: 4,
    name: "Business Brain Remains Authoritative",
    statement: "Business Brain identity, positioning, brand voice, pricing, and facts strictly govern all creative decisions and cannot be overridden by Creative Bank defaults.",
    rationale: "Guarantees brand alignment and prevents tenant identity drift.",
  },
  {
    id: 5,
    name: "Truth Beats Persuasion",
    statement: "Persuasive mechanisms (scarcity, urgency, social proof) are strictly prohibited unless supported by verified evidence in Business Brain.",
    rationale: "Eliminates deceptive marketing, fake countdowns, and invented testimonials.",
  },
  {
    id: 6,
    name: "Evidence Beats Assumption",
    statement: "Empirical performance evidence and verified facts take precedence over speculative assumptions or unvalidated heuristics.",
    rationale: "Ensures Mitra's knowledge evolves through real-world commercial results.",
  },
  {
    id: 7,
    name: "Diversity Is Not Randomness",
    statement: "Creative diversity explores structured alternative strategic mechanisms, never arbitrary or random variations.",
    rationale: "Prevents creative fatigue while maintaining strategic relevance.",
  },
  {
    id: 8,
    name: "Repetition Is Not Automatically Fatigue",
    statement: "Repeated use of a successful mechanism is flagged as fatigue only when audience response or performance trends show declining engagement.",
    rationale: "Allows proven mechanisms to continue running while detecting real saturation.",
  },
  {
    id: 9,
    name: "Local Relevance Without Forced Localization",
    statement: "Local relevance emerges because the strategy addresses authentic local behavior, not because superficial landmarks or regional slang are inserted.",
    rationale: "Avoids patronizing stereotyping and superficial localization.",
  },
  {
    id: 10,
    name: "Performance Does Not Automatically Validate",
    statement: "High short-term metrics without truth, brand, and quality compliance do not validate or promote a mechanism in the Creative Bank.",
    rationale: "Protects long-term brand equity from toxic short-term growth hacks.",
  },
  {
    id: 11,
    name: "AI-Generated Knowledge Starts Untrusted",
    statement: "Newly created or generated knowledge items start in DRAFT maturity until verified through evidence and governance review.",
    rationale: "Prevents unverified AI hallucinations from polluting the Creative Bank.",
  },
  {
    id: 12,
    name: "Every Strategic Decision Must Be Explainable",
    statement: "All strategy selections must provide a transparent decision trace and grounded explanation ('whyThisStrategy').",
    rationale: "Ensures complete explainability for business owners and auditors.",
  },
  {
    id: 13,
    name: "Every Production Creative Must Be Traceable",
    statement: "Finished creatives must carry immutable fingerprints tracing back to their underlying strategy, recipe, mechanism, psychology, and context.",
    rationale: "Enables precise performance attribution and contextual learning.",
  },
  {
    id: 14,
    name: "Learning Must Be Contextual",
    statement: "Performance insights are stored with multi-dimensional context (industry, audience, situation, platform), never as blanket global generalizations.",
    rationale: "Recognizes that what works for one situation may fail in another.",
  },
  {
    id: 15,
    name: "Tenant Intelligence Must Never Leak",
    statement: "Cross-tenant data isolation is strictly enforced; proprietary business facts and private tenant insights never leak across tenant boundaries.",
    rationale: "Guarantees enterprise data security and tenant confidentiality.",
  },
];

export class CreativeIntelligenceConstitutionAuditor {
  /**
   * Audits a strategy or action against the 15 Constitutional Principles.
   */
  public auditDecision(decision: {
    hasStrategy: boolean;
    hasContext: boolean;
    isTemplateBased: boolean;
    overridesBusinessBrain: boolean;
    hasUnsupportedScarcity: boolean;
    hasUnsupportedSocialProof: boolean;
    hasExplanation: boolean;
    hasFingerprint: boolean;
  }): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (!decision.hasStrategy) violations.push("Rule 1 Violation: Expression generated without strategic direction.");
    if (!decision.hasContext) violations.push("Rule 2 Violation: Selection attempted without context assembly.");
    if (decision.isTemplateBased) violations.push("Rule 3 Violation: Static ad template used instead of composable mechanism.");
    if (decision.overridesBusinessBrain) violations.push("Rule 4 Violation: Strategy attempted to override Business Brain authority.");
    if (decision.hasUnsupportedScarcity) violations.push("Rule 5 Violation: Unsupported scarcity claim without stated expiry or inventory proof.");
    if (decision.hasUnsupportedSocialProof) violations.push("Rule 5 Violation: Unsupported social proof claim without verified testimonials or review count.");
    if (!decision.hasExplanation) violations.push("Rule 12 Violation: Decision missing transparent explanation and decision trace.");
    if (!decision.hasFingerprint) violations.push("Rule 13 Violation: Production artifact missing immutable strategy fingerprint.");

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}

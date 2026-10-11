import type { ID, ISODateTime } from "./primitives";

/**
 * Phase 10.30 — Decision Types across Creative Decision Chain
 */
export type DecisionType =
  | "OPPORTUNITY"
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "CONCEPT"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "OFFER"
  | "CTA"
  | "FORMAT"
  | "PLATFORM"
  | "STYLE"
  | "RECIPE"
  | "AUDIENCE"
  | "OBJECTIVE";

/**
 * Decision Input Types
 */
export type DecisionInputType =
  | "BUSINESS_BRAIN"
  | "CAMPAIGN_INTENT"
  | "AUDIENCE"
  | "OBJECTIVE"
  | "OFFER"
  | "PRODUCT"
  | "INDUSTRY"
  | "CUSTOMER_TENSION"
  | "DIFFERENTIATOR"
  | "PROOF"
  | "PLATFORM"
  | "FORMAT"
  | "PERFORMANCE"
  | "CREATIVE_BANK"
  | "USER_INPUT";

/**
 * Decision Evidence Types
 */
export type DecisionEvidenceType =
  | "BUSINESS_FACT"
  | "CREATIVE_BANK"
  | "PERFORMANCE"
  | "INDUSTRY_KNOWLEDGE"
  | "COMPATIBILITY"
  | "USER_PROVIDED"
  | "SYSTEM_RULE";

/**
 * Evidence Scope Hierarchy for Trust
 */
export type EvidenceScope =
  | "KNOWN"       // Verified Business Brain fact
  | "LEARNED"     // Observed performance evidence from Phase 10.27
  | "INFERRED"    // Creative Intelligence strategic reasoning
  | "HYPOTHESIS";  // Testable strategic idea

/**
 * Explanation Depth Levels
 */
export type ExplanationDepth =
  | "SIMPLE"       // User level: 1-sentence strategic rationale
  | "STRATEGIC"    // Campaign level: Strategic rationale + signal + move
  | "INTELLIGENCE";// Admin/Studio level: Full ontology trace + scores + rejections

/**
 * Alternative considered during decision making
 */
export interface DecisionAlternative {
  id: ID;
  itemId?: ID;
  name: string;
  score?: number;
  strengths: string[];
  weaknesses: string[];
  rejectionReasons: string[];
  selected: boolean;
}

/**
 * Signal Input that influenced decision
 */
export interface DecisionInput {
  type: DecisionInputType;
  sourceId?: ID;
  field?: string;
  value: unknown;
  importance: number; // 0 to 1
}

/**
 * Evidence supporting decision
 */
export interface DecisionEvidence {
  type: DecisionEvidenceType;
  scope: EvidenceScope;
  sourceId?: ID;
  claim: string;
  strength: "WEAK" | "MODERATE" | "STRONG";
  confidence: number;
}

/**
 * Constraint that restricted decision
 */
export interface DecisionConstraint {
  type: "BRAND" | "TRUTH" | "PLATFORM" | "BUDGET" | "BUSINESS_RULE";
  description: string;
  isMandatory: boolean;
}

/**
 * Compatibility score with other items
 */
export interface DecisionCompatibility {
  targetItemId: ID;
  compatibilityScore: number;
  level: string;
}

/**
 * Explanation Confidence Container
 */
export interface ExplanationConfidence {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  basis: string[];
  evidenceCount: number;
  evidenceQuality: number;
}

/**
 * Master Decision Record captured at decision time
 */
export interface CreativeDecision {
  id: ID;
  sessionId: ID;
  campaignId?: ID;
  tenantId?: ID;
  decisionType: DecisionType;
  selectedItemId?: ID;
  selectedValue?: unknown;
  selectedName: string;
  alternatives: DecisionAlternative[];
  inputs: DecisionInput[];
  evidence: DecisionEvidence[];
  constraints: DecisionConstraint[];
  compatibility: DecisionCompatibility[];
  reasoning: {
    primaryReason: string;
    supportingReasons: string[];
    tradeoffs: string[];
    rejectionReasons: string[];
  };
  confidence: ExplanationConfidence;
  createdAt: ISODateTime;
}

/**
 * Persistent Decision Trace for a session or campaign
 */
export interface DecisionTrace {
  id: ID;
  sessionId: ID;
  campaignId?: ID;
  tenantId?: ID;
  contextSnapshot: {
    businessBrainVersion?: string;
    campaignIntentVersion?: string;
    creativeOpportunityVersion?: string;
  };
  decisions: CreativeDecision[];
  createdAt: ISODateTime;
  version: number;
}

/**
 * Decision Sensitivity ("What Would Change This?")
 */
export interface DecisionSensitivity {
  factor: string;
  currentValue: unknown;
  alternativeValue: unknown;
  expectedImpact: string;
  wouldChangeDecision: boolean;
}

/**
 * Assembled Human-Readable Creative Explanation
 */
export interface CreativeExplanation {
  decisionId: ID;
  decisionType: DecisionType;
  depth: ExplanationDepth;
  summary: string;
  why: string;
  whyPsychology?: string;
  whyMechanism?: string;
  whyHook?: string;
  whyVisual?: string;
  whyCopy?: string;
  whyOffer?: string;
  whyCta?: string;
  whyNotAlternatives?: Array<{ option: string; whyNot: string }>;
  whatWouldChangeThis?: DecisionSensitivity[];
  evidenceBreakdown: Array<{ scope: EvidenceScope; claim: string }>;
  confidence: ExplanationConfidence;
  sourceReferences: Array<{ type: string; id: ID }>;
  generatedAt: ISODateTime;
}

/**
 * Directed Edge in Creative Reasoning Graph
 */
export interface ReasoningEdge {
  fromDecisionId: ID;
  toDecisionId: ID;
  relationship: "CAUSED" | "SUPPORTED" | "CONSTRAINED" | "ENABLED" | "REJECTED" | "DERIVED_FROM";
  explanation: string;
}

/**
 * Full Creative Reasoning Graph
 */
export interface CreativeReasoningGraph {
  sessionId: ID;
  nodes: CreativeDecision[];
  edges: ReasoningEdge[];
  rootDecisionId: ID;
}

/**
 * User Override Record
 */
export interface UserOverrideRecord {
  id: ID;
  decisionId: ID;
  originalSelection: string;
  userSelection: string;
  reason?: string;
  tenantId?: ID;
  createdAt: ISODateTime;
}

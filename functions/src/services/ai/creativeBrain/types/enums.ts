// Canonical enums for Creative Brain contracts

export type IntelligenceStatus =
  | "DRAFT"
  | "ACTIVE"
  | "DEPRECATED"
  | "INVALIDATED";

export type CreativeDirectionStatus =
  | "DRAFT"
  | "PROPOSED"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type RecipeStatus =
  | "DRAFT"
  | "HYPOTHESIS"
  | "TESTING"
  | "EVIDENCE_BACKED"
  | "VALIDATED"
  | "DEPRECATED"
  | "INVALIDATED";

export type AwarenessStage =
  | "UNKNOWN"
  | "UNAWARE"
  | "PROBLEM_AWARE"
  | "SOLUTION_AWARE"
  | "PRODUCT_AWARE"
  | "MOST_AWARE";

export type PurchaseIntentLevel =
  | "UNKNOWN"
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export type MarketingObjective =
  | "AWARENESS"
  | "CONSIDERATION"
  | "CONVERSION"
  | "RETENTION"
  | "REACTIVATION"
  | "LOYALTY"
  | "LOCAL_DISCOVERY"
  | "ENGAGEMENT";

export type ConfidenceLevel =
  | "UNKNOWN"
  | "HYPOTHESIS"
  | "WEAK_EVIDENCE"
  | "MODERATE_EVIDENCE"
  | "STRONG_EVIDENCE"
  | "VALIDATED"
  | "HIGH"
  | "MEDIUM"
  | "LOW";


export type EvidenceType =
  | "ACADEMIC_RESEARCH"
  | "BEHAVIORAL_RESEARCH"
  | "META_ANALYSIS"
  | "SYSTEMATIC_REVIEW"
  | "INDUSTRY_RESEARCH"
  | "HISTORICAL_MARKETING_EVIDENCE"
  | "EXPERT_FRAMEWORK"
  | "MITRA_EXPERIMENT"
  | "AB_TEST"
  | "CUSTOMER_FEEDBACK"
  | "CUSTOMER_RESEARCH"
  | "QUALITATIVE_OBSERVATION"
  | "BENCHMARK"
  | "AI_GENERATED_HYPOTHESIS";

export type CreativeCompositionStatus =
  | "INIT"
  | "VALIDATING_CONTEXT"
  | "INCOMPLETE"
  | "CLARIFICATION_REQUIRED"
  | "RETRIEVING"
  | "SCORING"
  | "COMPOSING"
  | "CONFLICT"
  | "VALIDATING_COMBINATION"
  | "EVALUATING_COHERENCE"
  | "ADAPTING"
  | "REVALIDATING"
  | "BLOCKED"
  | "SUCCESS"
  | "NO_VALID_DIRECTION"
  | "FAILED";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type NextAction =
  | "EXECUTE"
  | "USER_APPROVAL"
  | "ASK_USER"
  | "COMPLETE_CONTEXT"
  | "RETURN_TO_RETRIEVAL"
  | "WAIT"
  | "FIX_DEPENDENCY"
  | "USE_ALTERNATIVE"
  | "RETRY"
  | "ESCALATE"
  | "RETURN_ERROR";

export type RecoveryActionType =
  | "ASK_USER"
  | "ADD_INFORMATION"
  | "FIX_CONFIGURATION"
  | "SELECT_ALTERNATIVE"
  | "RETRY"
  | "RETURN_UPSTREAM"
  | "WAIT";

export type RecoverySeverity = "INFO" | "WARNING";

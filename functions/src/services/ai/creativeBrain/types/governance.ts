import type { ID, ISODateTime } from "./primitives";
import type { ConfidenceLevel } from "./enums";
import type { EvidenceRequirement } from "./evidence";
import type { BusinessContext } from "./business";
import type { CreativeDirection } from "./directions";
import type { CreativeCopyPlan } from "./assetPlan";
import type { CreativeAsset } from "./assetPlan";
import type { OfferContext } from "./offers";
import type { PlatformContext } from "./platforms";
import type { FormatContext } from "./platforms";
import type { CreativeConstraints } from "./context";
import type { TruthCheckResult } from "../../../../types";

export { EvidenceRequirement };

// ==========================================
// 1. CLAIM ONTOLOGY & PROVENANCE
// ==========================================

export enum ClaimType {
  BUSINESS_FACT = "BUSINESS_FACT",
  PRODUCT_CLAIM = "PRODUCT_CLAIM",
  SERVICE_CLAIM = "SERVICE_CLAIM",
  PRICE = "PRICE",
  DISCOUNT = "DISCOUNT",
  STATISTIC = "STATISTIC",
  SOCIAL_PROOF = "SOCIAL_PROOF",
  TESTIMONIAL = "TESTIMONIAL",
  RATING = "RATING",
  REVIEW = "REVIEW",
  SCARCITY = "SCARCITY",
  URGENCY = "URGENCY",
  COMPETITOR_CLAIM = "COMPETITOR_CLAIM",
  GUARANTEE = "GUARANTEE",
  BEFORE_AFTER = "BEFORE_AFTER",
  PERFORMANCE = "PERFORMANCE",
  CERTIFICATION = "CERTIFICATION",
  CREDENTIAL = "CREDENTIAL",
  AVAILABILITY = "AVAILABILITY",
  LOCATION = "LOCATION",
  COMPARATIVE = "COMPARATIVE",
  MEDICAL = "MEDICAL",
  FINANCIAL = "FINANCIAL",
  OTHER = "OTHER",
}

export type ClaimProvenanceSource =
  | "BUSINESS_BRAIN"
  | "VERIFIED_BUSINESS_DATA"
  | "USER_PROVIDED"
  | "CUSTOMER_PROOF"
  | "CAMPAIGN_INPUT"
  | "EXTERNAL_EVIDENCE"
  | "GENERATED_HYPOTHESIS";

export type VerificationStatus =
  | "VERIFIED"
  | "UNVERIFIED"
  | "REJECTED"
  | "NOT_APPLICABLE";


export interface CreativeClaim {
  id: ID;
  text: string;
  type: ClaimType;
  source: ClaimProvenanceSource;
  sourceReference?: string;
  verificationStatus: VerificationStatus;
  requiredEvidence?: EvidenceRequirement[];
  confidence: ConfidenceLevel;
}

export type ClaimLifecycleStage =
  | "CLAIM_DISCOVERED"
  | "CLASSIFIED"
  | "SOURCE_IDENTIFIED"
  | "EVIDENCE_EVALUATED"
  | "VERIFIED"
  | "UNVERIFIED"
  | "REJECTED";

// ==========================================
// 2. ETHICAL & SAFETY TYPES
// ==========================================

export enum EthicalRiskType {
  DECEPTION = "DECEPTION",
  FALSE_URGENCY = "FALSE_URGENCY",
  FALSE_SCARCITY = "FALSE_SCARCITY",
  FABRICATED_SOCIAL_PROOF = "FABRICATED_SOCIAL_PROOF",
  FEAR_EXPLOITATION = "FEAR_EXPLOITATION",
  VULNERABILITY_EXPLOITATION = "VULNERABILITY_EXPLOITATION",
  COERCION = "COERCION",
  HIDDEN_CONDITIONS = "HIDDEN_CONDITIONS",
  MISLEADING_COMPARISON = "MISLEADING_COMPARISON",
  FALSE_GUARANTEE = "FALSE_GUARANTEE",
  FABRICATED_RESULT = "FABRICATED_RESULT",
  FABRICATED_AUTHORITY = "FABRICATED_AUTHORITY",
  DISCRIMINATORY_TARGETING = "DISCRIMINATORY_TARGETING",
  BODY_SHAMING = "BODY_SHAMING",
  HEALTH_EXPLOITATION = "HEALTH_EXPLOITATION",
  FINANCIAL_EXPLOITATION = "FINANCIAL_EXPLOITATION",
  DARK_PATTERN = "DARK_PATTERN",
  COMPETITOR_DECEPTION = "COMPETITOR_DECEPTION",
  OTHER = "OTHER",
}

export type EthicalRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface EthicalRisk {
  id: ID;
  type: EthicalRiskType;
  severity: EthicalRiskLevel;
  description: string;
  triggeringElement: string;
  mitigationSuggestion?: string;
}

export interface MechanismEthicsProfile {
  mechanismId: ID;
  ethicalRisk: EthicalRiskLevel;
  acceptableUses: string[];
  prohibitedUses: string[];
  vulnerableAudienceRisk: boolean;
  requiresTruthValidation: boolean;
  requiresEvidence: boolean;
  requiresAdditionalReview: boolean;
}

export interface SafetyEthicalResult {
  status: "PASS" | "REVIEW" | "FAIL";
  risks: EthicalRisk[];
  reasoning: string;
  requiredChanges?: string[];
  policyVersion: string;
}

// ==========================================
// 3. BRAND CHECK TYPES
// ==========================================

export interface BrandGovernanceIssue {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
  element?: string;
  policyRule?: string;
}

export interface BrandCheckResult {
  status: "PASS" | "REVIEW" | "FAIL";
  voiceCompliant: boolean;
  positioningCompliant: boolean;
  visualIdentityCompliant: boolean;
  issues: BrandGovernanceIssue[];
  policyVersion: string;
}

// ==========================================
// 4. GOVERNANCE AGGREGATION & STATE MACHINE
// ==========================================

export enum CreativeGovernanceStatus {
  NOT_STARTED = "NOT_STARTED",
  TRUTH_CHECKING = "TRUTH_CHECKING",
  SAFETY_CHECKING = "SAFETY_CHECKING",
  BRAND_CHECKING = "BRAND_CHECKING",
  REVIEW_REQUIRED = "REVIEW_REQUIRED",
  BLOCKED = "BLOCKED",
  PASSED = "PASSED",
  STALE = "STALE",
  FAILED = "FAILED",
}

export interface GovernanceIssue {
  id: ID;
  gate: "TRUTH" | "SAFETY" | "BRAND" | "DRIFT";
  code: string;
  message: string;
  severity: "BLOCKING" | "WARNING";
  claimId?: ID;
  suggestedCorrection?: string;
}

export interface FinalCreativeGovernanceResult {
  evaluationId: ID;
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  strategyId: ID;
  confirmationId?: ID;
  assetPlanId?: ID;
  creativeVersionId: ID;
  status: "PASS" | "REVIEW" | "FAIL";
  truth: TruthCheckResult;
  safety: SafetyEthicalResult;
  brand: BrandCheckResult;
  blockingIssues: GovernanceIssue[];
  warnings: GovernanceIssue[];
  policyVersions: {
    truth: string;
    safety: string;
    brand: string;
  };
  evaluatedAt: ISODateTime;
}

// ==========================================
// 5. HUMAN REVIEW & AUTHORIZATION CONTRACTS
// ==========================================

export interface GovernanceReview {
  reviewId: ID;
  creativeVersionId: ID;
  triggeredBy: GovernanceIssue[];
  reviewer?: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGE";
  notes?: string;
  reviewedAt?: ISODateTime;
}

export interface PublicationAuthorization {
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  strategyConfirmed: boolean;
  currentRevision: number;
  truthPassed: boolean;
  safetyPassed: boolean;
  brandPassed: boolean;
  assetsValidated: boolean;
  governanceVersion: string;
  authorizedAt: ISODateTime;
  authorizationHash: string;
}

export interface PublicationAuthorizationInput {
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  governanceResult: FinalCreativeGovernanceResult;
  humanReview?: GovernanceReview;
}

export interface PublicationAuthorizationResult {
  authorized: boolean;
  authorization?: PublicationAuthorization;
  rejectionReasons?: string[];
}

export interface CreativeGovernanceInput {
  tenantId?: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;

  strategyId: ID;
  confirmationId: ID;
  assetPlanId?: ID;
  creativeVersionId: ID;

  businessContext: BusinessContext;
  strategy: CreativeDirection;
  copy?: CreativeCopyPlan;
  assets?: CreativeAsset[];
  offer?: OfferContext;
  platform: PlatformContext;
  format: FormatContext;
  constraints?: CreativeConstraints;
}

export interface GovernanceExplanation {
  evaluationId: ID;
  summary: string;
  truthExplanation?: string;
  safetyExplanation?: string;
  brandExplanation?: string;
  actionableCorrections: string[];
}

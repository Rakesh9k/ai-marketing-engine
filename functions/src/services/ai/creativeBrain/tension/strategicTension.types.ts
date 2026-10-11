/**
 * PHASE 26 — Strategic Tension Detection Types & Contracts
 * Complete data schemas for Strategic Tension Dimensions, Conflict Categories, Severities,
 * Evidence, Options, Resolutions, and Memory.
 */

export type StrategicTensionDimension =
  | 'POSITIONING'
  | 'AUDIENCE'
  | 'OBJECTIVE'
  | 'VALUE_PROPOSITION'
  | 'OFFER'
  | 'PRICE'
  | 'BRAND_TONE'
  | 'EMOTIONAL_DIRECTION'
  | 'CREATIVE_MECHANISM'
  | 'VISUAL_LANGUAGE'
  | 'MESSAGE_HIERARCHY'
  | 'CTA'
  | 'CUSTOMER_RELATIONSHIP'
  | 'LONG_TERM_BRAND'
  | 'SHORT_TERM_CONVERSION';

export type StrategicTensionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type StrategicTensionStatus =
  | 'DETECTED'
  | 'SURFACED'
  | 'RESOLVED'
  | 'ACCEPTED'
  | 'DISMISSED'
  | 'OVERRIDDEN';

export type StrategicTensionResolution =
  | 'FOLLOW_BUSINESS_STRATEGY'
  | 'FOLLOW_USER_DIRECTION'
  | 'CREATE_HYBRID'
  | 'COMPARE_OPTIONS'
  | 'DEFER_DECISION';

export type ConflictCategory =
  | 'TRUTH_CONSTRAINT'
  | 'BRAND_CONSTRAINT_CONFLICT'
  | 'STRATEGIC_TENSION'
  | 'CREATIVE_PREFERENCE_DIFFERENCE';

export interface StrategicDirection {
  name: string;
  description: string;
  leadAttribute: string;
  supportingAttributes: string[];
}

export interface StrategicEvidence {
  source:
    | 'BUSINESS_BRAIN'
    | 'CREATIVE_OPPORTUNITY'
    | 'CAMPAIGN_INTENT'
    | 'USER_INSTRUCTION'
    | 'CREATIVE_MEMORY'
    | 'PERFORMANCE_MEMORY'
    | 'USER_PREFERENCE';
  referenceId?: string;
  statement: string;
  confidence: number; // 0.00 to 1.00
}

export interface StrategicTensionOption {
  id: string;
  label: string;
  tagline: string;
  description: string;
  resolutionType: StrategicTensionResolution;
  isRecommended?: boolean;
  strategicTradeOff: string;
}

export interface StrategicTension {
  id: string;
  campaignId: string;
  tenantId: string;
  businessId: string;
  dimension: StrategicTensionDimension;
  severity: StrategicTensionSeverity;
  category: ConflictCategory;
  businessDirection: StrategicDirection;
  userDirection: StrategicDirection;
  conflictExplanation: string;
  evidence: StrategicEvidence[];
  potentialBenefits: string[];
  potentialRisks: string[];
  recommendedOptions: StrategicTensionOption[];
  status: StrategicTensionStatus;
  resolution?: StrategicTensionResolution;
  createdAt: string;
  resolvedAt?: string;
}

export interface StrategicTensionMemory {
  id: string;
  businessId: string;
  campaignId: string;
  dimension: StrategicTensionDimension;
  businessDirection: string;
  requestedDirection: string;
  resolution: StrategicTensionResolution;
  selectedDirection: string;
  createdAt: string;
}

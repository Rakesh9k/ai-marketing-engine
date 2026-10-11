import type { ID, ISODateTime } from "./primitives";

/**
 * Phase 10.29 — Creative Bank Categories
 */
export type CreativeBankCategory =
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "INSIGHT"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY"
  | "OFFER"
  | "CTA"
  | "STYLE"
  | "RECIPE"
  | "RULE";

/**
 * Phase 10.29 — Creative Bank Item Lifecycle Status
 */
export type CreativeBankStatus =
  | "DRAFT"
  | "REVIEW"
  | "TESTING"
  | "VALIDATED"
  | "ACTIVE"
  | "DEPRECATED"
  | "ARCHIVED";

/**
 * Phase 10.29 — Item Maturity Stage
 */
export type CreativeItemMaturity =
  | "IDEA"
  | "DRAFT"
  | "TESTING"
  | "EMERGING"
  | "VALIDATED"
  | "ESTABLISHED";

/**
 * Phase 10.29 — Item Health State
 */
export type CreativeItemHealth =
  | "NEW"
  | "ACTIVE"
  | "VALIDATED"
  | "STRONG"
  | "STABLE"
  | "DECLINING"
  | "CONFLICTING"
  | "OUTDATED"
  | "DEPRECATED";

/**
 * Phase 10.29 — Knowledge Source Type
 */
export type CreativeBankSourceType =
  | "MANUAL"
  | "AI_GENERATED"
  | "AI_DISCOVERED"
  | "PERFORMANCE_DERIVED"
  | "IMPORTED"
  | "DERIVED";

/**
 * Phase 10.29 — Typed Knowledge Graph Relationship Types
 */
export type CreativeRelationshipType =
  | "USES"
  | "SUPPORTS"
  | "CONFLICTS_WITH"
  | "COMBINES_WITH"
  | "DERIVED_FROM"
  | "REPLACED_BY"
  | "BEST_WITH"
  | "AVOID_WITH";

/**
 * Phase 10.29 — Studio Admin Roles
 */
export type StudioAdminRole =
  | "CREATIVE_VIEWER"
  | "CREATIVE_EDITOR"
  | "CREATIVE_REVIEWER"
  | "CREATIVE_ADMIN"
  | "CREATIVE_SUPER_ADMIN";

/**
 * Compatibility Level
 */
export type CompatibilityLevel =
  | "strongly_compatible"
  | "compatible"
  | "neutral"
  | "weakly_compatible"
  | "incompatible";

export interface CompatibilityScore {
  target: string;
  level: CompatibilityLevel;
  note?: string;
}

/**
 * Structured Compatibility Profile
 */
export interface CompatibilityProfile {
  industries: CompatibilityScore[];
  audiences: CompatibilityScore[];
  objectives: CompatibilityScore[];
  offers: CompatibilityScore[];
  formats: CompatibilityScore[];
  platforms: CompatibilityScore[];
  mechanisms: CompatibilityScore[];
  psychologies: CompatibilityScore[];
  stories: CompatibilityScore[];
  styles: CompatibilityScore[];
}

/**
 * Anti-Pattern Definition
 */
export interface AntiPattern {
  name: string;
  description: string;
  example: string;
}

/**
 * Practical Example
 */
export interface PracticalExample {
  id: ID;
  context: string;
  text: string;
  quality: "GOOD" | "BAD" | "GENERIC";
  industry?: string;
}

/**
 * Version History Record
 */
export interface CreativeItemVersion {
  version: number;
  changedAt: ISODateTime;
  changedBy: string;
  reason: string;
  changesSummary: string;
  snapshot: Record<string, any>;
}

/**
 * Deprecation Safety Record
 */
export interface DeprecationRecord {
  itemId: ID;
  reason: string;
  replacementItemId?: ID;
  deprecatedAt: ISODateTime;
  deprecatedBy: string;
}

/**
 * Performance Summary (derived from Phase 10.27/10.28)
 */
export interface PerformanceSummary {
  relativeLift: number;
  confidence: number;
  evidenceCount: number;
  status: "STRONG" | "MODERATE" | "DECLINING" | "UNTESTED";
  bestIndustry?: string;
  bestObjective?: string;
  bestAudience?: string;
  bestFormat?: string;
}

/**
 * Master Creative Bank Item Model
 */
export interface CreativeBankItem {
  id: ID;
  type: CreativeBankCategory;
  name: string;
  slug: string;
  shortDescription: string;
  definition: string;
  status: CreativeBankStatus;
  maturity: CreativeItemMaturity;
  health: CreativeItemHealth;
  sourceType: CreativeBankSourceType;
  isCanonical: boolean;
  aliases?: string[];
  version: number;
  tags: string[];
  scope: "GLOBAL" | "INDUSTRY" | "TENANT";
  tenantId?: ID;
  industries: string[];
  audiences: string[];
  objectives: string[];
  formats: string[];
  platforms: string[];
  useCases: {
    whenToUse: string[];
    whenToAvoid: string[];
  };
  compatibility: CompatibilityProfile;
  antiPatterns: AntiPattern[];
  examples: PracticalExample[];
  relatedItemIds: Array<{
    itemId: ID;
    relationship: CreativeRelationshipType;
    confidence: number;
    note?: string;
  }>;
  evidenceIds: ID[];
  learningIds: ID[];
  performanceSummary?: PerformanceSummary;
  completenessScore: number; // 0 to 100
  versionHistory: CreativeItemVersion[];
  deprecationRecord?: DeprecationRecord;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  createdBy: string;
  updatedBy: string;
}

/**
 * Audit Log Entry
 */
export interface StudioAuditLogEntry {
  id: ID;
  actor: string;
  role: StudioAdminRole;
  timestamp: ISODateTime;
  action:
    | "CREATE"
    | "EDIT"
    | "DUPLICATE"
    | "DEPRECATE"
    | "RESTORE"
    | "MERGE"
    | "VERSION"
    | "APPROVE"
    | "REJECT"
    | "TEST"
    | "LINK"
    | "UNLINK"
    | "RULE_CHANGE";
  itemId: ID;
  before?: Record<string, any>;
  after?: Record<string, any>;
  reason?: string;
}

/**
 * Studio Overview Summary
 */
export interface StudioOverviewSummary {
  totalItemsCount: number;
  statusCounts: Record<CreativeBankStatus, number>;
  topPerformingMechanisms: Array<{ id: ID; name: string; lift: number; confidence: number }>;
  emergingMechanisms: Array<{ id: ID; name: string; signal: number }>;
  decliningMechanisms: Array<{ id: ID; name: string; fatigueScore: number }>;
  reviewQueueCount: number;
  bankHealthScore: number; // 0 to 100
  recentChanges: StudioAuditLogEntry[];
}

/**
 * Sandbox Test Simulation Inputs & Results
 */
export interface StudioSandboxInput {
  itemId: ID;
  industry?: string;
  objective?: string;
  audience?: string;
  offer?: string;
  platform?: string;
  format?: string;
}

export interface StudioSandboxResult {
  itemId: ID;
  itemName: string;
  simulatedOutput: {
    headline: string;
    bodyCopy: string;
    visualDirection: string;
    cta: string;
  };
  expectedBehavior: string;
  compatibilityWarnings: string[];
  isSandboxTest: true; // Guarantees zero pollution of production metrics
  executedAt: ISODateTime;
}

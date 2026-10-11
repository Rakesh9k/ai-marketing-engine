/**
 * PHASE 10.36 — Build Creative Knowledge Versioning System
 * Data Contracts & Type Definitions
 */

export type ID = string;
export type ISODateTime = string;

export type CreativeBankItemType =
  | "PSYCHOLOGY"
  | "MECHANISM"
  | "INSIGHT"
  | "HOOK"
  | "STORY"
  | "VISUAL"
  | "COPY_PATTERN"
  | "OFFER"
  | "CTA"
  | "STYLE"
  | "RECIPE"
  | "RULE"
  | string;

export type CreativeItemStatus =
  | "DRAFT"
  | "TESTING"
  | "EMERGING"
  | "VALIDATED"
  | "ESTABLISHED"
  | "DEPRECATED"
  | "ARCHIVED";

export type CreativeVersionStatus =
  | "DRAFT"
  | "REVIEW"
  | "ACTIVE"
  | "SUPERSEDED"
  | "DEPRECATED"
  | "ARCHIVED";

export type CreativeVersionMaturity =
  | "IDEA"
  | "DRAFT"
  | "TESTING"
  | "EMERGING"
  | "VALIDATED"
  | "ESTABLISHED";

export type CreativeChangeType =
  | "INITIAL"
  | "DEFINITION_UPDATE"
  | "EVIDENCE_UPDATE"
  | "COMPATIBILITY_UPDATE"
  | "RULE_UPDATE"
  | "RELATIONSHIP_UPDATE"
  | "PERFORMANCE_UPDATE"
  | "CORRECTION"
  | "RESTORATION"
  | "MERGE";

export type KnowledgeScope = "GLOBAL" | "INDUSTRY" | "TENANT";

export interface CreativeExample {
  id: ID;
  headline: string;
  bodyText?: string;
  visualPrompt?: string;
  context: string;
}

export interface CreativeCompatibility {
  allowedIndustries?: string[];
  restrictedIndustries?: string[];
  allowedAudiences?: string[];
  restrictedAudiences?: string[];
  allowedTones?: string[];
}

export interface CreativeRelationshipReference {
  targetItemId: ID;
  targetVersionId?: ID;
  relationshipType: string;
  confidence: number;
}

export interface CreativeRuleReference {
  ruleId: ID;
  ruleVersionId?: ID;
  condition: string;
  action: string;
}

export interface CreativeEvidenceReference {
  evidenceId: ID;
  campaignId?: ID;
  sampleSize: number;
  metricDelta: number;
  confidence: number;
}

export interface CreativePerformanceSummary {
  campaignCount: number;
  averageCTR?: number;
  averageConversionRate?: number;
  topAudience?: string;
}

export interface CreativeBankItem {
  id: ID;
  type: CreativeBankItemType;
  canonicalName: string;
  currentVersion: number;
  currentVersionId: ID;
  status: CreativeItemStatus;
  scope: KnowledgeScope;
  industryIds?: string[];
  tenantId?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  createdBy: string;
  updatedBy: string;
  deprecatedAt?: ISODateTime;
  replacementId?: ID;
  metadata?: Record<string, unknown>;
}

export interface CreativeBankVersion {
  id: ID; // e.g. "item123_v4"
  itemId: ID;
  version: number; // 1, 2, 3...
  versionLabel?: string;
  definition: string;
  purpose?: string;
  useCases?: string[];
  antiPatterns?: string[];
  examples?: CreativeExample[];
  compatibility?: CreativeCompatibility;
  relationships?: CreativeRelationshipReference[];
  rules?: CreativeRuleReference[];
  evidence?: CreativeEvidenceReference[];
  performanceSummary?: CreativePerformanceSummary;
  maturity: CreativeVersionMaturity;
  status: CreativeVersionStatus;
  changeType: CreativeChangeType;
  changeSummary: string;
  changeReason?: string;
  createdAt: ISODateTime;
  createdBy: string;
  supersedesVersionId?: ID;
  supersededAt?: ISODateTime;
  deprecatedAt?: ISODateTime;
  deprecatedBy?: string;
  replacementVersionId?: ID;
  restoredFromVersionId?: ID;
}

export interface VersionFieldChange {
  field: string;
  changeType: "ADDED" | "REMOVED" | "MODIFIED";
  previousValue?: unknown;
  newValue?: unknown;
  significance: "LOW" | "MEDIUM" | "HIGH";
}

export interface CreativeVersionDiff {
  itemId: ID;
  fromVersion: number;
  toVersion: number;
  fromVersionId: ID;
  toVersionId: ID;
  changedFields: VersionFieldChange[];
  addedRelationships: string[];
  removedRelationships: string[];
  addedRules: string[];
  removedRules: string[];
  summary: string;
}

export interface KnowledgeReference {
  itemId: ID;
  versionId: ID;
  version: number;
  canonicalName?: string;
}

export interface CreativeKnowledgeSnapshot {
  createdAt: ISODateTime;
  psychology: KnowledgeReference[];
  mechanisms: KnowledgeReference[];
  recipes: KnowledgeReference[];
  hooks: KnowledgeReference[];
  visuals: KnowledgeReference[];
  copyPatterns: KnowledgeReference[];
  offers: KnowledgeReference[];
  ctas: KnowledgeReference[];
  rules: KnowledgeReference[];
  localIntelligence?: KnowledgeReference[];
  culturalIntelligence?: KnowledgeReference[];
}

export interface CreativeKnowledgeLineage {
  itemId: ID;
  versionId: ID;
  derivedFrom?: KnowledgeReference[];
  replacedBy?: KnowledgeReference[];
  supersedes?: KnowledgeReference;
  mergedFrom?: KnowledgeReference[];
  restoredFrom?: KnowledgeReference;
  evidenceSources?: KnowledgeReference[];
  createdAt: ISODateTime;
}

export interface VersionImpactAnalysis {
  itemId: ID;
  versionId: ID;
  activeCampaignCount: number;
  dependentRecipesCount: number;
  dependentRulesCount: number;
  learningObservationsCount: number;
  summary: string;
  safeToDeprecate: boolean;
}

export interface CreativeVersionAuditEvent {
  id: ID;
  itemId: ID;
  versionId?: ID;
  action:
    | "CREATIVE_VERSION_CREATED"
    | "CREATIVE_VERSION_UPDATED"
    | "CREATIVE_VERSION_SUBMITTED"
    | "CREATIVE_VERSION_APPROVED"
    | "CREATIVE_VERSION_REJECTED"
    | "CREATIVE_VERSION_ACTIVATED"
    | "CREATIVE_VERSION_SUPERSEDED"
    | "CREATIVE_VERSION_DEPRECATED"
    | "CREATIVE_VERSION_RESTORED"
    | "CREATIVE_VERSION_MERGED"
    | "CREATIVE_VERSION_COMPARED"
    | "CREATIVE_VERSION_VIEWED"
    | "CREATIVE_REPLACEMENT_CREATED";
  actorId: string;
  actorRole: string;
  timestamp: ISODateTime;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateVersionInput {
  itemId: ID;
  definition: string;
  purpose?: string;
  useCases?: string[];
  antiPatterns?: string[];
  examples?: CreativeExample[];
  compatibility?: CreativeCompatibility;
  relationships?: CreativeRelationshipReference[];
  rules?: CreativeRuleReference[];
  changeType: CreativeChangeType;
  changeSummary: string;
  changeReason?: string;
  createdBy: string;
  versionLabel?: string;
}

export interface VersionResolutionQuery {
  itemId: ID;
  versionId?: ID;
  version?: number;
  mode: "CURRENT" | "HISTORICAL";
}

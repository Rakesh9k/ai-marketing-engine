/**
 * PHASE 22 — User Behavioral Preference Learning Types & Contracts
 * Complete type schemas for Creative Behavior Events, Fingerprints, Comparative Choices,
 * Semantic Edits, Explicit Preferences, Overrides, Preference Profiles, and Creative Brain Context.
 */

export type CreativeBehaviorEventType =
  | 'CONCEPT_VIEWED'
  | 'CONCEPT_SELECTED'
  | 'CONCEPT_REJECTED'
  | 'CONCEPT_MIXED'
  | 'HOOK_EDITED'
  | 'COPY_EDITED'
  | 'VISUAL_EDITED'
  | 'TONE_EDITED'
  | 'OFFER_EDITED'
  | 'CTA_EDITED'
  | 'LAYOUT_EDITED'
  | 'STORY_EDITED'
  | 'ASSET_REGENERATED'
  | 'HOOK_REGENERATED'
  | 'COPY_REGENERATED'
  | 'VISUAL_REGENERATED'
  | 'FULL_CREATIVE_REGENERATED'
  | 'VARIANT_SELECTED'
  | 'VARIANT_REJECTED'
  | 'BLUEPRINT_APPROVED'
  | 'BLUEPRINT_EDITED'
  | 'CREATIVE_APPROVED'
  | 'CREATIVE_REJECTED';

export interface CreativeBehaviorFingerprint {
  conceptId?: string;
  creativeMechanism?: string;
  emotionalTerritory?: string;
  hookType?: string;
  hookPattern?: string;
  visualStyle?: string;
  visualMechanism?: string;
  tone?: string;
  storyStructure?: string;
  offerRole?: string;
  ctaType?: string;
  format?: string;
  platform?: string;
}

export interface ConceptChoiceContext {
  selectedConceptId: string;
  rejectedConceptIds: string[];
  availableConceptIds: string[];
  selectionOrder?: string[];
  timeToSelectionMs?: number;
}

export interface CreativeBehaviorEvent {
  id: string;
  tenantId: string;
  businessId: string;
  campaignId: string;
  sessionId?: string;
  userId: string;
  eventType: CreativeBehaviorEventType;
  targetType:
    | 'CONCEPT'
    | 'BLUEPRINT'
    | 'HOOK'
    | 'COPY'
    | 'VISUAL'
    | 'TONE'
    | 'OFFER'
    | 'CTA'
    | 'LAYOUT'
    | 'STORY'
    | 'ASSET'
    | 'CAMPAIGN';
  targetId?: string;
  sourceConceptId?: string;
  sourceBlueprintId?: string;
  value?: unknown;
  beforeValue?: unknown;
  afterValue?: unknown;
  fingerprint?: CreativeBehaviorFingerprint;
  choiceContext?: ConceptChoiceContext;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  systemActionCompleted?: boolean;
  createdAt: string;
}

export interface SemanticEditClassification {
  component: string;
  beforeCategory: string;
  afterCategory: string;
  shiftDescription: string;
}

export interface ExplicitCreativePreference {
  id: string;
  businessId: string;
  dimension: string;
  value: string;
  polarity: 'PREFERRED' | 'DISFAVORED';
  statement: string;
  confidence: number; // Always 1.0 for explicit
  createdAt: string;
  source: 'USER';
}

export interface CreativePreferenceOverride {
  dimension: string;
  value: string;
  mode: 'PREFER' | 'AVOID' | 'IGNORE_LEARNED_SIGNAL';
  createdAt: string;
  updatedAt: string;
}

export interface PreferenceDimensionRating {
  name: string;
  score: number; // 0 to 100
  ratingStars: number; // 1 to 5
  confidence: number; // 0.0 to 1.0
  evidenceCount: number;
}

export interface CreativePreferenceProfile {
  businessId: string;
  preferredHooks: PreferenceDimensionRating[];
  preferredMechanisms: PreferenceDimensionRating[];
  preferredTones: PreferenceDimensionRating[];
  preferredVisualStyles: PreferenceDimensionRating[];
  preferredStoryStructures: PreferenceDimensionRating[];
  preferredOfferRoles: PreferenceDimensionRating[];
  preferredCTAs: PreferenceDimensionRating[];
  disfavoredPatterns: PreferenceDimensionRating[];
  overallConfidence: number;
  updatedAt: string;
}

export interface CreativeBrainPreferenceContext {
  profile?: CreativePreferenceProfile;
  relevantSignals: Array<{
    dimension: string;
    preferredValue: string;
    confidence: number;
    evidenceCount: number;
  }>;
  explicitPreferences: ExplicitCreativePreference[];
  exploitRatio: number; // Default 0.70
  exploreRatio: number; // Default 0.30
  advisoryStatement: string;
}

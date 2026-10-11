/**
 * PHASE 16 — Canonical Creative Blueprint Handoff Contract
 * Defines the final, strongly typed execution specification contract between
 * Creative Brain (Phase 1–15) and Mitra's Execution Engine.
 */

import type { ISODateTime } from './primitives';

export type BlueprintStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'BLOCKED'
  | 'SUPERSEDED';

export type PrimaryObjectiveType =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'engagement'
  | 'retention'
  | 'promotion'
  | 'lead_generation'
  | 'footfall';

export interface CampaignObjectiveSpec {
  primary: PrimaryObjectiveType;
  secondary?: string[];
  desiredAction: string;
  successSignal?: string;
}

export interface BlueprintAudienceSpec {
  primaryAudience: string;
  lifeSituation?: string;
  problemOrDesire?: string;
  audienceTension?: string;
  motivation?: string;
  awarenessLevel?: string;
  localContext?: string;
}

export interface BlueprintProductSpec {
  name: string;
  type: 'product' | 'service' | 'experience' | 'property' | 'offer';
  description?: string;
  relevantFeatures?: string[];
  customerBenefit?: string;
}

export interface BlueprintOfferSpec {
  exists: boolean;
  name?: string;
  value?: string;
  price?: string;
  discount?: string;
  validity?: string;
  eligibility?: string;
  strategicRole:
    | 'primary_hook'
    | 'supporting_proof'
    | 'conversion_trigger'
    | 'urgency'
    | 'value_anchor'
    | 'none';
  sourceFactIds?: string[];
}

export interface CreativeOpportunityReference {
  opportunityId: string;
  audience: string;
  problemOrDesire: string;
  customerTension: string;
  emotionalTerritory: string;
  opportunity: string;
  strategicRecommendation: string;
  thingsToAvoid: string[];
}

export interface BlueprintCoreConceptSpec {
  conceptId?: string;
  name: string;
  oneLineIdea: string;
  humanInsight: string;
  reasonToCare: string;
  strategicTerritory: string;
  narrativeTerritory?: string;
  identityTerritory?: string;
}

export interface CreativeMechanismDirectionSpec {
  primaryMechanism: string;
  mechanismExplanation: string;
  intendedAudienceEffect: string;
  executionGuidance?: string[];
}

export interface EmotionalDirectionSpec {
  primaryEmotion: string;
  secondaryEmotions?: string[];
  emotionalJourney?: string;
  desiredAudienceFeeling: string;
  avoidEmotions?: string[];
}

export interface ToneDirectionSpec {
  primary: string;
  secondary?: string[];
  personality?: string[];
  languageStyle?: string;
  intensity?: 'subtle' | 'balanced' | 'bold';
  avoid?: string[];
}

export interface HookDirectionSpec {
  hookType: string;
  strategicPurpose: string;
  hookIdea: string;
  audienceTensionToActivate?: string;
  finalCopyFreedom: 'high' | 'medium' | 'low';
}

export interface MessageHierarchySpec {
  primaryMessage: string;
  supportingMessages: string[];
  proofPoints?: string[];
  offerMessage?: string;
  emotionalMessage?: string;
  finalTakeaway: string;
}

export interface VisualDirectionSpec {
  visualConcept: string;
  subject: string;
  setting?: string;
  compositionIntent?: string;
  visualMetaphor?: string;
  mood?: string;
  lighting?: string;
  photographyStyle?: string;
  imagePriority?: string[];
  avoidVisuals?: string[];
}

export interface CompositionDirectionSpec {
  hierarchy: string[];
  focalPoint: string;
  subjectPlacement?: string;
  textZone?: string;
  offerPlacement?: string;
  whitespaceStrategy?: string;
  visualFlow?: string;
  layoutPrinciple?: string;
  aspectRatioConsiderations?: string[];
}

export interface CopyDirectionSpec {
  communicationStyle: string;
  messageApproach: string;
  headlineDirection: string;
  bodyDirection?: string;
  proofDirection?: string;
  offerLanguage?: string;
  ctaLanguage?: string;
  copyLength?: 'minimal' | 'short' | 'medium' | 'long';
  language?: string;
  avoidPhrases?: string[];
}

export interface StoryBeatSpec {
  beatNumber: number;
  purpose: string;
  visualCue: string;
  copyCue: string;
}

export interface StoryStructureSpec {
  structureType:
    | 'static'
    | 'problem_solution'
    | 'hook_payoff'
    | 'before_after'
    | 'transformation'
    | 'narrative'
    | 'list'
    | 'testimonial'
    | 'demonstration'
    | 'custom';
  beats: StoryBeatSpec[];
  narrativePurpose: string;
}

export interface MotionDirectionSpec {
  motionStyle?: string;
  pacing?: 'slow' | 'medium' | 'fast';
  entranceBehavior?: string;
  transitionBehavior?: string;
  emphasisMoments?: string[];
  endingBehavior?: string;
}

export interface AudioDirectionSpec {
  required: boolean;
  mood?: string;
  energy?: 'low' | 'medium' | 'high';
  musicStyle?: string;
  soundDesign?: string[];
  voiceover?: boolean;
  voiceoverDirection?: string;
}

export interface CTADirectionSpec {
  objective: string;
  action: string;
  urgency?: string;
  languageDirection: string;
  destination?: string;
}

export interface FormatDirectionSpec {
  primaryFormat:
    | 'single_image'
    | 'carousel'
    | 'reel'
    | 'story'
    | 'poster'
    | 'video';
  aspectRatios?: string[];
  durationSeconds?: number;
  slideCount?: number;
  responsiveVariants?: string[];
}

export interface PlatformDirectionSpec {
  primary: string;
  secondary?: string[];
  platformBehavior?: string[];
  platformSpecificConsiderations?: string[];
}

export interface RequiredAssetSpec {
  type:
    | 'business_logo'
    | 'product_photo'
    | 'menu'
    | 'property_photo'
    | 'team_photo'
    | 'offer_asset'
    | 'brand_asset'
    | 'user_upload'
    | 'generated_visual'
    | 'other';
  description: string;
  required: boolean;
  source?: 'business_brain' | 'user' | 'generated' | 'existing_asset';
}

export interface BrandConstraintSpec {
  category: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface TruthConstraintSpec {
  category: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ApprovedFactSpec {
  id: string;
  statement: string;
  source:
    | 'business_brain'
    | 'campaign_input'
    | 'verified_offer'
    | 'user_input'
    | 'verified_asset';
  confidence?: number;
  usableFor:
    | 'headline'
    | 'body'
    | 'visual'
    | 'offer'
    | 'cta'
    | 'proof'
    | 'general';
}

export interface ProhibitedClaimSpec {
  claim: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface CreativeBankReferenceSpec {
  itemId: string;
  category: string;
  role: string;
  influence: string;
  confidence?: number;
}

export interface BlueprintUserSelectionSpec {
  sourceConceptId?: string;
  component: string;
  selectedValue: unknown;
  selectionMode: 'exact' | 'preferred' | 'inspired_by';
}

export interface BlueprintProvenanceSpec {
  opportunityId?: string;
  sourceConceptIds: string[];
  componentSources: {
    component: string;
    sourceConceptId?: string;
    sourceCreativeBankItemIds?: string[];
    userSelected: boolean;
  }[];
  adaptations: {
    field: string;
    original: string;
    final: string;
    reason: string;
  }[];
  conflictsResolved: {
    conflict: string;
    resolution: string;
    reason: string;
  }[];
}

export interface BlueprintValidationResult {
  valid: boolean;
  status: BlueprintStatus;
  score: number;
  strategicCoherence: number; // 0..100
  brandCompliance: number; // 0..100
  truthReadiness: number; // 0..100
  executionReadiness: number; // 0..100
  missingFields: string[];
  warnings: string[];
  blockingIssues: string[];
}

export interface CanonicalCreativeBlueprint {
  id: string;
  version: number;
  parentBlueprintId?: string;
  campaignId: string;
  tenantId: string;
  idempotencyKey: string;
  status: BlueprintStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;

  // 1. WHO?
  audience: BlueprintAudienceSpec;

  // 2. WHY?
  campaignObjective: CampaignObjectiveSpec;
  creativeOpportunity: CreativeOpportunityReference;

  // 3. WHAT?
  product: BlueprintProductSpec;
  offer: BlueprintOfferSpec;

  // 4. HOW?
  coreConcept: BlueprintCoreConceptSpec;
  creativeMechanism: CreativeMechanismDirectionSpec;
  emotionalDirection: EmotionalDirectionSpec;
  tone: ToneDirectionSpec;
  hook: HookDirectionSpec;
  messageHierarchy: MessageHierarchySpec;
  visualDirection: VisualDirectionSpec;
  compositionDirection: CompositionDirectionSpec;
  copyDirection: CopyDirectionSpec;
  storyStructure: StoryStructureSpec;
  motionDirection: MotionDirectionSpec;
  audioDirection: AudioDirectionSpec;
  cta: CTADirectionSpec;
  format: FormatDirectionSpec;
  platform: PlatformDirectionSpec;
  requiredAssets: RequiredAssetSpec[];

  // 5. WHAT MUST NOT HAPPEN?
  brandConstraints: BrandConstraintSpec[];
  truthConstraints: TruthConstraintSpec[];
  approvedFacts: ApprovedFactSpec[];
  prohibitedClaims: ProhibitedClaimSpec[];

  // TRACEABILITY & METADATA
  selectedCreativeBankItems: CreativeBankReferenceSpec[];
  userSelections: BlueprintUserSelectionSpec[];
  provenance: BlueprintProvenanceSpec;
  validation: BlueprintValidationResult;
}

export interface ExecutionHandoffContract {
  campaignId: string;
  tenantId: string;
  creativeBlueprint: CanonicalCreativeBlueprint;
  businessBrainReference: {
    businessId: string;
    name: string;
    industry: string;
    subVertical: string;
  };
  executionContext: {
    handoffTimestamp: ISODateTime;
    executionMode: 'AUTOMATIC' | 'REVIEW_FIRST';
  };
}

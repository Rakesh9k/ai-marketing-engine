import type { ID, ISODateTime, DurationRange } from "./primitives";
import type { PlatformContext, FormatContext, SafeArea } from "./platforms";
import type { PolicyVersionSnapshot } from "./persistence";
import type { EvidenceRequirement } from "./evidence";
import type { MissingInformation, BlockingReason } from "./recovery";
import type { CreativeDirection } from "./directions";
import type { CreativeOpportunity, CreativeOpportunityRecommendation } from "./opportunity";
import type { BusinessContext, ProductReference, BrandPositioning } from "./business";
import type { LocationContext } from "./location";
import type { OfferContext } from "./offers";
import type { ProductContext, CreativeConstraints } from "./context";
import type { ValidationIssue, CreativeWarning } from "./validation";

export interface CreativeBrainFailure {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface CreativeBrainRecovery {
  action: string;
  suggestion?: string;
}

export interface CreativeStrategy {
  strategyId: ID;
  name: string;
  headlineConcept: string;
  strategicAngle: string;
}

/**
 * Phase 10.22 — Asset Plan Status
 */
export enum AssetPlanStatus {
  DRAFT = "DRAFT",
  BUILDING = "BUILDING",
  READY = "READY",
  EXECUTION_AUTHORIZED = "EXECUTION_AUTHORIZED",
  GENERATING = "GENERATING",
  VALIDATING = "VALIDATING",
  COMPOSING = "COMPOSING",
  COMPLETE = "COMPLETE",
  FAILED = "FAILED",
  STALE = "STALE",
  CANCELLED = "CANCELLED",
}

/**
 * Phase 10.22 — Asset Requirement Types
 */
export enum AssetRequirementType {
  HERO_IMAGE = "HERO_IMAGE",
  CONTEXTUAL_IMAGE = "CONTEXTUAL_IMAGE",
  PRODUCT_IMAGE = "PRODUCT_IMAGE",
  CLOSE_UP = "CLOSE_UP",
  DETAIL_IMAGE = "DETAIL_IMAGE",
  BACKGROUND = "BACKGROUND",
  LOGO = "LOGO",
  BRAND_ELEMENT = "BRAND_ELEMENT",
  PRODUCT_CUTOUT = "PRODUCT_CUTOUT",
  TEXT = "TEXT",
  ICON = "ICON",
  DECORATIVE_ELEMENT = "DECORATIVE_ELEMENT",
  VIDEO_CLIP = "VIDEO_CLIP",
  MOTION_ELEMENT = "MOTION_ELEMENT",
}

/**
 * Phase 10.22 — Asset Role (Strategic Purpose)
 */
export enum AssetRole {
  ATTENTION = "ATTENTION",
  PRODUCT_PROOF = "PRODUCT_PROOF",
  CONTEXT = "CONTEXT",
  EMOTIONAL_PROOF = "EMOTIONAL_PROOF",
  TRUST = "TRUST",
  DIFFERENTIATION = "DIFFERENTIATION",
  OFFER_SUPPORT = "OFFER_SUPPORT",
  BRANDING = "BRANDING",
  INFORMATION = "INFORMATION",
  CTA_SUPPORT = "CTA_SUPPORT",
  TRANSITION = "TRANSITION",
}

/**
 * Phase 10.22 — Asset Generation Method
 */
export enum AssetGenerationMethod {
  EXISTING_BUSINESS_ASSET = "EXISTING_BUSINESS_ASSET",
  GENERATED_IMAGE = "GENERATED_IMAGE",
  GENERATED_AND_EDITED = "GENERATED_AND_EDITED",
  GENERATED_BACKGROUND = "GENERATED_BACKGROUND",
  GENERATED_CUTOUT = "GENERATED_CUTOUT",
  COMPOSITED = "COMPOSITED",
  TEXT_RENDERED = "TEXT_RENDERED",
  VIDEO_GENERATED = "VIDEO_GENERATED",
  EXTERNAL_ASSET = "EXTERNAL_ASSET",
}

/**
 * Phase 10.22 — Lifecycle Status for Individual Asset Execution
 */
export enum AssetStatus {
  REQUIRED = "REQUIRED",
  GENERATING = "GENERATING",
  GENERATED = "GENERATED",
  VALIDATING = "VALIDATING",
  VALID = "VALID",
  INVALID = "INVALID",
  REGENERATING = "REGENERATING",
  COMPOSITED = "COMPOSITED",
  EXPORTED = "EXPORTED",
  FAILED = "FAILED",
  STALE = "STALE",
}

export type AssetPriority = "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";

export type CompositionRole =
  | "HERO_BACKGROUND"
  | "MAIN_SUBJECT"
  | "FOREGROUND_ELEMENT"
  | "PRODUCT_BADGE"
  | "BRAND_HEADER"
  | "OVERLAY"
  | "TEXT_BACKGROUND"
  | "ICON_CONTAINER";

export type CopyRelationship =
  | "SUPERIMPOSED_OVER_ASSET"
  | "ADJACENT_TO_ASSET"
  | "INDEPENDENT_CONTAINER"
  | "LABEL_FOR_ASSET";

/**
 * Strategic Intent preserved at top level of Asset Plan
 */
export interface CreativeAssetIntent {
  coreIdea: string;
  strategicObjective: string;
  audience: string;
  desiredAudienceShift: string;
  desiredBehavior: string;
  emotionalTerritory?: string;
  primaryMessage: string;
  visualRole: string;
  creativeMechanismId?: ID;
  visualStructureId?: ID;
  styleSystemId?: ID;
}

/**
 * Human Presence Specification
 */
export interface HumanPresence {
  required: boolean;
  count?: number;
  demographicDescription?: string;
  relationship?: string;
  action?: string;
  emotionalState?: string;
  framing?: string;
}

/**
 * Product & Location Context References
 */


export interface AssetCulturalContext {
  region: string;
  cues: string[];
  prohibitedCues: string[];
}

/**
 * Explicit Subject definition for visual assets
 */
export interface AssetSubject {
  primarySubject: string;
  secondarySubjects?: string[];
  environment?: string;
  humanPresence?: HumanPresence;
  productReference?: ProductReference;
  locationContext?: LocationContext;
  culturalContext?: AssetCulturalContext;
  prohibitedElements?: string[];
}

/**
 * Direct visual direction derived from Visual + Style Intelligence
 */
export interface AssetVisualDirection {
  composition: string;
  subjectHierarchy: string;
  camera?: string;
  lens?: string;
  framing: string;
  lighting: string;
  environment: string;
  colorDirection?: string;
  texture?: string;
  depth?: string;
  realism: string;
  visualStyle?: string;
  negativeConstraints: string[];
}

/**
 * Source requirements & business asset authenticity rules
 */
export interface AssetSourceRequirements {
  sourceType: "VERIFIED_BUSINESS_ASSET" | "GENERATED" | "EITHER";
  requiredAssetIds?: ID[];
  authenticityRequired: boolean;
}

/**
 * Technical bounds for individual asset requirements
 */
export interface AssetTechnicalRequirements {
  minWidth: number;
  minHeight: number;
  aspectRatio: string;
  format: "PNG" | "JPG" | "WEBP" | "SVG" | "MP4";
  transparentBackground?: boolean;
  maxFileSizeKb?: number;
}



export interface AssetValidationRequirements {
  subjectAccuracyRequired: boolean;
  brandComplianceRequired: boolean;
  truthVerificationRequired: boolean;
  prohibitedContentFilter: boolean;
}

/**
 * Concrete Requirement for an individual asset
 */
export interface CreativeAssetRequirement {
  assetRequirementId: ID;
  type: AssetRequirementType;
  role: AssetRole;
  purpose: string;
  required: boolean;
  quantity: number;
  subject: AssetSubject;
  visualDirection: AssetVisualDirection;
  generationMethod: AssetGenerationMethod;
  sourceRequirements?: AssetSourceRequirements;
  compositionRole: CompositionRole;
  copyRelationship?: CopyRelationship;
  technicalRequirements: AssetTechnicalRequirements;
  validationRequirements: AssetValidationRequirements;
  priority: AssetPriority;
  dependencies: ID[];
}

/**
 * Image Generation Prompt boundary artifact
 */
export interface AssetGenerationPrompt {
  assetRequirementId: ID;
  systemIntent: string;
  subject: string;
  environment?: string;
  composition: string;
  camera?: string;
  lighting?: string;
  visualStyle?: string;
  emotionalIntent?: string;
  brandConstraints: string[];
  culturalConstraints: string[];
  negativeConstraints: string[];
  outputRequirements: string[];
  sourceAssetReferences?: ID[];
}

/**
 * Copy Requirement for copy plan
 */
export interface CopyRequirement {
  role: "HEADLINE" | "SUPPORT" | "OFFER" | "PROOF" | "CTA" | "DISCLAIMER";
  purpose: string;
  structureId?: ID;
  content: string;
  requiredInformation: string[];
  prohibitedClaims: string[];
  maxLength?: number;
  tone?: string;
  truthRequirements: EvidenceRequirement[];
}

export interface CreativeCopyPlan {
  headline: CopyRequirement;
  supportingCopy?: CopyRequirement;
  offerCopy?: CopyRequirement;
  proofCopy?: CopyRequirement;
  cta: CopyRequirement;
  disclaimers?: CopyRequirement[];
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
  unit: "PX" | "PERCENT";
}

export interface CanvasSpecification {
  width: number;
  height: number;
  aspectRatio: string;
  dpi?: number;
}

export interface LayoutStructure {
  gridColumns?: number;
  gridRows?: number;
  layoutPattern: string;
}

export interface VisualHierarchy {
  primaryFocus: ID;
  secondaryFocus: ID[];
  readingOrder: ID[];
}

export interface CompositionRegion {
  regionId: ID;
  role: "HERO" | "PRODUCT" | "CONTEXT" | "HEADLINE" | "OFFER" | "CTA" | "BRAND";
  position: Position;
  dimensions: Dimensions;
  priority: number;
  allowedAssets: ID[];
  allowedCopy: string[];
  constraints: string[];
}

export interface AssetPlacement {
  assetRequirementId: ID;
  regionId: ID;
  fitMode: "COVER" | "CONTAIN" | "STRETCH" | "CROP";
  zIndex: number;
}

export interface CopyPlacement {
  role: "HEADLINE" | "SUPPORT" | "OFFER" | "PROOF" | "CTA" | "DISCLAIMER";
  regionId: ID;
  fontFamily: string;
  fontSize: number;
  colorHex: string;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  zIndex: number;
}

export interface LogoPlacement {
  assetRequirementId: ID;
  regionId: ID;
  position: "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT" | "CENTER";
  maxHeight: number;
}

export interface ResponsiveComposition {
  aspectRatio: string;
  canvas: CanvasSpecification;
  regions: CompositionRegion[];
}

export interface CreativeCompositionPlan {
  canvas: CanvasSpecification;
  layout: LayoutStructure;
  hierarchy: VisualHierarchy;
  regions: CompositionRegion[];
  assetPlacements: AssetPlacement[];
  copyPlacements: CopyPlacement[];
  logoPlacement?: LogoPlacement;
  safeAreas: SafeArea[];
  responsiveVariants: ResponsiveComposition[];
  styleSystemId?: ID;
}

export interface CreativeVisualPlan {
  styleName: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    ctaFont: string;
  };
  mood: string;
}



export interface ReelScene {
  sceneId: ID;
  sequenceOrder: number;
  durationSeconds: number;
  purpose: string;
  primaryAssetId: ID;
  secondaryAssetIds?: ID[];
  textOverlay?: string;
  audioNote?: string;
}

export interface TransitionRequirement {
  fromSceneId: ID;
  toSceneId: ID;
  type: "CUT" | "FADE" | "SLIDE" | "DISSOLVE" | "ZOOM";
  durationSeconds: number;
}

export interface TextTimingRequirement {
  sceneId: ID;
  textRole: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  animationType: "FADE_IN" | "TYPEWRITER" | "SLIDE_UP" | "STATIC";
}

export interface MotionRequirement {
  sceneId: ID;
  assetId: ID;
  motionType: "SLOW_ZOOM_IN" | "SLOW_PAN_LEFT" | "STATIC" | "SUBTLE_FLOAT";
}

export interface ReelAssetPlan {
  duration: DurationRange;
  scenes: ReelScene[];
  assets: ID[];
  transitions: TransitionRequirement[];
  textTiming: TextTimingRequirement[];
  motionRequirements: MotionRequirement[];
}

export interface CreativeBrandRequirements {
  brandName: string;
  logoRequired: boolean;
  verifiedLogoId?: ID;
  brandColors: string[];
  prohibitedWords: string[];
  mandatoryDisclaimers: string[];
}

export interface CreativeTechnicalRequirements {
  platform: string;
  format: string;
  targetAspectRatio: string;
  maxTotalSizeMb: number;
}

export interface CreativeAssetValidationRequirements {
  requireAllCriticalAssets: boolean;
  minAssetCount: number;
  truthVerificationRequired: boolean;
  brandSafetyRequired: boolean;
}

/**
 * Core Object: CreativeAssetPlan
 */
export interface CreativeAssetPlan {
  assetPlanId: ID;
  sessionId: ID;
  revision: number;
  strategyId: ID;
  confirmationId: ID;
  campaignId?: ID;
  platform: PlatformContext;
  format: FormatContext;
  creativeIntent: CreativeAssetIntent;
  requirements: CreativeAssetRequirement[];
  compositionPlan: CreativeCompositionPlan;
  copyPlan: CreativeCopyPlan;
  visualPlan: CreativeVisualPlan;
  reelPlan?: ReelAssetPlan;
  brandRequirements: CreativeBrandRequirements;
  technicalRequirements: CreativeTechnicalRequirements;
  validationRequirements: CreativeAssetValidationRequirements;
  policyVersions: PolicyVersionSnapshot[];
  status: AssetPlanStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * Inputs & Results for Asset Planner
 */
export interface AssetPlanningInput {
  creativeDirection: CreativeDirection;
  creativeStrategy: CreativeStrategy;
  opportunity: CreativeOpportunity | CreativeOpportunityRecommendation | any;
  platform: PlatformContext;
  format: FormatContext;
  business: BusinessContext;
  product?: ProductContext | ProductReference | any;
  offer?: OfferContext;
  brand?: BrandPositioning | any;
  constraints: CreativeConstraints;
}

export interface AssetPlanningResult {
  status: "SUCCESS" | "INCOMPLETE" | "BLOCKED" | "FAILED";
  assetPlan?: CreativeAssetPlan;
  missingInformation?: MissingInformation[];
  warnings?: CreativeWarning[];
  blockingReasons?: BlockingReason[];
}

export interface AssetValidationResult {
  assetId: ID;
  valid: boolean;
  technicalValid: boolean;
  subjectValid: boolean;
  brandValid: boolean;
  truthValid: boolean;
  compositionCompatible: boolean;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
}

export interface AssetGenerationOperation {
  operationId: ID;
  assetRequirementId: ID;
  attempt: number;
  status: "PENDING" | "GENERATING" | "VALIDATING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
  inputFingerprint: string;
  resultReference?: string;
  failure?: CreativeBrainFailure;
}

export interface CreativeAsset {
  assetId: ID;
  tenantId: ID;
  businessId: ID;
  sessionId: ID;
  revision: number;
  assetPlanId: ID;
  assetRequirementId: ID;
  type: AssetRequirementType;
  role: AssetRole;
  source: "BUSINESS_ASSET" | "GENERATED" | "COMPOSITED";
  storageReference: string;
  mimeType: string;
  width: number;
  height: number;
  status: AssetStatus;
  validation: AssetValidationResult;
  createdAt: ISODateTime;
}

export interface CreateAssetPlanRequest {
  revision: number;
  confirmationId: ID;
  idempotencyKey: string;
}

export interface CreateAssetPlanResponse {
  operationId: ID;
  status: "IN_PROGRESS" | "READY" | "BLOCKED" | "FAILED";
  assetPlan?: CreativeAssetPlan;
  recovery?: CreativeBrainRecovery;
}

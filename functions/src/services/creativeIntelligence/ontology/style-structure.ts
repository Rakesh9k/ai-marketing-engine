// Style Intelligence – Ontology definitions
// This file defines the Zod schemas for the Style Intelligence layer.
// It follows the same patterns as other ontology files (offer-structure, visual-structure, etc.)

import { z } from "zod";
import { defineEntitySchema, ConfidenceLevelSchema } from "./ontology-types";

// ---------------------------------------------------------------------------
// Sub‑objects – behavior based models (no concrete values, only descriptive rules)
// ---------------------------------------------------------------------------
export const TypographyStyleSchema = z.object({
  primaryRole: z.string(),
  displayCharacter: z.enum([
    "EDITORIAL",
    "GEOMETRIC",
    "HUMANIST",
    "EXPRESSIVE",
    "CONDENSED",
    "NEUTRAL",
    "HANDMADE",
  ]),
  hierarchy: z.string(),
  weightBehavior: z.string(),
  sizeBehavior: z.string(),
  lineHeightBehavior: z.string(),
  trackingBehavior: z.string(),
  caseBehavior: z.enum(["MIXED", "UPPERCASE", "LOWERCASE", "CONTEXTUAL"]),
  alignmentBehavior: z.string(),
  maximumFontFamilies: z.number().int().nonnegative(),
  emphasisTechnique: z.array(z.string()),
  typographyRisks: z.array(z.string()),
});

export const ColorBehaviorSchema = z.object({
  paletteCharacter: z.string(),
  dominantRole: z.string(),
  accentRole: z.string(),
  backgroundBehavior: z.string(),
  contrastLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  saturation: z.enum(["MUTED", "BALANCED", "VIBRANT"]),
  temperature: z.enum(["WARM", "COOL", "NEUTRAL", "MIXED"]),
  colorRatio: z.string(),
  accentUsage: z.string(),
  gradientUsage: z.string(),
  photographicColorInteraction: z.string(),
  avoidColors: z.array(z.string()).optional(),
  brandColorAdaptation: z.string(),
});

export const CompositionStyleSchema = z.object({
  density: z.enum(["MINIMAL", "BALANCED", "DENSE"]),
  alignment: z.enum(["GRID", "ASYMMETRIC", "CENTERED", "EDITORIAL", "ORGANIC"]),
  whitespace: z.enum(["ABUNDANT", "MODERATE", "TIGHT"]),
  focalPoint: z.string(),
  hierarchy: z.string(),
  edgeBehavior: z.string(),
  layering: z.string(),
  cropping: z.string(),
  balance: z.string(),
  visualTension: z.string(),
});

export const SpacingStyleSchema = z.object({
  overallDensity: z.enum(["AIRY", "BALANCED", "COMPACT"]),
  marginBehavior: z.string(),
  paddingBehavior: z.string(),
  sectionSpacing: z.string(),
  textSpacing: z.string(),
  elementGrouping: z.string(),
  rhythm: z.string(),
});

export const ImageTreatmentSchema = z.object({
  cropStyle: z.string(),
  framing: z.string(),
  subjectScale: z.string(),
  contrast: z.string(),
  saturation: z.string(),
  colorGrade: z.string(),
  sharpness: z.string(),
  backgroundTreatment: z.string(),
  overlays: z.array(z.string()),
  masks: z.array(z.string()),
  borders: z.string(),
  layering: z.string(),
});

export const TextureStyleSchema = z.object({
  presence: z.enum(["NONE", "SUBTLE", "VISIBLE"]),
  type: z.array(z.string()),
  purpose: z.string(),
  scale: z.string(),
  opacityBehavior: z.string(),
  interactionWithPhotography: z.string(),
  interactionWithTypography: z.string(),
});

export const MotionStyleSchema = z.object({
  energy: z.enum(["CALM", "MODERATE", "HIGH"]),
  entranceBehavior: z.array(z.string()),
  exitBehavior: z.array(z.string()),
  transitionBehavior: z.array(z.string()),
  cameraMovement: z.array(z.string()),
  textMovement: z.array(z.string()),
  imageMovement: z.array(z.string()),
  pacing: z.string(),
  easingCharacter: z.string(),
  repetition: z.string(),
  motionIntensity: z.string(),
  motionAntiPatterns: z.array(z.string()),
});

export const ShapeLanguageSchema = z.object({
  geometry: z.enum(["GEOMETRIC", "ORGANIC", "MIXED"]),
  corners: z.enum(["SHARP", "SOFT", "ROUNDED", "MIXED"]),
  borders: z.string(),
  containers: z.string(),
  masks: z.array(z.string()),
  decorativeShapes: z.array(z.string()),
  visualMotifs: z.array(z.string()),
});

export const PhotographyStyleSchema = z.object({
  subjectMatter: z.array(z.string()),
  cameraCharacter: z.string(),
  framing: z.string(),
  perspective: z.string(),
  lighting: z.string(),
  depthOfField: z.string(),
  humanPresence: z.enum(["NONE", "SECONDARY", "CENTRAL"]),
  authenticityLevel: z.string(),
  environmentImportance: z.string(),
  imperfectionTolerance: z.string(),
});

export const IllustrationStyleSchema = z.object({
  usage: z.enum(["NONE", "ACCENT", "SUPPORTING", "PRIMARY"]),
  character: z.string(),
  lineQuality: z.string(),
  geometry: z.string(),
  detailLevel: z.string(),
  colorBehavior: z.string(),
  interactionWithPhotography: z.string(),
});

export const LightingStyleSchema = z.object({
  character: z.enum([
    "NATURAL",
    "SOFT",
    "DRAMATIC",
    "HIGH_KEY",
    "LOW_KEY",
    "STUDIO",
    "ENVIRONMENTAL",
  ]),
  direction: z.string(),
  contrast: z.string(),
  shadowBehavior: z.string(),
  highlightBehavior: z.string(),
  practicalLightUsage: z.string(),
});

export const DepthStyleSchema = z.object({
  dimensionality: z.enum(["FLAT", "LAYERED", "DEEP"]),
  foregroundUsage: z.string(),
  backgroundBehavior: z.string(),
  overlap: z.string(),
  shadows: z.string(),
  blur: z.string(),
  parallaxPotential: z.string(),
});

export const ContrastStyleSchema = z.object({
  tonalContrast: z.string(),
  colorContrast: z.string(),
  typographicContrast: z.string(),
  scaleContrast: z.string(),
  densityContrast: z.string(),
  subjectBackgroundSeparation: z.string(),
});

export const HierarchyStyleSchema = z.object({
  primaryAttention: z.string(),
  secondaryAttention: z.string(),
  tertiaryAttention: z.string(),
  focalStrategy: z.string(),
  readingDirection: z.string(),
  hierarchyMechanisms: z.array(z.string()),
});

export const StylePersonalitySchema = z.object({
  adjectives: z.array(z.string()),
  perceivedBrandAttributes: z.array(z.string()),
  emotionalCharacter: z.array(z.string()),
  culturalCharacter: z.array(z.string()).optional(),
  audienceAssociations: z.array(z.string()),
});

export const AssetRequirementSchema = z.object({
  type: z.string(),
  quantity: z.number().int().nonnegative(),
  description: z.string(),
});

export const EvidenceReferenceSchema = z.object({
  source: z.string(),
  link: z.string().url().optional(),
  confidence: ConfidenceLevelSchema,
});

export const RelationshipSchema = z.object({
  type: z.string(),
  targetId: z.string(),
});

export const StyleAdaptabilitySchema = z.object({
  supportsBrandColorAdaptation: z.boolean(),
  supportsTypographyAdaptation: z.boolean(),
  supportsPhotographyAdaptation: z.boolean(),
  supportsPlatformAdaptation: z.boolean(),
  supportsCulturalAdaptation: z.boolean(),
  supportsIndustryAdaptation: z.boolean(),
  rigidElements: z.array(z.string()),
  flexibleElements: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Main StyleSystem entity
// ---------------------------------------------------------------------------
export const StyleSystemSchema = defineEntitySchema("style_system", {
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  visualIdentity: z.string(),
  emotionalCharacter: z.array(z.string()),
  brandPerception: z.array(z.string()),
  typography: TypographyStyleSchema,
  colorBehavior: ColorBehaviorSchema,
  composition: CompositionStyleSchema,
  spacing: SpacingStyleSchema,
  imageTreatment: ImageTreatmentSchema,
  texture: TextureStyleSchema,
  motion: MotionStyleSchema,
  shapeLanguage: ShapeLanguageSchema,
  photography: PhotographyStyleSchema,
  illustration: IllustrationStyleSchema,
  lighting: LightingStyleSchema,
  depth: DepthStyleSchema,
  contrast: ContrastStyleSchema,
  hierarchy: HierarchyStyleSchema,
  bestFor: z.array(z.string()),
  bestObjectives: z.array(z.string()),
  bestIndustries: z.array(z.string()),
  bestAudienceStates: z.array(z.string()),
  bestSituations: z.array(z.string()),
  compatibleVisualStructures: z.array(z.string()),
  compatibleStoryStructures: z.array(z.string()),
  compatibleCopyStructures: z.array(z.string()),
  compatibleMechanisms: z.array(z.string()),
  compatiblePsychology: z.array(z.string()),
  incompatibleStyles: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  risks: z.array(z.string()),
  antiPatterns: z.array(z.string()),
  ethicalBoundaries: z.array(z.string()),
  assetRequirements: z.array(AssetRequirementSchema),
  adaptability: StyleAdaptabilitySchema,
  evidence: z.array(EvidenceReferenceSchema),
  assumptions: z.array(z.string()),
  confidence: ConfidenceLevelSchema,
  status: z.enum(["ACTIVE", "EXPERIMENTAL", "DEPRECATED"]),
  relationships: z.array(RelationshipSchema),
});

export type StyleSystem = z.infer<typeof StyleSystemSchema>;

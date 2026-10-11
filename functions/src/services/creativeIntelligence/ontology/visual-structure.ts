import { z } from 'zod';
import { defineEntitySchema, stringList, ConfidenceLevelSchema, EntityRefSchema } from './ontology-types';

/**
 * VisualStructure – reusable visual communication architecture.
 * It describes composition, camera behavior, subject hierarchy, motion, transitions, text placement, and asset requirements.
 */
export const VisualStructureSchema = defineEntitySchema('visual_structure', {
  /** Human‑readable name */
  name: z.string().min(2),
  /** Category of visual structure (e.g., "hero", "transformation", "proof") */
  category: z.string().min(1),
  /** Brief definition of purpose */
  definition: z.string().min(20),
  /** High‑level visual idea */
  visualIdea: z.string().min(10),

  /** Composition model */
  composition: z.object({
    layoutType: z.enum([
      'centered',
      'split',
      'diagonal',
      'grid',
      'stacked',
      'layered',
      'fullBleed',
      'foregroundBackground',
      'sequence',
      'asymmetric',
      'modular',
      'freeform',
      'adaptive',
    ]),
    primaryZone: z.string().min(1),
    secondaryZones: z.array(z.string()).optional(),
    negativeSpaceStrategy: z.string().optional(),
    visualFlow: z.string().optional(),
    depthStrategy: z.string().optional(),
    alignmentLogic: z.string().optional(),
    hierarchyRule: z.string().optional(),
  }),

  /** Camera behavior */
  cameraBehavior: z.object({
    framing: z.enum([
      'wide',
      'medium',
      'close',
      'macro',
      'overhead',
      'POV',
      'environmental',
      'adaptive',
    ]),
    movement: z.enum([
      'static',
      'pushIn',
      'pullOut',
      'pan',
      'tilt',
      'tracking',
      'orbit',
      'handheld',
      'rackFocus',
      'mixed',
      'adaptive',
    ]),
    perspective: z.string().optional(),
    subjectTracking: z.string().optional(),
    cameraIntent: z.string().optional(),
  }),

  /** Subject hierarchy */
  subjectHierarchy: z.object({
    primarySubject: z.string().min(1),
    secondarySubjects: z.array(z.string()).optional(),
    contextualElements: z.array(z.string()).optional(),
    proofElements: z.array(z.string()).optional(),
    offerElements: z.array(z.string()).optional(),
    ctaElement: z.string().optional(),
    hierarchyRule: z.string().optional(),
  }),

  /** Spatial logic (optional) */
  spatialLogic: z.object({
    placementLogic: z.string().optional(),
    spacingRule: z.string().optional(),
    alignmentRule: z.string().optional(),
  }).optional(),

  /** Motion model */
  motion: z.object({
    entry: z.enum([
      'none',
      'fade',
      'slide',
      'scale',
      'reveal',
      'mask',
      'draw',
      'cut',
      'physical',
      'adaptive',
    ]),
    emphasis: z.enum([
      'none',
      'scale',
      'position',
      'opacity',
      'crop',
      'focus',
      'highlight',
      'adaptive',
    ]),
    exit: z.enum([
      'none',
      'fade',
      'slide',
      'cut',
      'reveal',
      'adaptive',
    ]),
    rhythm: z.string().optional(),
    motionPurpose: z.string().optional(),
    intensity: z.enum(['low', 'moderate', 'high', 'contextDependent']).optional(),
  }),

  /** Transition model */
  transitions: z.array(
    z.object({
      type: z.string().min(1),
      trigger: z.string().optional(),
      fromState: z.string().optional(),
      toState: z.string().optional(),
      visualRelationship: z.string().optional(),
      pacing: z.string().optional(),
      optional: z.boolean().optional(),
    })
  ).optional(),

  /** Text placement */
  textPlacement: z.object({
    placement: z.enum([
      'top',
      'bottom',
      'center',
      'side',
      'overlay',
      'split',
      'captionBand',
      'floating',
      'adaptive',
    ]),
    relationshipToSubject: z.string().optional(),
    maximumHierarchyLevels: z.number().int().positive().optional(),
    headlineRole: z.string().optional(),
    supportingTextRole: z.string().optional(),
    ctaRole: z.string().optional(),
    safeAreaRules: z.array(z.string()).optional(),
    readabilityConstraints: z.array(z.string()).optional(),
  }),

  /** Image requirements */
  imageRequirements: z.object({
    required: z.boolean(),
    imageTypes: z.array(
      z.enum([
        'product',
        'person',
        'environment',
        'food',
        'service',
        'beforeState',
        'afterState',
        'detail',
        'location',
        'process',
        'proof',
        'generated',
        'userGenerated',
      ])
    ),
    minimumAssets: z.number().int().min(0),
    preferredAssets: z.number().int().min(0).optional(),
    aspectRequirements: z.array(z.string()).optional(),
    cropTolerance: z.string().optional(),
    backgroundRequirements: z.string().optional(),
    authenticityRequirements: z.string().optional(),
  }),

  /** Video requirements */
  videoRequirements: z.object({
    required: z.boolean(),
    minimumClips: z.number().int().min(0),
    preferredClipTypes: z.array(z.string()).optional(),
    recommendedClipDurationRange: z.string().optional(),
    requiredActions: z.array(z.string()).optional(),
    cameraRequirements: z.array(z.string()).optional(),
    continuityRequirements: z.array(z.string()).optional(),
    transitionRequirements: z.array(z.string()).optional(),
    motionRequirements: z.array(z.string()).optional(),
  }).optional(),

  /** Asset requirements (generic) */
  assetRequirements: z.array(
    z.object({
      type: z.string().min(1),
      description: z.string().min(1).optional(),
    })
  ).optional(),

  informationDensity: z.enum(['low', 'medium', 'high', 'adaptive']).optional(),

  visualPacing: z.object({
    pace: z.enum(['slow', 'moderate', 'fast', 'variable', 'adaptive']).optional(),
    beatDensity: z.string().optional(),
    holdBehavior: z.string().optional(),
    escalationPattern: z.string().optional(),
    resetPattern: z.string().optional(),
  }).optional(),

  /** Compatibility */
  bestFormats: stringList().optional(),
  bestPlatforms: stringList().optional(),
  bestObjectives: stringList().optional(),
  bestIndustries: stringList().optional(),
  bestSituations: z.array(EntityRefSchema).optional(),
  compatibleMechanisms: z.array(EntityRefSchema).optional(),
  compatibleStoryStructures: z.array(EntityRefSchema).optional(),
  compatibleHooks: z.array(EntityRefSchema).optional(),
  compatiblePsychology: z.array(EntityRefSchema).optional(),
  supportsPrinciples: z.array(EntityRefSchema).optional(),

  strengths: stringList().optional(),
  weaknesses: stringList().optional(),
  worksWith: stringList().optional(),
  avoidWith: stringList().optional(),
  antiPatterns: z.array(EntityRefSchema).optional(),
  ethicalBoundaries: stringList().optional(),
  adaptability: z.object({ aspectRatioAdaptation: z.string().optional() }).optional(),
  evidence: z.array(z.string()).optional(),
  confidence: ConfidenceLevelSchema.optional(),
  assumptions: stringList().optional(),
  status: z.enum(['draft', 'active', 'deprecated', 'experimental']),
  relationships: z.array(
    z.object({
      type: z.string().min(1),
      target: EntityRefSchema,
    })
  ).optional(),
  failureLearning: z.array(
    z.object({
      visualStructureId: z.string(),
      context: z.string(),
      outcome: z.enum(['worked', 'failed', 'neutral', 'unexpected']),
      observedBehavior: z.string(),
      performanceSignal: z.string().optional(),
      explanationHypothesis: z.string().optional(),
      confidenceChange: z.string().optional(),
    })
  ).optional(),
});

export type VisualStructure = z.infer<typeof VisualStructureSchema>;

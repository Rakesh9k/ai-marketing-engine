import { z } from 'zod';
import { defineEntitySchema, stringList, ConfidenceLevelSchema, EntityRefSchema } from './ontology-types';

/**
 * CopyBeat – a single linguistic function within a copy grammar.
 */
export const CopyBeatSchema = z.object({
  order: z.number().int().min(1),
  name: z.string().min(2),
  function: z.string().min(2),
  required: z.boolean(),
  informationRole: z.enum([
    'attention', 'context', 'problem', 'empathy', 'claim', 'proof', 'benefit', 'outcome',
    'explanation', 'objection', 'offer', 'urgency', 'cta', 'transition', 'reflection',
    'lesson',
  ]),
  inputRequirements: z.array(z.string()).optional(),
  outputRequirement: z.string().min(1),
  proofRequirement: z.string().optional(),
  optionalConditions: z.array(z.string()).optional(),
  transitionToNext: z.string().optional(),
});
export type CopyBeat = z.infer<typeof CopyBeatSchema>;

/** Tone profile – defines linguistic voice characteristics. */
export const ToneProfileSchema = z.object({
  primary: z.string().min(1),
  secondary: z.array(z.string()).optional(),
  conversationalDistance: z.enum(['intimate', 'peer', 'professional', 'formal']),
  authorityLevel: z.enum(['low', 'moderate', 'high']),
  warmth: z.enum(['low', 'moderate', 'high']),
  linguisticCharacteristics: z.array(z.string()).optional(),
  avoidCharacteristics: z.array(z.string()).optional(),
});
export type ToneProfile = z.infer<typeof ToneProfileSchema>;

/** Sentence length and rhythm model. */
export const SentenceLengthProfileSchema = z.object({
  dominant: z.enum(['short', 'medium', 'long', 'mixed']),
  rhythm: z.enum(['staccato', 'flowing', 'balanced', 'variable', 'adaptive']),
  shortSentenceFrequency: z.string().optional(),
  longSentenceUsage: z.string().optional(),
  fragmentUsage: z.string().optional(),
  paragraphLength: z.string().optional(),
  punctuationStyle: z.string().optional(),
});
export type SentenceLengthProfile = z.infer<typeof SentenceLengthProfileSchema>;

/** Specificity profile – how concrete the language should be. */
export const SpecificityProfileSchema = z.object({
  level: z.enum(['low', 'moderate', 'high', 'contextDependent']),
  preferredEvidenceTypes: z.array(z.string()).optional(),
  preferredDetails: z.array(z.string()).optional(),
  numericalPrecision: z.string().optional(),
  sensoryDetail: z.string().optional(),
  contextualDetail: z.string().optional(),
  claimPrecision: z.string().optional(),
});
export type SpecificityProfile = z.infer<typeof SpecificityProfileSchema>;

/** Emotional intensity model. */
export const EmotionalIntensityProfileSchema = z.object({
  level: z.enum(['low', 'moderate', 'high', 'variable']),
  startingIntensity: z.string().min(1),
  peakIntensity: z.string().optional(),
  endingIntensity: z.string().min(1),
  emotionalDirection: z.string().optional(),
  acceptableEmotionalLanguage: z.array(z.string()).optional(),
  prohibitedEmotionalTactics: z.array(z.string()).optional(),
});
export type EmotionalIntensityProfile = z.infer<typeof EmotionalIntensityProfileSchema>;

/** Proof requirement model. */
export const ProofRequirementSchema = z.object({
  level: z.enum(['none', 'optional', 'recommended', 'required', 'strict']),
  requiredForClaims: z.boolean(),
  acceptableProofTypes: z.array(z.string()).optional(),
  prohibitedSubstitutions: z.array(z.string()).optional(),
  verificationRule: z.string().optional(),
});
export type ProofRequirement = z.infer<typeof ProofRequirementSchema>;

/** CTA style model. */
export const CTAStyleSchema = z.object({
  type: z.enum([
    'soft', 'direct', 'informational', 'exploratory', 'booking', 'purchase',
    'microCommitment', 'urgency', 'valueLed', 'contextual',
  ]),
  friction: z.enum(['low', 'moderate', 'high']),
  imperativeLevel: z.enum(['none', 'soft', 'moderate', 'strong']),
  valueFraming: z.string().optional(),
  urgency: z.string().optional(),
  examplesAsPatterns: z.array(z.string()).optional(),
});
export type CTAStyle = z.infer<typeof CTAStyleSchema>;

/** CopyGrammar – the main intelligence object. */
export const CopyGrammarSchema = defineEntitySchema('copy_structure', {
  category: z.string().min(1),
  purpose: z.string().min(1),
  sequence: z.array(CopyBeatSchema),
  tone: ToneProfileSchema,
  sentenceLength: SentenceLengthProfileSchema,
  specificity: SpecificityProfileSchema,
  emotionalIntensity: EmotionalIntensityProfileSchema,
  proofRequirement: ProofRequirementSchema,
  ctaStyle: CTAStyleSchema,
  bestFormats: stringList().optional(),
  bestPlatforms: stringList().optional(),
  bestObjectives: stringList().optional(),
  bestIndustries: stringList().optional(),
  bestSituations: z.array(EntityRefSchema).optional(),
  compatibleMechanisms: z.array(EntityRefSchema).optional(),
  compatibleStoryStructures: z.array(EntityRefSchema).optional(),
  compatibleVisualStructures: z.array(EntityRefSchema).optional(),
  compatiblePsychology: z.array(EntityRefSchema).optional(),
  strengths: stringList().optional(),
  weaknesses: stringList().optional(),
  worksWith: stringList().optional(),
  avoidWith: stringList().optional(),
  antiPatterns: z.array(EntityRefSchema).optional(),
  ethicalBoundaries: stringList().optional(),
  evidenceRequirements: z.array(z.string()).optional(),
  assumptions: stringList().optional(),
  evidence: z.array(z.string()).optional(),
  confidence: ConfidenceLevelSchema.optional(),
  relationships: z.array(
    z.object({ type: z.string().min(1), target: EntityRefSchema })
  ).optional(),
});
export type CopyGrammar = z.infer<typeof CopyGrammarSchema>;
export const CopyStructureSchema = CopyGrammarSchema;
export type CopyStructure = CopyGrammar;

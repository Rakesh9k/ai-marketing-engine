import { z } from 'zod';
import {
  defineEntitySchema,
  stringList,
  ConfidenceLevelSchema,
  ConstraintSchema,
  CulturalContextSchema,
  EntityRefSchema,
} from './ontology-types';

/**
 * Story Grammar – reusable narrative architecture.
 * Captures beats, timing, information density, emotional arc, and compatibility info.
 */
export const StoryGrammarSchema = defineEntitySchema('story_structure', {
  /** Category / taxonomy tag (e.g., "ProblemSolution", "Transformation") */
  category: z.string().optional(),
  /** Narrative beats – ordered sequence of building blocks */
  beats: z.array(
    z.object({
      /** Beat identifier – unique within this grammar */
      id: z.string().min(1),
      /** Human readable label */
      label: z.string().min(1),
      /** Description of the beat's intent */
      description: z.string().min(10),
      /** Ordering index – must be sequential */
      order: z.number().int().positive(),
      /** Optional list of required variables for this beat */
      requiredVariables: z.array(z.string()).optional(),
    })
  ).min(2),
  /** Timing bucket – how long the story typically runs (short/medium/long) */
  timing: z.enum(['short', 'medium', 'long']).optional(),
  /** Information density – how much detail is packed per beat */
  informationDensity: z.enum(['sparse', 'balanced', 'dense']).optional(),
  /** Emotional arc – overall feeling progression */
  emotionalArc: z.enum(['ascending', 'descending', 'flat', 'peaked']).optional(),
  /** Best suited content formats (e.g., video, carousel, blog) */
  bestFormats: stringList().optional(),
  /** Marketing objectives this grammar supports well */
  bestObjectives: stringList().optional(),
  /** Industries where the grammar shines */
  bestIndustries: stringList().optional(),
  /** Audience situations that map well */
  bestSituations: z.array(EntityRefSchema).optional(),
  /** Awareness stages (e.g., "awareness", "consideration", "decision") */
  bestAwarenessStages: stringList().optional(),
  /** Related psychology concepts */
  psychology: z.array(EntityRefSchema).optional(),
  /** Creative mechanisms that pair nicely */
  mechanisms: z.array(EntityRefSchema).optional(),
  /** Hook patterns compatible with this story */
  compatibleHooks: z.array(EntityRefSchema).optional(),
  /** Insight patterns that complement this story */
  compatibleInsights: z.array(EntityRefSchema).optional(),
  /** Other story structures this can compose with */
  compatibleStructures: z.array(EntityRefSchema).optional(),
  /** Variables that can be injected into beats */
  variables: z.array(
    z.object({
      /** Variable name */
      name: z.string().min(1),
      /** Human readable description */
      description: z.string().min(5),
      /** Expected type (string, number, boolean, enum) */
      type: z.enum(['string', 'number', 'boolean', 'enum']).optional(),
      /** Enum options if type is enum */
      enumValues: z.array(z.string()).optional(),
      /** Default value */
      default: z.any().optional(),
    })
  ).optional(),
  /** Strengths of the grammar */
  strengths: stringList().optional(),
  /** Weaknesses or edge cases */
  weaknesses: stringList().optional(),
  /** Known risks (e.g., cultural sensitivity) */
  risks: stringList().optional(),
  /** Anti‑patterns to avoid */
  antiPatterns: stringList().optional(),
  /** Ethical boundaries – disallow deceptive claims */
  ethicalBoundaries: stringList().optional(),
  /** Compatibility matrix entries – reference IDs of other entities */
  compatibleWith: z.array(EntityRefSchema).optional(),
  /** Situations where this grammar should be avoided */
  avoidWith: z.array(EntityRefSchema).optional(),
  /** Evidence or research supporting effectiveness */
  evidence: stringList().optional(),
  /** Confidence level of the data */
  confidence: ConfidenceLevelSchema.optional(),
  /** Assumptions made when using this grammar */
  assumptions: stringList().optional(),
  /** Relationships to other ontology entities */
  relationships: z.array(z.object({
    type: z.string(),
    target: EntityRefSchema,
  })).optional(),
  /** Additional constraints */
  constraints: z.array(ConstraintSchema).optional(),
  /** Cultural context tags */
  culturalContexts: z.array(CulturalContextSchema).optional(),
});

export type StoryGrammar = z.infer<typeof StoryGrammarSchema>;
export const StoryStructureSchema = StoryGrammarSchema;
export type StoryStructure = StoryGrammar;

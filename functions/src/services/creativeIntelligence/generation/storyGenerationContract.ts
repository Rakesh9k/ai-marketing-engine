import { z } from 'zod';

/**
 * Input contract for generating a full story narrative using Gemini.
 * Mirrors the HookPattern generation contract – includes all upstream context.
 */
export const StoryGenerationInputSchema = z.object({
  /** Business context – product, brand, offer details */
  businessContext: z.object({
    brandName: z.string(),
    productName: z.string(),
    offerDescription: z.string().optional(),
    // additional fields can be added as needed
  }),

  /** Audience situation providing the real‑world circumstance */
  audienceSituation: z.object({
    situationId: z.string(), // reference to an AudienceSituation entity
    variables: z.record(z.any()).optional(),
  }),

  /** Insight pattern that explains behavior */
  insightPattern: z.object({
    insightId: z.string(), // reference to InsightPattern entity
    variables: z.record(z.any()).optional(),
  }),

  /** Marketing objective (e.g., awareness, conversion) */
  marketingObjective: z.string(),

  /** Psychological concepts relevant to the story */
  psychology: z.array(z.string()).optional(), // array of Psychology entity IDs

  /** Creative mechanism (e.g., storytelling, testimonial) */
  creativeMechanism: z.string().optional(),

  /** Hook pattern that will open the story – optional but useful for alignment */
  hookPattern: z.object({
    hookId: z.string(), // reference to HookPattern entity
    variables: z.record(z.any()).optional(),
  }).optional(),

  /** Selected story grammar to drive narrative structure */
  storyGrammar: z.object({
    grammarId: z.string(), // reference to StoryGrammar entity
    variables: z.record(z.any()).optional(),
  }),

  /** Variable payload – all variables needed by the story grammar, hook, etc. */
  variables: z.record(z.any()),

  /** Desired output format (e.g., "short", "medium", "long") */
  outputLength: z.enum(['short', 'medium', 'long']).optional(),

  /** Platform where the story will be deployed (e.g., "facebook", "instagram", "website") */
  platform: z.string().optional(),

  /** Ethical constraints – list of prohibited statements the generator must avoid */
  ethicalConstraints: z.array(z.string()).optional(),
});

/** Output contract returned by Gemini after story generation */
export const StoryGenerationOutputSchema = z.object({
  /** The fully‑rendered story copy */
  storyCopy: z.string(),
  /** Optional structured representation of beats with populated variables */
  beats: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      content: z.string(),
    })
  ),
  /** Any warnings generated during generation (e.g., ethical boundary hits) */
  warnings: z.array(z.string()).optional(),
  /** Confidence score from Gemini (0‑1) */
  confidence: z.number().min(0).max(1).optional(),
});

export type StoryGenerationInput = z.infer<typeof StoryGenerationInputSchema>;
export type StoryGenerationOutput = z.infer<typeof StoryGenerationOutputSchema>;

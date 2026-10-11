import { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * PLATFORM — where communication is consumed. Platform characteristics change quickly: they are described as
 * qualities of an environment, never as permanent psychological truths or fixed technical specifications.
 */
export const PlatformSchema = defineEntitySchema('platform', {
  attentionEnvironment: z.string().min(5),
  interactionModel: z.string().min(5),
  contentExpectations: stringList(),
  ctaCapabilities: stringList(),
  audienceContext: stringList(),
});
export type Platform = z.infer<typeof PlatformSchema>;

import { z } from 'zod';
import { defineEntitySchema } from './ontology-types';

/** FORMAT — the communication container (static image, carousel, short-form reel, story …). Not a file spec. */
export const FormatSchema = defineEntitySchema('format', {
  communicationContainer: z.string().min(10),
  interactionModel: z.string().min(5),
});
export type Format = z.infer<typeof FormatSchema>;

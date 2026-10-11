import { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * HUMAN MOTIVATION — why a person cares (convenience, relief, belonging, status …). Distinct from psychology:
 * "convenience" is a motivation; "cognitive load reduction" is the psychological principle that can serve it.
 * Added to the Phase 10.1 type list because the reasoning hierarchy requires it (Principles §5 L2).
 */
export const HumanMotivationSchema = defineEntitySchema('human_motivation', {
  /** The want or need, in plain terms, independent of any product. */
  underlyingNeed: z.string().min(5),
  typicalTriggers: stringList(),
  ethicalConsiderations: stringList(),
});
export type HumanMotivation = z.infer<typeof HumanMotivationSchema>;

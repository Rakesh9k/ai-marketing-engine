import { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * ANTI-PATTERN — a known pattern to avoid under stated conditions. Always explainable: "bad creative" is not an
 * anti-pattern. Deception (fake scarcity, fabricated proof …) is `ethical_prohibition` and is never recommended
 * under any condition; the rest are `effectiveness_risk` (context-dependent).
 */
export const AntiPatternSchema = defineEntitySchema('anti_pattern', {
  kind: z.enum(['ethical_prohibition', 'effectiveness_risk']),
  whatItIs: z.string().min(10),
  whyProblematic: z.string().min(10),
  whenProblematic: stringList(1),
  alternatives: stringList(),
  ethicalConsiderations: stringList(),
});
export type AntiPattern = z.infer<typeof AntiPatternSchema>;

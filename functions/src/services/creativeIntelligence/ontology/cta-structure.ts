import { z } from 'zod';
import { DECISION_STAGES, defineEntitySchema, stringList } from './ontology-types';

/**
 * CTA STRUCTURE — the reusable LOGIC of asking for the next action: how it relates to friction, readiness,
 * decision stage and offer. "Order now" is the low-friction direct logic; "invite a conversation" is the
 * high-friction uncertainty-reducing logic. Never a finished button label.
 */
export const CtaStructureSchema = defineEntitySchema('cta_structure', {
  actionLogic: z.string().min(10),
  frictionLevel: z.enum(['low', 'medium', 'high', 'any']),
  readinessConditions: stringList(),
  suitableDecisionStages: z.array(z.enum(DECISION_STAGES)),
});
export type CtaStructure = z.infer<typeof CtaStructureSchema>;

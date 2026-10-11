import { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * MARKETING PRINCIPLE — reusable strategic direction ("reduce perceived risk", "make the decision easier").
 * Broader than a creative idea; never a finished campaign instruction.
 */
export const MarketingPrincipleSchema = defineEntitySchema('marketing_principle', {
  strategicPurpose: z.string().min(10),
  /** Open vocabulary until Phase 10.5/10.8 (e.g. "conversion", "awareness"). */
  applicableObjectives: stringList(1),
  compatibleAudienceConditions: stringList(),
  incompatibleConditions: stringList(),
});
export type MarketingPrinciple = z.infer<typeof MarketingPrincipleSchema>;

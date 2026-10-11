import type { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * OFFER MECHANISM — a reusable way of structuring or communicating an offer (bundle, starter offer, trial …).
 * Urgency or scarcity is never assumed appropriate: it requires a verified truthful precondition, and the
 * deceptive variants are anti-patterns.
 */
export const OfferMechanismSchema = defineEntitySchema('offer_mechanism', {
  businessConditions: stringList(1),
  customerConditions: stringList(),
  risks: stringList(),
  ethicalConstraints: stringList(1),
  truthfulPreconditions: stringList(),
});
export type OfferMechanism = z.infer<typeof OfferMechanismSchema>;

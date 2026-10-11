// Offer Generation Contract – defines the hand‑off from Offer Intelligence to downstream layers

import { OfferBlueprintSchema } from "../ontology/offer-structure";
import { z } from "zod";

// The contract used by the generation engine to produce concrete offer implementations.
// It extends the OfferBlueprint schema with runtime‑specific fields that will be populated
// during the reasoning process.

export const OfferGenerationContractSchema = OfferBlueprintSchema.extend({
  // Runtime selections made by the reasoning engine
  selectedComponents: z.array(z.string()), // IDs of OfferComponent objects selected for this offer
  priceAdjusted: z.boolean().default(false), // true if priceReduction lever is applied
  communicationStrategy: z.string().optional(), // e.g., "perPersonFraming", "valueComparison"
  proofDocuments: z.array(z.string()).optional(), // IDs of verified evidence documents
});

export type OfferGenerationContract = z.infer<typeof OfferGenerationContractSchema>;

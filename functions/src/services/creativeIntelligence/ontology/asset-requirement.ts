import { z } from 'zod';
import { defineEntitySchema, stringList } from './ontology-types';

/**
 * ASSET REQUIREMENT — a KIND of asset an execution needs (before image, human subject, product close-up).
 * Never an actual asset or file. Which mechanisms/structures require it is expressed as `requires` relationships.
 */
export const AssetRequirementSchema = defineEntitySchema('asset_requirement', {
  assetType: z.enum(['image', 'video', 'audio', 'graphic', 'text', 'document', 'human_subject']),
  /** Acceptable substitutes when the asset is unavailable (e.g. a staged transformation). */
  substitutionOptions: stringList(),
  qualityRequirements: stringList(),
  privacyRequirements: stringList(),
});
export type AssetRequirement = z.infer<typeof AssetRequirementSchema>;

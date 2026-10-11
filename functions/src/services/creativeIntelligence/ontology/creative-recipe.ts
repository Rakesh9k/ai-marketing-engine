import { z } from 'zod';
import { defineEntitySchema, idList, stringList } from './ontology-types';

/**
 * CREATIVE RECIPE — the highest-level reusable composition: a structured REASONING recipe that references ontology
 * objects BY ID. It is not a finished creative and must be able to yield many executions.
 * The schema is strict and accepts only id lists, so an embedded copy of an object is rejected, not tolerated.
 * A recipe must name at least one marketing principle and one mechanism: without them it is a list of tastes.
 */
export const CreativeRecipeSchema = defineEntitySchema('creative_recipe', {
  purpose: z.string().min(10),
  audienceSituationIds: idList(),
  insightPatternIds: idList(),
  /** Open vocabulary until Phase 10.8 (objective / condition labels). */
  objectiveConditions: stringList(),
  psychologyIds: idList(),
  motivationIds: idList(),
  principleIds: idList(1),
  mechanismIds: idList(1),
  offerMechanismIds: idList(),
  hookPatternIds: idList(),
  storyStructureIds: idList(),
  copyStructureIds: idList(),
  visualStructureIds: idList(),
  ctaStructureIds: idList(),
  styleSystemIds: idList(),
  formatIds: idList(),
  platformIds: idList(),
  assetRequirementIds: idList(),
  combinationRuleIds: idList(),
  antiPatternIds: idList(),
});
export type CreativeRecipe = z.infer<typeof CreativeRecipeSchema>;

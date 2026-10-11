import { z } from 'zod';
import { EntityRefSchema, defineEntitySchema } from './ontology-types';

/**
 * COMBINATION RULE — a declarative statement about what combines well or badly, with its reason. It is DATA for a
 * future recommendation engine (Phase 10.12), not an engine: nothing here evaluates anything.
 *
 *   IF mechanism = choice_simplification AND motivation = convenience AND decision_complexity = high
 *   THEN strong_candidate / recommend three-choice structure   BECAUSE …
 */
export const COMBINATION_RELATIONS = [
  'supports',
  'compatibleWith',
  'requires',
  'conflictsWith',
  'weakens',
  'strengthens',
  'conditionalOn',
  'notRecommendedWith',
] as const;

export const COMBINATION_OUTCOMES = [
  'strong_candidate',
  'potentially_compatible',
  'recommend_target',
  'potential_conflict',
  'not_recommended',
] as const;

/** A condition is either "this ontology object is part of the combination" or "this context value holds". */
export const CombinationConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('entity'), ref: EntityRefSchema }).strict(),
  z
    .object({
      kind: z.literal('context'),
      dimension: z.string().min(1),
      operator: z.enum(['is', 'isNot', 'in']),
      values: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);
export type CombinationCondition = z.infer<typeof CombinationConditionSchema>;

export const CombinationRuleSchema = defineEntitySchema('combination_rule', {
  relation: z.enum(COMBINATION_RELATIONS),
  /** ALL must hold for the rule to apply. At least one entity condition ties the rule to the ontology. */
  when: z.array(CombinationConditionSchema).min(1),
  outcome: z.enum(COMBINATION_OUTCOMES),
  /** Objects the outcome points at (e.g. the structure to recommend, or the objects in conflict). */
  targets: z.array(EntityRefSchema),
  /** Mandatory explanation: a rule that cannot say why does not enter the ontology. */
  because: z.string().min(15),
});
export type CombinationRule = z.infer<typeof CombinationRuleSchema>;

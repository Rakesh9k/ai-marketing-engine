/**
 * Values Mitra stores in a new Business Brain when the owner has not said anything. They exist so the
 * Brain is structurally complete, NOT because the owner chose them, so a generation model must never read
 * them as business facts (see brainForGeneration). Kept in one place so creation and the filter cannot drift.
 */
export const DEFAULT_BRAIN_AGE_RANGE = { min: 18, max: 65 } as const;

export const isDefaultBrainAgeRange = (range: unknown): boolean =>
  !!range &&
  typeof range === 'object' &&
  (range as { min?: unknown }).min === DEFAULT_BRAIN_AGE_RANGE.min &&
  (range as { max?: unknown }).max === DEFAULT_BRAIN_AGE_RANGE.max;

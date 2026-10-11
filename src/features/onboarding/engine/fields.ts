/**
 * Browser copy of the draft field registry. The authoritative one (with value schemas) lives in
 * functions/src/onboarding/draftFields.ts; the two packages cannot import each other, so
 * tests/onboardingDraftParity.test.ts fails if these lists drift.
 */
export const DRAFT_FIELD_PATHS = [
  'owner.name',
  'owner.role',
  'identity.industry',
  'identity.subcategory',
  'identity.name',
  'identity.city',
  'identity.state',
  'contact.whatsapp',
  'offering.signature',
  'audience.primary',
  'positioning.usp',
] as const;
export type DraftFieldPath = (typeof DRAFT_FIELD_PATHS)[number];

export const INDUSTRY_IDS = [
  'restaurant_food',
  'salon_beauty',
  'real_estate',
  'retail',
  'professional_services',
  'health_wellness',
  'education',
  'fitness',
  'hospitality',
  'home_services',
  'other',
] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];

export const OWNER_ROLE_IDS = [
  'owner',
  'founder',
  'manager',
  'marketing',
  'team_member',
  'other',
] as const;

/** A fact is either one value or a short list of the owner's own words. */
export type FactValue = string | string[];

/** What Mitra currently knows, path -> value. Only confirmed facts ever land here. */
export type Known = Partial<Record<DraftFieldPath, FactValue>>;

/**
 * What Mitra has found or guessed but the owner has NOT confirmed. Never counts as known: it is
 * only ever offered back to the owner as a suggestion to accept, change, or ignore.
 */
export type Suggestions = Partial<Record<DraftFieldPath, FactValue>>;

export const encodePath = (path: string): string => path.replace(/\./g, '__');
export const decodePath = (key: string): string => key.replace(/__/g, '.');

/** Convenience for the many single-value fields. */
export const asString = (value: FactValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const asList = (value: FactValue | undefined): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

/**
 * Answers built on another answer: changing the parent discards these so a stale child never
 * outlives its parent. Mirrors DEPENDENT_FIELDS on the server (parity-tested).
 */
export const DEPENDENT_FIELDS: Partial<Record<DraftFieldPath, DraftFieldPath[]>> = {
  'identity.industry': ['identity.subcategory', 'offering.signature', 'audience.primary'],
  'identity.subcategory': ['offering.signature'],
};

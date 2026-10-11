import { z } from 'zod';
import type { BusinessCategory } from '../types';
import { isValidPhone } from './phone';

/**
 * The closed set of facts an onboarding draft may hold. The draft is the *construction layer* for
 * the Business Brain (user input / AI discovery -> draft -> normalized Business Brain -> user
 * confirmation -> business), so every path here names the Brain slot it will eventually feed.
 * It is deliberately NOT a free-form bag: an unknown path is rejected, so the draft cannot grow
 * into a second, drifting data model next to `businessBrain` / `brand_kits`.
 *
 * The browser has its own copy of the path list (src/features/onboarding/engine/fields.ts) because
 * the two packages cannot import each other; tests/onboardingDraftParity.test.ts fails if they drift.
 */

export const INDUSTRIES = [
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
export type Industry = (typeof INDUSTRIES)[number];

export const OWNER_ROLES = [
  'owner',
  'founder',
  'manager',
  'marketing',
  'team_member',
  'other',
] as const;

/**
 * Industries that map onto a campaign-generation vertical Mitra implements today. Every other
 * industry is still fully understood (identity/audience/brand/positioning) but has no specialised
 * vertical yet, so this is `null` rather than a guess — Phase H decides how `createBusiness`
 * represents that. Never silently coerce to 'restaurant'.
 */
export const INDUSTRY_TO_VERTICAL: Record<Industry, BusinessCategory | null> = {
  restaurant_food: 'restaurant',
  salon_beauty: 'salon',
  real_estate: 'real_estate',
  retail: null,
  professional_services: null,
  health_wellness: null,
  education: null,
  fitness: null,
  hospitality: null,
  home_services: null,
  other: null,
};

const text = (max: number) => z.string().trim().min(1).max(max);

/** A short list of the owner's own words: trimmed, de-duplicated (case-insensitive), capped. */
const list = (maxItems: number, maxLength: number) =>
  z
    .array(text(maxLength))
    .min(1)
    .max(maxItems * 2) // tolerate duplicates in the request; the cap applies after de-duplication
    .transform((items) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })
    .refine((items) => items.length <= maxItems, `At most ${maxItems} items`);

/** path -> value schema. Add a path here only together with the question(s) that collect it. */
export const DRAFT_FIELDS = {
  'owner.name': text(60),
  'owner.role': z.enum(OWNER_ROLES),
  'identity.industry': z.enum(INDUSTRIES),
  // A taxonomy option id, or the owner's own words when they pick "Other" (custom answer).
  'identity.subcategory': text(80),
  'identity.name': text(100),
  'identity.city': text(80),
  'identity.state': text(80),
  // The product's call-to-action channel. Stored as the owner typed it; normalised to E.164 when the
  // business is created (see onboarding/phone.ts), and rejected here if it cannot be.
  'contact.whatsapp': z.string().trim().max(25).refine(isValidPhone, 'Enter a valid mobile number'),
  'offering.signature': list(5, 60),
  'audience.primary': list(5, 40),
  'positioning.usp': text(300),
} as const;

export type DraftFieldPath = keyof typeof DRAFT_FIELDS;

export function isDraftFieldPath(path: string): path is DraftFieldPath {
  return Object.prototype.hasOwnProperty.call(DRAFT_FIELDS, path);
}

export const DRAFT_FIELD_PATHS = Object.keys(DRAFT_FIELDS) as DraftFieldPath[];

/**
 * Answers built on another answer. Changing the parent clears these so a stale child never
 * outlives its parent (e.g. switching industry discards the old subcategory and its offerings).
 */
export const DEPENDENT_FIELDS: Partial<Record<DraftFieldPath, DraftFieldPath[]>> = {
  'identity.industry': ['identity.subcategory', 'offering.signature', 'audience.primary'],
  'identity.subcategory': ['offering.signature'],
};

/**
 * Subcategories where customers order from afar rather than walk in. Mirrors the browser's
 * DELIVERY_FIRST_SUBCATEGORIES (parity-tested). A business of one of these types is created as
 * delivery-first, so its copy is never allowed to claim dine-in service by default.
 */
export const DELIVERY_FIRST_SUBCATEGORIES = ['cloud_kitchen', 'tiffin_centre', 'catering'];

/** Facts without which a draft cannot become a business. Parity-tested against the question list. */
export const REQUIRED_FIELDS: DraftFieldPath[] = [
  'owner.name',
  'identity.industry',
  'identity.subcategory',
  'identity.name',
  'identity.city',
  'identity.state',
  'contact.whatsapp',
];

import {
  createBusinessSchema,
  type BrainExtras,
  type CreateBusinessData,
} from '../services/businessCreation';
import type { BrainFactSource, BrainKnowledge } from '../types';
import { DELIVERY_FIRST_SUBCATEGORIES } from './draftFields';
import type { NormalizedDraft } from './draftModel';
import { normalizePhone } from './phone';

/**
 * The trust boundary between "what the owner told Mitra" and "what becomes a business".
 *
 *   owner-confirmed draft → normalizeDraft → toBusinessCreation → createBusinessSchema → create
 *
 * `createBusiness` machinery only ever receives the OUTPUT of this function: validated, normalised,
 * owner-confirmed facts. It never receives the raw draft, an unconfirmed guess, or anything a
 * browser supplied directly. Everything is validated by the same `createBusinessSchema` the public
 * callable uses, so this path cannot create a business that path would refuse.
 */

export class BrainMappingError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'BrainMappingError';
  }
}

/**
 * The Brain slots Mitra fills in itself for a conversationally-onboarded business, because that conversation never
 * asks for them (language, style, tone, colours, fonts, audience age, slang, mixing). They keep the Brain complete
 * for the UI and the renderer, but the owner never said them, so each is recorded as SYSTEM_DEFAULT: nothing
 * downstream may read them as business facts (generation drops them; the wizard does not treat them as a choice).
 * Keep in step with buildBusiness (businessCreation.ts); a test asserts every path here holds a value.
 */
export const SYSTEM_DEFAULT_PATHS: string[] = [
  'localization.primaryLanguage',
  'localization.secondaryLanguage',
  'localization.regionalStyle',
  'localization.slangIntensity',
  'localization.languageMixing',
  'brand.tone',
  'brand.colors',
  'brand.fonts',
  'audience.ageRange',
];

export interface BusinessCreationPlan {
  data: CreateBusinessData;
  extras: BrainExtras;
}

/**
 * @param explicitPhone a separate phone number the owner explicitly provided, if any. Onboarding does
 *   not ask for one, so today this is always undefined and the phone is derived from WhatsApp — but
 *   when an explicit number exists it replaces the derived one and is recorded as the owner's own.
 */
export function toBusinessCreation(
  normalized: NormalizedDraft,
  now: string,
  explicitPhone?: string
): BusinessCreationPlan {
  if (!normalized.ready) {
    throw new BrainMappingError(`Draft is missing: ${normalized.missing.join(', ')}`);
  }
  const { owner, identity, contact, offering, audience, positioning } = normalized;

  const whatsapp = contact.whatsapp ? normalizePhone(contact.whatsapp) : null;
  if (!whatsapp) throw new BrainMappingError('WhatsApp number is not valid', 'contact.whatsapp');

  let phone = whatsapp;
  let phoneSource: BrainFactSource = 'DERIVED_FROM_WHATSAPP';
  if (explicitPhone) {
    const explicit = normalizePhone(explicitPhone);
    if (!explicit) throw new BrainMappingError('Phone number is not valid', 'contact.phone');
    phone = explicit;
    phoneSource = 'USER_CONFIRMED';
  }

  // `general` is a real vertical, not a fallback for "unsupported": see config/verticals.ts.
  const category = identity.vertical ?? 'general';

  // A delivery-first business (cloud kitchen, tiffin centre, caterer) is created as delivery-first,
  // so its copy is never allowed to claim dine-in service just because that is the default.
  const deliveryFirst =
    identity.industry === 'restaurant_food' &&
    DELIVERY_FIRST_SUBCATEGORIES.includes(identity.subcategory ?? '');

  // The same schema the public createBusiness callable enforces — this is the "validate" step.
  const data = createBusinessSchema.parse({
    name: identity.name,
    category,
    location: { city: identity.city, state: identity.state },
    contact: { phone, whatsapp },
    language: 'en',
    regionalStyle: 'neutral',
    ...(deliveryFirst ? { operatingMode: 'delivery' } : {}),
  });

  // Provenance, one entry per fact the Brain holds. Only owner-confirmed facts get this far, so
  // nothing here is a guess — and a value the owner did not type is never labelled as theirs.
  const facts: BrainKnowledge['facts'] = {};
  const confirmed: Array<[string, unknown]> = [
    ['owner.name', owner.name],
    ['owner.role', owner.role],
    ['identity.industry', identity.industry],
    ['identity.subcategory', identity.subcategory],
    ['identity.name', identity.name],
    ['identity.city', identity.city],
    ['identity.state', identity.state],
    ['contact.whatsapp', contact.whatsapp],
    ['offering.signature', offering.signature],
    ['audience.primary', audience.primary],
    ['positioning.usp', positioning.usp],
  ];
  for (const [path, value] of confirmed) {
    if (value !== undefined) facts[path] = { source: 'USER_CONFIRMED' };
  }
  for (const path of SYSTEM_DEFAULT_PATHS) facts[path] = { source: 'SYSTEM_DEFAULT' };
  facts['contact.phone'] = { source: phoneSource };
  if (deliveryFirst) facts['businessRules.operatingMode'] = { source: 'DERIVED_FROM_SUBCATEGORY' };

  return {
    data,
    extras: {
      industry: identity.industry,
      subcategory: identity.subcategory,
      owner: { name: owner.name, role: owner.role },
      offerings: offering.signature ? { signature: offering.signature } : undefined,
      audiencePrimary: audience.primary,
      usp: positioning.usp,
      knowledge: { origin: 'conversational_onboarding', confirmedAt: now, facts },
    },
  };
}

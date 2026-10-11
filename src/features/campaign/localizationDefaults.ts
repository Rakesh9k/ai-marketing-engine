import type { LanguageCode, RegionalStyle } from '@/types';

/**
 * What to assume for a business that has stated no language or regional style.
 *
 * Telugu + Hyderabadi only for a business that is actually in Hyderabad / Telangana. Everyone else is English
 * and region-neutral. These defaults used to be Telugu + Hyderabadi for every business (the wizard's quick-idea
 * presets, the Business Brain editor and its service), which turned an owner with no stated preference, or a
 * Mumbai owner, into a Telugu ad.
 */
export function defaultLocalizationFor(location?: { city?: string; state?: string } | null): {
  primaryLanguage: LanguageCode;
  regionalStyle: RegionalStyle;
} {
  const inHyderabad =
    /telangana/i.test(location?.state ?? '') ||
    /hyderabad|secunderabad/i.test(location?.city ?? '');
  return inHyderabad
    ? { primaryLanguage: 'te_en', regionalStyle: 'hyderabadi' }
    : { primaryLanguage: 'en', regionalStyle: 'neutral' };
}

/** The secondary language follows the primary: a legacy record can carry a stale "te" next to "en". */
export function secondaryLanguageFor(primary?: LanguageCode | null): LanguageCode {
  return primary === 'te_en' ? 'te' : primary === 'hi_en' ? 'hi' : 'en';
}

const LANGUAGE_CODES: readonly LanguageCode[] = ['en', 'hi', 'hi_en', 'te', 'te_en'];
const REGIONAL_STYLE_CODES: readonly RegionalStyle[] = [
  'neutral',
  'hyderabadi',
  'telangana',
  'mumbai',
  'bangalore',
  'delhi',
  'chennai',
  'kolkata',
];

/**
 * A stored language is understood as it is. It used to be collapsed to English unless it was en / te /
 * te_en, which turned a Hinglish owner's stored "hi_en" into "en". Only a value that is not a language at
 * all is dropped (undefined), and the caller then uses the place default.
 */
export function normalizeLanguage(value?: string | null): LanguageCode | undefined {
  return LANGUAGE_CODES.find((code) => code === value);
}

/** Same for the regional style: a stored "mumbai" stays "mumbai". */
export function normalizeRegionalStyle(value?: string | null): RegionalStyle | undefined {
  return REGIONAL_STYLE_CODES.find((style) => style === value);
}

/** The regional style that belongs to where the business is, if the place is one we have a style for. */
export function regionalStyleForPlace(
  location?: { city?: string; state?: string } | null
): RegionalStyle | undefined {
  const city = (location?.city ?? '').toLowerCase();
  if (/hyderabad|secunderabad/.test(city)) return 'hyderabadi';
  if (/mumbai|navi mumbai|thane/.test(city)) return 'mumbai';
  if (/delhi|noida|gurugram|gurgaon/.test(city)) return 'delhi';
  if (/bengaluru|bangalore/.test(city)) return 'bangalore';
  if (/chennai/.test(city)) return 'chennai';
  if (/kolkata|calcutta/.test(city)) return 'kolkata';
  if (/telangana/i.test(location?.state ?? '')) return 'telangana';
  return undefined;
}

/**
 * The regional styles to offer, driven by the language and the business's place rather than a fixed pair:
 * Neutral first, then the styles that fit the language (Telugu -> Hyderabadi / Telangana; Hindi and Hinglish
 * -> Mumbai / Delhi), then the style of the business's own city, then whatever the owner already has stored
 * (so a stored preference is always understood). A Mumbai owner is never offered Hyderabadi unless it is
 * what they stored.
 */
export function regionalStylesFor(options: {
  language?: LanguageCode;
  location?: { city?: string; state?: string } | null;
  stored?: RegionalStyle;
}): RegionalStyle[] {
  const { language, location, stored } = options;
  const byLanguage: RegionalStyle[] =
    language === 'te' || language === 'te_en'
      ? ['hyderabadi', 'telangana']
      : language === 'hi' || language === 'hi_en'
        ? ['mumbai', 'delhi']
        : [];
  const placeStyle = regionalStyleForPlace(location);
  const ordered: RegionalStyle[] = [
    'neutral',
    ...byLanguage,
    ...(placeStyle ? [placeStyle] : []),
    ...(stored ? [stored] : []),
  ];
  return [...new Set(ordered)];
}

/**
 * The language and style the OWNER stated, as opposed to what Mitra stored for them. A Brain created by the
 * conversational onboarding holds 'en' / 'neutral' because that conversation never asks for a language: it is
 * a placeholder, and treating it as the owner's choice would pin a Hyderabad owner to English forever. Such a
 * value only counts when its provenance says the owner confirmed it. Older Brains carry no provenance and are
 * understood as stored.
 */
export function ownerStatedLocalization(
  brain?: {
    localization?: { primaryLanguage?: string; regionalStyle?: string } | null;
    knowledge?: { origin?: string; facts?: Record<string, unknown> } | null;
  } | null
): { primaryLanguage?: LanguageCode; regionalStyle?: RegionalStyle } {
  const stored = brain?.localization;
  if (!stored) return {};
  const fromOnboarding = brain?.knowledge?.origin === 'conversational_onboarding';
  const facts = (brain?.knowledge?.facts ?? {}) as Record<string, { source?: string } | undefined>;
  // The owner's own choice: recorded as anything other than SYSTEM_DEFAULT. An onboarding Brain with no record at all
  // (written before SYSTEM_DEFAULT existed) holds the placeholder too.
  const stated = (path: string) => {
    const source = facts[path]?.source;
    return source ? source !== 'SYSTEM_DEFAULT' : !fromOnboarding;
  };
  return {
    primaryLanguage: stated('localization.primaryLanguage')
      ? normalizeLanguage(stored.primaryLanguage)
      : undefined,
    regionalStyle: stated('localization.regionalStyle')
      ? normalizeRegionalStyle(stored.regionalStyle)
      : undefined,
  };
}

/** The age range Mitra stores in every new Business Brain (mirrors functions/src/config/brainDefaults.ts). */
export function isPlaceholderAgeRange(range?: { min?: number; max?: number } | null): boolean {
  return range?.min === 18 && range?.max === 65;
}

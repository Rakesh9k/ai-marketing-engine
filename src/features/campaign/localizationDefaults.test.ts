import {
  defaultLocalizationFor,
  ownerStatedLocalization,
  secondaryLanguageFor,
} from './localizationDefaults';

/**
 * The wizard's quick-idea presets used to force Telugu + Hyderabadi on every business, and the Business
 * Brain editor and service fell back to Telugu for any owner with nothing stored. Defaults now follow the
 * business's own place, and anything else is English and region-neutral.
 */
describe('default localisation for a business with no stated preference', () => {
  it.each([
    [{ city: 'Hyderabad', state: 'Telangana' }],
    [{ city: 'Hyderabad' }],
    [{ state: 'Telangana' }],
    [{ city: 'Secunderabad', state: 'telangana' }],
  ])('%j is Hyderabad: Telugu + English, Hyderabadi', (location) => {
    expect(defaultLocalizationFor(location)).toEqual({
      primaryLanguage: 'te_en',
      regionalStyle: 'hyderabadi',
    });
  });

  it.each([
    [{ city: 'Mumbai', state: 'Maharashtra' }],
    [{ city: 'Pune', state: 'Maharashtra' }],
    [{ city: 'Delhi', state: 'Delhi' }],
    [{}],
    [undefined],
  ])('%j is English and region-neutral, never Telugu', (location) => {
    expect(defaultLocalizationFor(location)).toEqual({
      primaryLanguage: 'en',
      regionalStyle: 'neutral',
    });
  });
});

describe('the secondary language follows the primary', () => {
  it.each([
    ['te_en', 'te'],
    ['hi_en', 'hi'],
    ['en', 'en'],
    ['te', 'en'],
    ['hi', 'en'],
    [undefined, 'en'],
  ])('%s -> %s', (primary, secondary) => {
    expect(secondaryLanguageFor(primary as never)).toBe(secondary);
  });
});

describe('ownerStatedLocalization: a placeholder is not a preference', () => {
  const onboarded = (facts: Record<string, unknown> = {}) => ({
    localization: { primaryLanguage: 'en', regionalStyle: 'neutral' },
    knowledge: { origin: 'conversational_onboarding', facts },
  });

  it("an onboarding Brain never asked for a language: its stored en / neutral are not the owner's choice", () => {
    expect(ownerStatedLocalization(onboarded())).toEqual({
      primaryLanguage: undefined,
      regionalStyle: undefined,
    });
  });

  it('...so a Hyderabad owner falls through to the place default instead of being pinned to English', () => {
    const stated = ownerStatedLocalization(onboarded());
    const place = defaultLocalizationFor({ city: 'Hyderabad', state: 'Telangana' });
    expect(stated.primaryLanguage ?? place.primaryLanguage).toBe('te_en');
    expect(stated.regionalStyle ?? place.regionalStyle).toBe('hyderabadi');
  });

  it('a language the owner confirmed (provenance present) is kept as stored', () => {
    const brain = {
      localization: { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' },
      knowledge: {
        origin: 'conversational_onboarding',
        facts: { 'localization.primaryLanguage': { source: 'USER_CONFIRMED' } },
      },
    };
    expect(ownerStatedLocalization(brain)).toEqual({
      primaryLanguage: 'hi_en',
      regionalStyle: undefined,
    });
  });

  it('an older Brain (no provenance) is understood as stored, and hi_en stays hi_en', () => {
    expect(
      ownerStatedLocalization({
        localization: { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' },
      })
    ).toEqual({ primaryLanguage: 'hi_en', regionalStyle: 'mumbai' });
  });

  it('no Brain, no localization: nothing stated', () => {
    expect(ownerStatedLocalization(undefined)).toEqual({});
    expect(ownerStatedLocalization({})).toEqual({});
  });
});

describe('ownerStatedLocalization with SYSTEM_DEFAULT provenance', () => {
  const brain = (facts: Record<string, { source: string }>) => ({
    localization: { primaryLanguage: 'en', regionalStyle: 'neutral' },
    knowledge: { origin: 'conversational_onboarding', facts },
  });

  it("a value recorded as SYSTEM_DEFAULT is not the owner's choice", () => {
    const out = ownerStatedLocalization(
      brain({
        'localization.primaryLanguage': { source: 'SYSTEM_DEFAULT' },
        'localization.regionalStyle': { source: 'SYSTEM_DEFAULT' },
      })
    );
    expect(out).toEqual({ primaryLanguage: undefined, regionalStyle: undefined });
  });

  it('a value recorded as USER_CONFIRMED is kept', () => {
    const out = ownerStatedLocalization({
      localization: { primaryLanguage: 'hi_en', regionalStyle: 'mumbai' },
      knowledge: {
        origin: 'conversational_onboarding',
        facts: {
          'localization.primaryLanguage': { source: 'USER_CONFIRMED' },
          'localization.regionalStyle': { source: 'USER_CONFIRMED' },
        },
      },
    });
    expect(out).toEqual({ primaryLanguage: 'hi_en', regionalStyle: 'mumbai' });
  });
});

import { LANGUAGES, REGIONAL_STYLES } from './constants';
import {
  normalizeLanguage,
  normalizeRegionalStyle,
  regionalStyleForPlace,
  regionalStylesFor,
} from './localizationDefaults';
import { buildCampaignInput } from './buildCampaignInput';

/**
 * The wizard used to offer only English / Telugu / Telugu+English and Neutral / Hyderabadi (a Hyderabad
 * restaurant MVP), so a Mumbai owner could not choose Hinglish or a Mumbai style, and a stored "hi_en" was
 * silently turned into "en". The backend already supports more. The UI now offers the languages it supports,
 * offers only the styles that fit the language and the business's place, and never converts what an owner
 * has stored.
 */

describe('languages the wizard offers', () => {
  it('English, Hindi, Hinglish, Telugu and Telugu + English', () => {
    expect(LANGUAGES.map((l) => l.value)).toEqual(['en', 'hi', 'hi_en', 'te', 'te_en']);
    const label = (v: string) => LANGUAGES.find((l) => l.value === v)?.label;
    expect(label('hi')).toBe('Hindi');
    expect(label('hi_en')).toMatch(/Hinglish/);
    expect(label('te_en')).toBe('Telugu + English');
  });

  it('keeps the full style catalogue for labels', () => {
    expect(REGIONAL_STYLES.map((r) => r.value)).toEqual(
      expect.arrayContaining([
        'neutral',
        'hyderabadi',
        'telangana',
        'mumbai',
        'bangalore',
        'delhi',
        'chennai',
        'kolkata',
      ])
    );
  });
});

describe('a stored preference is understood, never converted', () => {
  it.each(['en', 'hi', 'hi_en', 'te', 'te_en'])('language %s is kept as it is', (code) => {
    expect(normalizeLanguage(code as never)).toBe(code);
  });

  it.each([
    'neutral',
    'hyderabadi',
    'telangana',
    'mumbai',
    'bangalore',
    'delhi',
    'chennai',
    'kolkata',
  ])('style %s is kept as it is', (style) => {
    expect(normalizeRegionalStyle(style as never)).toBe(style);
  });

  it('hi_en is NOT turned into en, and mumbai is NOT turned into neutral', () => {
    expect(normalizeLanguage('hi_en')).not.toBe('en');
    expect(normalizeRegionalStyle('mumbai')).not.toBe('neutral');
  });

  it('only a value that is not a language / style at all is dropped (the caller then uses the place default)', () => {
    expect(normalizeLanguage('xx' as never)).toBeUndefined();
    expect(normalizeLanguage(undefined)).toBeUndefined();
    expect(normalizeRegionalStyle('atlantis' as never)).toBeUndefined();
  });
});

describe('the region a business is in', () => {
  it.each([
    [{ city: 'Hyderabad', state: 'Telangana' }, 'hyderabadi'],
    [{ city: 'Mumbai', state: 'Maharashtra' }, 'mumbai'],
    [{ city: 'New Delhi' }, 'delhi'],
    [{ city: 'Bengaluru' }, 'bangalore'],
    [{ city: 'Chennai' }, 'chennai'],
    [{ city: 'Kolkata' }, 'kolkata'],
    [{ city: 'Warangal', state: 'Telangana' }, 'telangana'],
    [{ city: 'Pune', state: 'Maharashtra' }, undefined],
    [undefined, undefined],
  ])('%j -> %s', (location, style) => {
    expect(regionalStyleForPlace(location)).toBe(style);
  });
});

describe('styles offered follow the language and the place', () => {
  const styles = (
    language: string,
    location?: { city?: string; state?: string },
    stored?: string
  ) => regionalStylesFor({ language: language as never, location, stored: stored as never });

  it('a Mumbai Hinglish owner is offered Hindi-belt styles and Mumbai, never Hyderabadi', () => {
    const offered = styles('hi_en', { city: 'Mumbai', state: 'Maharashtra' });
    expect(offered).toEqual(expect.arrayContaining(['neutral', 'mumbai', 'delhi']));
    expect(offered).not.toContain('hyderabadi');
    expect(offered).not.toContain('telangana');
  });

  it('a Hyderabad Telugu owner is offered Hyderabadi and Telangana', () => {
    expect(styles('te_en', { city: 'Hyderabad', state: 'Telangana' })).toEqual(
      expect.arrayContaining(['neutral', 'hyderabadi', 'telangana'])
    );
    expect(styles('te', { city: 'Hyderabad' })).toContain('hyderabadi');
  });

  it('an English owner in an unlisted city is offered Neutral only, plus the style of their own place', () => {
    expect(styles('en', { city: 'Pune', state: 'Maharashtra' })).toEqual(['neutral']);
    expect(styles('en', { city: 'Bengaluru' })).toEqual(['neutral', 'bangalore']);
  });

  it('a stored style is always offered, even when the language would not normally include it', () => {
    expect(styles('en', { city: 'Pune' }, 'mumbai')).toContain('mumbai');
    expect(styles('hi_en', { city: 'Mumbai' }, 'hyderabadi')).toContain('hyderabadi');
  });

  it('Neutral is always first and there are no duplicates', () => {
    const offered = styles('hi_en', { city: 'Mumbai' }, 'mumbai');
    expect(offered[0]).toBe('neutral');
    expect(new Set(offered).size).toBe(offered.length);
  });
});

describe('what the wizard sends for a Hinglish / Mumbai owner', () => {
  it('keeps hi_en, derives hi as the secondary language, and keeps the Mumbai style', () => {
    const business = {
      businessId: 'b1',
      location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
      businessBrain: {},
    } as never;
    const state = {
      selectedProductId: 'p1',
      type: 'post',
      objective: 'service_promotion',
      cta: 'order_whatsapp',
      primaryLanguage: 'hi_en',
      regionalStyle: 'mumbai',
      campaignStyle: 'funny',
      templateId: null,
      styleId: null,
      offer: {
        type: 'fixed',
        headline: 'Glow Facial',
        description: '',
        price: '799',
        originalPrice: '',
        terms: '',
      },
      duration: { start: '2026-10-10', end: '2026-10-15' },
      audience: { localities: ['Bandra'], ageMin: '18', ageMax: '60', occasion: '' },
      photos: [],
    } as never;
    const input = buildCampaignInput(business, state, 'key') as {
      localization: Record<string, string>;
    };
    expect(input.localization).toMatchObject({
      primaryLanguage: 'hi_en',
      secondaryLanguage: 'hi',
      regionalStyle: 'mumbai',
      languageMixing: 'natural',
    });
  });
});

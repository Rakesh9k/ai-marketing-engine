import { getBrandCreativeContext } from './brandCreativeContext';
import type { BrandKit } from '../../types';

const FULL_BRAND_KIT: BrandKit = {
  businessId: 'biz_1',
  logo: {
    primary: {
      url: 'https://example.test/logo-primary.png',
      storagePath: 'businesses/biz_1/brand/logo-primary.png',
      width: 512,
      height: 512,
    },
    secondary: {
      url: 'https://example.test/logo-secondary.png',
      storagePath: 'businesses/biz_1/brand/logo-secondary.png',
      width: 512,
      height: 512,
    },
  },
  colors: {
    primary: '#E84D1A',
    secondary: '#FFFFFF',
    accent: '#FFD700',
    background: '#0A0A0A',
    text: '#1A1A1A',
  },
  fonts: {
    heading: 'TestHeadingFont',
    body: 'TestBodyFont',
  },
  tone: 'premium',
  personality: 'warm and bold',
  visualPreferences: 'high-contrast, appetizing close-ups',
  targetAudience: 'young professionals',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getBrandCreativeContext', () => {
  it('Test 1 — maps the primary logo URL from the nested BrandKit shape', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context.logo?.primaryUrl).toBe('https://example.test/logo-primary.png');
  });

  it('Test 2 — maps the secondary logo URL when present', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context.logo?.secondaryUrl).toBe('https://example.test/logo-secondary.png');
  });

  it('Test 3 — maps every supported color field by name', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context.colors).toEqual({
      primary: '#E84D1A',
      secondary: '#FFFFFF',
      accent: '#FFD700',
      background: '#0A0A0A',
      text: '#1A1A1A',
    });
  });

  it('Test 4 — maps heading and body fonts', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context.fonts).toEqual({
      heading: 'TestHeadingFont',
      body: 'TestBodyFont',
    });
  });

  it('maps tone and visualPreferences using BrandKit field names (not the legacy brandTone alias)', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context.tone).toBe('premium');
    expect(context.visualPreferences).toBe('high-contrast, appetizing close-ups');
  });

  it('Test 5 — a BrandKit without optional logo/color/font values does not crash and leaves them undefined', () => {
    const minimalBrandKit: BrandKit = {
      businessId: 'biz_2',
      colors: { primary: '#111111', background: '#FFFFFF', text: '#000000' },
      fonts: { heading: 'Inter', body: 'Inter' },
      tone: 'friendly',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const context = getBrandCreativeContext(minimalBrandKit);
    expect(context.logo).toBeUndefined();
    expect(context.colors?.secondary).toBeUndefined();
    expect(context.colors?.accent).toBeUndefined();
  });

  it('Test 6 — a missing BrandKit normalizes to an empty context instead of fabricating brand data', () => {
    expect(getBrandCreativeContext(null)).toEqual({});
    expect(getBrandCreativeContext(undefined)).toEqual({});
  });

  it('Test 7 — output contains no trace of the raw BrandKit nesting (no logo.primary.url passthrough)', () => {
    const context = getBrandCreativeContext(FULL_BRAND_KIT);
    expect(context).not.toHaveProperty('logo.primary');
    expect((context.logo as unknown as { primary?: unknown })?.primary).toBeUndefined();
  });
});

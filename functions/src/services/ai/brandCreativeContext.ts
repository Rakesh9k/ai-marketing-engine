import type { BrandCreativeContext, BrandKit } from '../../types';

/**
 * The one canonical adapter from the persisted `BrandKit` (Firestore schema,
 * `logo.primary.url` / `logo.secondary.url`) to the normalized
 * `BrandCreativeContext` that all creative generation code consumes.
 *
 * Purely deterministic normalization — no AI calls, no Firestore access, no
 * business-fact invention. A missing/absent BrandKit normalizes to `{}`
 * (matching the pre-existing "brandProfile can be {} when a business has no
 * Brand Kit" contract already assumed by downstream generation code).
 */
export function getBrandCreativeContext(
  brandKit: BrandKit | null | undefined
): BrandCreativeContext {
  if (!brandKit) {
    return {};
  }

  return {
    logo: brandKit.logo
      ? {
          primaryUrl: brandKit.logo.primary?.url,
          secondaryUrl: brandKit.logo.secondary?.url,
          primaryStoragePath: brandKit.logo.primary?.storagePath || undefined,
          primaryWidth: brandKit.logo.primary?.width || undefined,
          primaryHeight: brandKit.logo.primary?.height || undefined,
        }
      : undefined,
    colors: {
      primary: brandKit.colors?.primary,
      secondary: brandKit.colors?.secondary,
      accent: brandKit.colors?.accent,
      background: brandKit.colors?.background,
      text: brandKit.colors?.text,
    },
    fonts: {
      heading: brandKit.fonts?.heading,
      body: brandKit.fonts?.body,
    },
    tone: brandKit.tone,
    visualPreferences: brandKit.visualPreferences,
  };
}

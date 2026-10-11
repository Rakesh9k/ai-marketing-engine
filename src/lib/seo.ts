import type { Metadata } from 'next';

/**
 * Per-page social/SEO metadata. Next.js SHALLOWLY merges `metadata` across segments, so a
 * page that sets its own `openGraph` silently drops the root layout's `images`, `siteName`
 * and `locale` (and a page that sets none inherits the homepage's `og:url`/`og:title`).
 * Every public page therefore builds its metadata through this helper so each preview is
 * complete and points at its own canonical URL.
 *
 * `path` is relative; it resolves against `metadataBase` in app/layout.tsx.
 */
export const SITE_NAME = 'Mitra';
export const DEFAULT_OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Mitra — One photo. A month of marketing.',
  type: 'image/png',
} as const;

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = input;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}

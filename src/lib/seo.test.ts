import type { OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';
import { pageMetadata, DEFAULT_OG_IMAGE } from './seo';
import { metadata as solutions } from '@/app/solutions/layout';
import { metadata as restaurants } from '@/app/solutions/restaurants/layout';
import { metadata as salons } from '@/app/solutions/salons/layout';
import { metadata as realEstate } from '@/app/solutions/real-estate/layout';

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Pricing | Mitra',
    description: 'Simple pricing.',
    path: '/pricing',
  });
  const og = meta.openGraph as OpenGraph;

  it('keeps title and description consistent across <title>, Open Graph and Twitter', () => {
    expect(og.title).toBe('Pricing | Mitra');
    expect(og.description).toBe('Simple pricing.');
    expect(meta.twitter).toMatchObject({
      title: 'Pricing | Mitra',
      description: 'Simple pricing.',
    });
  });

  it('points og:url and the canonical link at the page itself, not the homepage', () => {
    expect(og.url).toBe('/pricing');
    expect(meta.alternates?.canonical).toBe('/pricing');
  });

  it('re-declares siteName, locale, type and the image (Next shallow-merges openGraph)', () => {
    expect(og).toMatchObject({ siteName: 'Mitra', locale: 'en_IN', type: 'website' });
    expect(og.images).toEqual([DEFAULT_OG_IMAGE]);
  });

  it('uses a large Twitter card with the same image', () => {
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: ['/og-image.png'] });
  });

  it('declares the dimensions of the committed 1200x630 image', () => {
    expect(DEFAULT_OG_IMAGE).toMatchObject({ width: 1200, height: 630, type: 'image/png' });
  });

  it('uses only relative URLs so they resolve against metadataBase (no stray domains)', () => {
    expect(JSON.stringify(meta)).not.toMatch(/https?:\/\//);
  });
});

describe('solutions route metadata', () => {
  it.each([
    ['/solutions', solutions],
    ['/solutions/restaurants', restaurants],
    ['/solutions/salons', salons],
    ['/solutions/real-estate', realEstate],
  ])('%s has its own title, canonical and og:url', (path, meta) => {
    expect(meta.alternates?.canonical).toBe(path);
    expect((meta.openGraph as OpenGraph).url).toBe(path);
    expect(String(meta.title)).toMatch(/Mitra$/);
    expect(meta.description).toBeTruthy();
  });

  it('gives each solutions page a distinct title', () => {
    const titles = [solutions, restaurants, salons, realEstate].map((m) => m.title);
    expect(new Set(titles).size).toBe(4);
  });
});

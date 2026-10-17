import type { MetadataRoute } from 'next';

const SITE = 'https://www.brain-wise.com';
const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/features',
  '/solutions',
  '/support',
  '/terms',
  '/privacy',
  '/refund',
  '/cancellation',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({ url: `${SITE}${path === '/' ? '' : path}` }));
}

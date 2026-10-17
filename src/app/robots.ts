import type { MetadataRoute } from 'next';

const SITE = 'https://www.brain-wise.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dev/', '/dashboard', '/billing', '/settings', '/onboarding'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

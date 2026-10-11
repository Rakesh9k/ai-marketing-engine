import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { countryFromHeaders } from '@/lib/paddle/config';
import PricingPageClient from './PricingPageClient';

export const metadata: Metadata = pageMetadata({
  title: 'Pricing | Mitra',
  description: 'Simple, clear pricing for Mitra, your AI marketing partner.',
  path: '/pricing',
});

/**
 * Server component: reads the visitor's country from the CDN geo header and hands it to the
 * client for Paddle PricePreview.
 *
 * If the header is missing (or not a real country code) NO country is passed — Paddle then
 * auto-detects from the visitor's IP. A country is never guessed or defaulted here.
 *
 * Reading request headers makes this route dynamic, which is intended: the country differs
 * per request.
 */
export default async function PricingPage() {
  const countryCode = countryFromHeaders(await headers());
  return <PricingPageClient countryCode={countryCode} />;
}

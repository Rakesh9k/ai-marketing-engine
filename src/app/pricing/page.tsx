import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import PricingPageClient from './PricingPageClient';

export const metadata: Metadata = pageMetadata({
  title: 'Pricing | Mitra',
  description: 'Simple, clear pricing for Mitra, your AI marketing partner.',
  path: '/pricing',
});

export default function PricingPage() {
  return <PricingPageClient />;
}

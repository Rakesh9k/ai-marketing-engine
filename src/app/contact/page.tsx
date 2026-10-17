import type { Metadata } from 'next';
import { BusinessIdentity } from '@/components/shared/BusinessIdentity';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = pageMetadata({
  title: 'Contact — Mitra',
  description: 'How to contact Mitra, the AI marketing engine by Brainwise.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Contact</h1>
      <p className="text-body text-text-secondary mb-8">
        Mitra by BrainWise is run by Brainwise Solutions, a sole proprietorship owned by VISHESH
        KAKAR. Reach us by email or phone below; billing, privacy/grievance and legal questions all
        go to the same contacts.
      </p>

      <section className="border-border-light bg-surface mb-8 rounded-2xl border p-6">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          General support &amp; all inquiries
        </h2>
        <p className="text-body text-text-secondary">
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>
        </p>
        <p className="text-caption text-text-tertiary mt-2">
          Use this address for account help, billing/refund/cancellation questions, privacy or data
          requests, and general questions about the product.
        </p>
      </section>

      <p className="text-caption text-text-tertiary">
        See also our{' '}
        <Link href="/support" className="text-brand-600 hover:underline">
          Support
        </Link>{' '}
        page, our{' '}
        <Link href="/terms" className="text-brand-600 hover:underline">
          Terms of Service
        </Link>
        , and our{' '}
        <Link href="/privacy" className="text-brand-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <BusinessIdentity className="border-border-light mt-10 border-t pt-6" />
    </div>
  );
}

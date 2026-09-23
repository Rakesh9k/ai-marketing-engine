import type { Metadata } from 'next';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = {
  title: 'Contact — Mitra',
  description: 'How to contact Mitra, the AI marketing engine by Brainwise.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Contact</h1>
      <p className="text-body text-text-secondary mb-8">
        The only verified, monitored contact channel for Mitra today is email. We have not yet
        established separate dedicated addresses for billing, privacy/grievance, or legal questions
        — all of those currently go to the same inbox below.
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
        Whether dedicated billing, privacy, or legal contact addresses should be created separately
        is a <strong>founder decision</strong>, not yet made. See also our{' '}
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
    </div>
  );
}

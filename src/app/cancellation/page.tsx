import type { Metadata } from 'next';
import { BusinessIdentity } from '@/components/shared/BusinessIdentity';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = pageMetadata({
  title: 'Cancellation Policy — Mitra',
  description: 'Cancellation and plan expiry policy for Mitra, the AI marketing engine by Brainwise.',
  path: '/cancellation',
});

const EFFECTIVE_DATE = '2026-10-02';

export default function CancellationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Cancellation &amp; Plan Expiry Policy</h1>
      <p className="text-caption text-text-tertiary mb-8">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Cancellation &amp; Non-Recurring Billing</h2>
        <p className="text-body text-text-secondary">
          All paid Mitra plans are prepaid for a fixed term (30 days for monthly plans or 365 days for
          yearly plans). Nothing renews by itself, and because plans do not renew automatically, there are no recurring subscription charges
          to cancel. Customers may cancel their account or request discontinuation of service at any time by emailing{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">2. When a plan ends</h2>
        <p className="text-body text-text-secondary">
          Your paid access and plan credits continue through the prepaid term you purchased. At the end of
          that term, your account moves to the Free plan. Your businesses, campaigns, and other
          marketing assets are preserved and not deleted when the term ends.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">3. Renewing or changing plans</h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            You may choose to buy another term from the Billing page; no payment is taken unless
            you explicitly initiate it.
          </li>
          <li>
            Buying the same plan and term again before your current term ends adds the new term
            after your current end date.
          </li>
          <li>A different plan or term can be purchased after your current access ends.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">4. Refunds and credits</h2>
        <p className="text-body text-text-secondary">
          The end or cancellation of a term does not by itself trigger a refund. Refund requests are reviewed under
          our{' '}
          <Link href="/refund" className="text-brand-600 hover:underline">
            Refund Policy
          </Link>
          . Plan credits do not roll over; credit-pack credits are valid for the calendar month in
          which they are bought.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          5. Credit packs and the Free plan
        </h2>
        <p className="text-body text-text-secondary">
          Credit packs are one-time prepaid purchases. The Free plan has no
          payment and does not renew.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">Questions</h2>
        <p className="text-body text-text-secondary">
          If you cannot find your subscription in Billing or something looks wrong, email{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>{' '}
          with your account email.
        </p>
      </section>

      <p className="text-caption text-text-tertiary">
        See also our{' '}
        <Link href="/refund" className="text-brand-600 hover:underline">
          Refund Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" className="text-brand-600 hover:underline">
          Terms of Service
        </Link>
        .
      </p>
      <BusinessIdentity className="border-border-light mt-10 border-t pt-6" />
    </div>
  );
}

import type { Metadata } from 'next';
import { BusinessIdentity } from '@/components/shared/BusinessIdentity';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = pageMetadata({
  title: 'Refund Policy — Mitra',
  description: 'Refund policy for Mitra, the AI marketing engine by Brainwise.',
  path: '/refund',
});

const EFFECTIVE_DATE = '2026-10-02';

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Refund Policy</h1>
      <p className="text-caption text-text-tertiary mb-8">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Who processes payments</h2>
        <p className="text-body text-text-secondary">
          Payments are processed through Cashfree Payments, our authorized payment gateway.
          Refund requests are reviewed by VISHESH KAKAR (trading as Brainwise Solutions); where a
          refund is approved, it is initiated through Cashfree to the customer&apos;s original payment method.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">2. What can be refunded</h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            <strong>First-time paid plan purchase:</strong> refundable within 7 days of purchase
            if the credits associated with that purchase have not been used.
          </li>
          <li>
            <strong>Credit packs:</strong> refundable within 7 days of purchase if none of the
            purchased credits have been used.
          </li>
          <li>
            <strong>Other purchases:</strong> refund requests are reviewed individually, including
            billing errors, duplicate charges, and cases required by applicable law.
          </li>
        </ul>
        <p className="text-body text-text-secondary mt-3">
          <strong>Refund Processing Timeline:</strong> Once a refund request is approved, the refund will be
          processed and credited back to your original payment method (Bank Account, Credit/Debit Card, Net Banking, or UPI)
          within <strong>5 to 7 business days</strong>.
        </p>
        <p className="text-body text-text-secondary mt-2">
          Every request is reviewed manually. Applicable law takes precedence over this policy. The end of a prepaid plan term does not by itself trigger a refund,
          and a refund does not automatically reverse or adjust credits already granted or used.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">3. Failed generations</h2>
        <p className="text-body text-text-secondary">
          Separately from refund policy: when an AI generation request fails on Mitra's side after
          credits were reserved for it, the system is designed to release (refund) those credits
          back to your account automatically as a technical matter — this is a product behavior, not
          a monetary refund of a payment. If you believe credits were charged for a failed
          generation and not returned, contact support with the campaign details.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">4. Contact</h2>
        <p className="text-body text-text-secondary">
          For any billing or refund question, email{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>{' '}
          with your account email and payment details.
        </p>
      </section>

      <p className="text-caption text-text-tertiary">
        See also our{' '}
        <Link href="/cancellation" className="text-brand-600 hover:underline">
          Cancellation Policy
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

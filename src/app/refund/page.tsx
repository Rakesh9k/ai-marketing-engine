import type { Metadata } from 'next';
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
        Effective date: {EFFECTIVE_DATE} · Version 0.1 (draft) · Not yet reviewed by legal counsel
      </p>

      <div className="border-border-light bg-surface mb-8 rounded-2xl border p-4">
        <p className="text-body text-text-secondary">
          <strong>Status of this document:</strong> This policy has not yet been reviewed by legal
          counsel. Refund requests are reviewed manually; there is no self-service refund button.
          Applicable law and Paddle's terms take precedence over this policy.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Who processes payments</h2>
        <p className="text-body text-text-secondary">
          Paddle.com is the Merchant of Record for our orders and handles returns and refund
          processing. Refunds, where approved, are returned through Paddle to the original payment
          method. Mitra by BrainWise is provided by Brainwise Solutions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">2. What can be refunded</h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            <strong>First-time subscription purchase:</strong> refundable within 7 days of purchase
            if the credits associated with that purchase have not been used.
          </li>
          <li>
            <strong>Credit packs:</strong> refundable within 7 days of purchase if none of the
            purchased credits have been used.
          </li>
          <li>
            <strong>Subscription renewals:</strong> generally not refundable, except for billing
            errors, duplicate charges, where required by applicable law or applicable Paddle terms,
            or another exception we specifically approve.
          </li>
        </ul>
        <p className="text-body text-text-secondary mt-2">
          Every request is reviewed manually. Applicable law and Paddle's terms take precedence over
          this policy. Cancelling a subscription (see our Cancellation Policy) does not by itself
          trigger a refund, and a refund does not automatically reverse or adjust credits already
          granted or used.
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
    </div>
  );
}

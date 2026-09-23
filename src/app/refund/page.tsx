import type { Metadata } from 'next';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = {
  title: 'Refund Policy — Mitra',
  description: 'Refund policy for Mitra, the AI marketing engine by Brainwise.',
};

const EFFECTIVE_DATE = '2026-09-22';

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
          <strong>Status of this document:</strong> Mitra does not currently have an automated
          refund mechanism, and a formal refund policy (what qualifies, time limits, partial vs.
          full refunds) has not yet been decided by the founder. This page states that honestly
          rather than inventing terms. If you believe you are owed a refund, contact{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>{' '}
          and we will review your request manually.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Current state</h2>
        <p className="text-body text-text-secondary">
          Payments are processed through PayU (some existing subscriptions may still be processed
          through Razorpay, the previous payment provider). As of this version of the Service, Mitra
          does not automatically issue refunds for subscription payments, and there is no
          self-service "request a refund" button in the app. Any refund request received today is
          reviewed and, if approved, processed manually by the team — it is not governed by a
          published, finalized policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          2. What has not been decided yet
        </h2>
        <p className="text-body text-text-secondary">
          <strong>Founder decision required</strong> on each of the following, none of which is
          invented or implied by this page:
        </p>
        <ul className="text-body text-text-secondary mt-2 list-disc space-y-1 pl-6">
          <li>Whether refunds are offered at all, and under what circumstances.</li>
          <li>Any time window within which a refund may be requested.</li>
          <li>Whether refunds are full, partial, or prorated based on credits already used.</li>
          <li>
            How a failed AI generation that still consumed credits is treated for refund purposes.
          </li>
          <li>
            Whether cancellation (see our Cancellation Policy) entitles you to any refund for the
            current billing period — by default it does not.
          </li>
        </ul>
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

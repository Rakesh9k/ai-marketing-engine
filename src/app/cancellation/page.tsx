import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = pageMetadata({
  title: 'Cancellation Policy — Mitra',
  description: 'How cancelling a Mitra subscription works, in plain terms.',
  path: '/cancellation',
});

const EFFECTIVE_DATE = '2026-10-02';

/**
 * Describes ONLY behaviour that is implemented and verified (cancelPaddleSubscription +
 * the Paddle webhook): cancelling stops the next renewal; the plan and its monthly credit
 * allowance continue to the end of the paid period; nothing is refunded or removed
 * automatically. Refund terms live on /refund; this page must not restate or contradict them.
 * Not yet reviewed by legal counsel.
 */
export default function CancellationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Cancellation Policy</h1>
      <p className="text-caption text-text-tertiary mb-8">
        Effective date: {EFFECTIVE_DATE} · Version 0.1 (draft) · Not yet reviewed by legal counsel
      </p>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Automatic renewal</h2>
        <p className="text-body text-text-secondary">
          Paid Mitra plans renew automatically at the end of each billing period (monthly or yearly,
          as you chose) until you cancel. There is no free trial.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">2. How to cancel</h2>
        <p className="text-body text-text-secondary">
          Open the Billing page in the app and choose <strong>Cancel subscription</strong>. You do
          not need to contact us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">3. What cancelling does</h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            It stops the <strong>next</strong> renewal. You will not be charged again.
          </li>
          <li>
            It does not end your access immediately. You keep your paid plan, and the monthly credit
            allowance that comes with it, until the end of the billing period you have already paid
            for.
          </li>
          <li>At the end of that period your account moves to the Free plan.</li>
          <li>Your businesses, campaigns and other content are not deleted by cancelling.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          4. What cancelling does not do
        </h2>
        <p className="text-body text-text-secondary">
          Cancelling does not by itself refund a payment, and it does not reverse or remove credits
          already granted or used. Refund requests are handled under our{' '}
          <Link href="/refund" className="text-brand-600 hover:underline">
            Refund Policy
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">5. Credits</h2>
        <p className="text-body text-text-secondary">
          Credits are valid through the calendar month they apply to; unused credits do not roll
          over into the next month. See our{' '}
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms of Service
          </Link>{' '}
          for the credit terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">6. Changing plans</h2>
        <p className="text-body text-text-secondary">
          Switching to a different plan inside an active subscription is not available yet. To move
          to a different plan, cancel your current plan and subscribe to the new one once your
          current period has ended.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          7. Credit packs and the Free plan
        </h2>
        <p className="text-body text-text-secondary">
          Credit packs are one-time purchases, so there is nothing to cancel. The Free plan has no
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
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = {
  title: 'Cancellation Policy — Mitra',
  description:
    'How subscription cancellation works in Mitra, the AI marketing engine by Brainwise.',
};

const EFFECTIVE_DATE = '2026-09-22';

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

      <div className="border-border-light bg-surface mb-8 rounded-2xl border p-4">
        <p className="text-body text-text-secondary">
          <strong>Status of this document:</strong> This page describes exactly what "cancel"
          technically does in Mitra today. It does not promise a refund for the current billing
          period — see our{' '}
          <Link href="/refund" className="text-brand-600 hover:underline">
            Refund Policy
          </Link>{' '}
          for that, which remains a founder decision.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. What "cancel" means</h2>
        <p className="text-body text-text-secondary">
          "Cancellation" in Mitra means canceling your recurring paid subscription plan — it stops
          the plan from automatically renewing and being billed again. It is different from deleting
          your account (see our{' '}
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>
          , section 6) and different from stopping a single in-progress campaign generation, which
          is a normal in-app action, not a billing action.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          2. How to cancel your subscription
        </h2>
        <p className="text-body text-text-secondary">
          You can cancel a paid subscription plan yourself from the Billing page in the app. When
          you cancel:
        </p>
        <ul className="text-body text-text-secondary mt-2 list-disc space-y-1 pl-6">
          <li>
            Your plan stops renewing — PayU (or Razorpay, for a subscription created before PayU was
            introduced) will not charge you again for this plan.
          </li>
          <li>
            Your current billing period is not interrupted: you keep your plan's access and any
            remaining credits until the end of the period you already paid for.
          </li>
          <li>
            After that period ends, your account reverts to the Free plan's monthly credit
            allowance.
          </li>
          <li>Canceling does not, by itself, delete your account or your data.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          3. What cancellation does not do
        </h2>
        <p className="text-body text-text-secondary">
          Canceling does not issue a refund for the current or any prior billing period — see our{' '}
          <Link href="/refund" className="text-brand-600 hover:underline">
            Refund Policy
          </Link>
          . It also does not automatically expire or forfeit unused credits at the moment you click
          cancel; credits remain usable until your current paid period ends.{' '}
          <strong>
            What exactly happens to unused credits after your account reverts to the Free plan:
            founder decision required.
          </strong>{' '}
          This has not yet been finalized.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          4. If self-service cancellation isn't working for you
        </h2>
        <p className="text-body text-text-secondary">
          If the in-app cancellation option is unavailable or fails, contact{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>{' '}
          and we will process the cancellation manually.
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

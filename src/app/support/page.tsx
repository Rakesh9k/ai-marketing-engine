import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = pageMetadata({
  title: 'Support — Mitra',
  description: 'Get help with Mitra, the AI marketing engine by Brainwise.',
  path: '/support',
});

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Support</h1>
      <p className="text-body text-text-secondary mb-8">
        This page lists what you can do yourself in the app today, and what still requires emailing
        us directly.
      </p>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">Self-service, in the app</h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>Subscribe to a plan or buy a credit pack (Billing page)</li>
          <li>
            Cancel your subscription — stops future renewal; see our{' '}
            <Link href="/cancellation" className="text-brand-600 hover:underline">
              Cancellation Policy
            </Link>
          </li>
          <li>
            Request account deletion (Billing page — this deletes your login and archives your
            businesses)
          </li>
          <li>Regenerate or download campaign content you've already generated</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          Requires emailing support@brain-wise.com
        </h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            Refund requests — see our{' '}
            <Link href="/refund" className="text-brand-600 hover:underline">
              Refund Policy
            </Link>{' '}
            (no automated refund flow exists yet)
          </li>
          <li>Billing discrepancies or a payment that succeeded but credits didn't appear</li>
          <li>
            Data access, correction, or deletion requests beyond the self-service account-deletion
            option
          </li>
          <li>Anything not covered by the self-service options above</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">Contact</h2>
        <p className="text-body text-text-secondary">
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>
        </p>
        <p className="text-caption text-text-tertiary mt-2">
          We do not currently publish a guaranteed response-time SLA — none has been decided.
        </p>
      </section>

      <p className="text-caption text-text-tertiary">
        See also{' '}
        <Link href="/contact" className="text-brand-600 hover:underline">
          Contact
        </Link>
        ,{' '}
        <Link href="/terms" className="text-brand-600 hover:underline">
          Terms of Service
        </Link>
        , and{' '}
        <Link href="/privacy" className="text-brand-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

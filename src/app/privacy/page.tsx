import type { Metadata } from 'next';
import Link from 'next/link';
import { MitraLogo } from '@/components/ui/MitraLogo';

export const metadata: Metadata = {
  title: 'Privacy Policy — Mitra',
  description: 'Privacy Policy for Mitra, the AI marketing engine by Brainwise.',
};

const EFFECTIVE_DATE = '2026-09-22';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Mitra — Home">
        <MitraLogo size="md" className="mb-8" />
      </Link>

      <h1 className="text-h1 text-text-primary mb-2 font-bold">Privacy Policy</h1>
      <p className="text-caption text-text-tertiary mb-8">
        Effective date: {EFFECTIVE_DATE} · Version 0.1 (draft) · Not yet reviewed by legal counsel
      </p>

      <div className="border-border-light bg-surface mb-8 rounded-2xl border p-4">
        <p className="text-body text-text-secondary">
          <strong>Status of this document:</strong> This page describes, as accurately as possible,
          what personal data Mitra actually collects and how it is actually used today. Items that
          depend on a business decision not yet made (retention periods, a dedicated privacy
          contact, international-transfer scope) are marked as such rather than invented.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">1. Who this policy covers</h2>
        <p className="text-body text-text-secondary">
          This policy covers personal data processed through the Mitra application at
          brain-wise.com. As with our Terms of Service, the formal registered legal entity operating
          Mitra has not yet been documented on this page —{' '}
          <strong>legal entity name and address: founder decision required.</strong>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">2. Data we process</h2>
        <table className="text-body text-text-secondary w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-border-light border-b">
              <th className="py-2 pr-2">Data</th>
              <th className="py-2 pr-2">Where collected</th>
              <th className="py-2 pr-2">Why</th>
              <th className="py-2">Stored / processed by</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">Email, Firebase account UID</td>
              <td className="py-2 pr-2">Signup / login</td>
              <td className="py-2 pr-2">Authentication, account identity</td>
              <td className="py-2">Firebase Authentication (Google Cloud)</td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">
                Name, email, and profile photo (if you sign in with Google)
              </td>
              <td className="py-2 pr-2">"Continue with Google" sign-in/signup</td>
              <td className="py-2 pr-2">
                Authenticating your account without a separate password; pre-filling your name/photo
              </td>
              <td className="py-2">
                Firebase Authentication (Google Cloud), via Google's sign-in flow. Mitra does not
                receive or store your Google password, and does not request or store any Google
                access/refresh token beyond what Firebase Authentication itself manages to keep you
                signed in.
              </td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">
                Business name, category, location, offers, brand details
              </td>
              <td className="py-2 pr-2">Onboarding / Business Brain</td>
              <td className="py-2 pr-2">Personalizing campaign generation</td>
              <td className="py-2">Firestore (Google Cloud)</td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">Product photos, logos, generated campaign images/video</td>
              <td className="py-2 pr-2">Asset upload / campaign generation</td>
              <td className="py-2 pr-2">Generating campaigns</td>
              <td className="py-2">
                Firebase Storage (Google Cloud); sent to Google Gemini (text/vision) and OpenAI
                (image generation) to produce campaign content
              </td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">Credit usage, campaign/download events</td>
              <td className="py-2 pr-2">App usage</td>
              <td className="py-2 pr-2">Enforcing credit limits, showing usage history</td>
              <td className="py-2">Firestore (Google Cloud)</td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">Subscription/payment status, transaction records</td>
              <td className="py-2 pr-2">Billing</td>
              <td className="py-2 pr-2">Granting credits, showing billing history</td>
              <td className="py-2">
                Firestore stores plan/status/transaction records only. Card, bank, and UPI details
                are collected and processed by PayU directly (or, for a subscription created before
                this payment provider was introduced, by Razorpay) — Mitra does not receive or store
                your card or bank account details.
              </td>
            </tr>
            <tr className="border-border-light border-b">
              <td className="py-2 pr-2">Application error diagnostics</td>
              <td className="py-2 pr-2">Error handling</td>
              <td className="py-2 pr-2">Debugging application errors</td>
              <td className="py-2">
                Sentry error-monitoring is integrated in the codebase but, as of this policy's
                effective date, is not actively provisioned/collecting data.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-2">Theme preference (light/dark)</td>
              <td className="py-2 pr-2">Browser</td>
              <td className="py-2 pr-2">Remembering your display preference</td>
              <td className="py-2">Your browser's local storage only — not sent to our servers</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          3. Third parties who process your data
        </h2>
        <ul className="text-body text-text-secondary list-disc space-y-1 pl-6">
          <li>
            <strong>Firebase / Google Cloud Platform</strong> — hosting, authentication (including,
            if you choose it, "Continue with Google" sign-in), database (Firestore), file storage,
            and bot/abuse protection (App Check).
          </li>
          <li>
            <strong>Google Gemini</strong> — receives business/product information and images you
            submit, to generate marketing copy and analyze product photos.
          </li>
          <li>
            <strong>OpenAI</strong> — receives prompts derived from your business/campaign
            information to generate campaign images.
          </li>
          <li>
            <strong>PayU</strong> — processes payments; receives your payment details directly and
            confirms payment status to Mitra via a server-to-server webhook.
          </li>
          <li>
            <strong>Razorpay</strong> — the previous payment processor. No longer used for new
            purchases; retained here because a subscription created before this change may still be
            processed by Razorpay until it lapses or is renewed under PayU.
          </li>
          <li>
            <strong>Cloud Run (Google Cloud)</strong> — a separate hosted service that renders your
            uploaded video clips into a finished Reel (video compositing, logo overlay, captions);
            it processes the same video files already covered above under Firebase Storage.
          </li>
        </ul>
        <p className="text-body text-text-secondary mt-2">
          We have not been able to confirm the presence of signed data-processing agreements (DPAs)
          with each of these providers in the materials available to this audit —{' '}
          <strong>subprocessor DPA status: not verified.</strong> No cookie-consent or ad-tracking
          analytics tools (e.g. Google Analytics, Meta Pixel) are currently integrated.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          4. India Digital Personal Data Protection (DPDP) framework
        </h2>
        <p className="text-body text-text-secondary">
          Mitra primarily serves customers in India and treats the Digital Personal Data Protection
          Act, 2023 and its notified Rules as the primary applicable data-protection framework. This
          policy gives you notice of what data is collected and why (section 2), identifies the
          entities we share data with (section 3), and provides a contact channel for questions and
          requests (section 8). Because the DPDP Act and Rules commence in phases, we do not claim
          blanket "DPDP compliance"; obligations are being implemented as they come into force.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">5. GDPR</h2>
        <p className="text-body text-text-secondary">
          Mitra is built and marketed for the Indian market. We do not knowingly target, market to,
          or monitor users located in the EU/EEA. Accordingly, GDPR is treated as{' '}
          <strong>not currently in scope</strong> for this service. If that changes, this policy
          will be updated with a full GDPR applicability assessment.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          6. Your access, correction, and deletion rights
        </h2>
        <p className="text-body text-text-secondary">
          You can request account deletion yourself from the Billing page in the app. Doing so
          deletes your login (Firebase Authentication account) and archives the businesses you own.
          It does <strong>not</strong> currently delete: your campaign, product, and generated-asset
          records; files in Cloud Storage; usage/credit history; or transaction/billing records.
          Transaction records in particular may be retained where required for legal, tax, or
          fraud-prevention purposes. If you want any of the non-deleted data removed as well, email{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>{' '}
          and we will review the request manually.{' '}
          <strong>
            A finalized retention schedule and a fully automated cascading deletion of all remaining
            data: founder + legal counsel decision required.
          </strong>{' '}
          You can also request access to or correction of your personal data via the same email
          address.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">7. Data retention</h2>
        <p className="text-body text-text-secondary">
          <strong>
            Specific retention periods for account, campaign, asset, and log data: founder decision
            required.
          </strong>{' '}
          No fixed retention schedule has been finalized. Data is currently retained for as long as
          your account remains active plus the time needed to respond to support, legal, or security
          requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">
          8. Grievance / privacy contact
        </h2>
        <p className="text-body text-text-secondary">
          For privacy questions, data requests, or grievances, contact{' '}
          <a href="mailto:support@brain-wise.com" className="text-brand-600 hover:underline">
            support@brain-wise.com
          </a>
          .{' '}
          <strong>
            Whether this address is monitored as a dedicated privacy/grievance channel, or whether a
            separate address should be designated: founder confirmation required.
          </strong>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">9. Children's data</h2>
        <p className="text-body text-text-secondary">
          Mitra is a business marketing tool intended for business owners and marketers, not
          children. We do not knowingly collect personal data from children.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-h3 text-text-primary mb-2 font-semibold">10. Changes to this policy</h2>
        <p className="text-body text-text-secondary">
          We may update this policy as the product or our data practices change. The "Effective
          date" above reflects the last update. When you sign up, your acceptance of this policy's
          then-current version (and the Terms of Service's) is recorded on your account with a
          server-generated timestamp. Whether existing users must explicitly re-accept after a
          future material change to this policy has not yet been decided —{' '}
          <strong>re-acceptance requirement: founder decision required.</strong>
        </p>
      </section>

      <p className="text-caption text-text-tertiary">
        See also our{' '}
        <Link href="/terms" className="text-brand-600 hover:underline">
          Terms of Service
        </Link>
        ,{' '}
        <Link href="/refund" className="text-brand-600 hover:underline">
          Refund Policy
        </Link>
        , and{' '}
        <Link href="/cancellation" className="text-brand-600 hover:underline">
          Cancellation Policy
        </Link>
        .
      </p>
    </div>
  );
}

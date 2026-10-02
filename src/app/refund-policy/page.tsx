import { permanentRedirect } from 'next/navigation';

/**
 * /refund-policy is a legacy/alternate URL — permanently redirect to the
 * canonical /refund route so crawlers and browsers converge on one URL.
 * The HTTP-level 308 is also emitted by next.config.ts redirects().
 */
export default function RefundPolicyRedirectPage() {
  permanentRedirect('/refund');
}

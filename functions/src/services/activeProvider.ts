import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getEnvConfig } from '../config/env';

/**
 * Exactly one payment provider may take new payments and grant credits/entitlements at a time
 * (config: ACTIVE_PAYMENT_PROVIDER, default 'cashfree'). Without this, a Paddle and a Cashfree webhook could
 * both fulfil purchases and leave one user with two subscriptions or double credits.
 *
 *  - checkout callables of the inactive provider refuse (failed-precondition);
 *  - the inactive provider's webhook still verifies its signature and answers 200 (so the provider stops
 *    retrying) but writes NOTHING except an audit record in `provider_ignored_events` for an operator.
 */
export type PaymentProviderName = 'cashfree' | 'paddle';

export function getActivePaymentProvider(): PaymentProviderName {
  const value = getEnvConfig().ACTIVE_PAYMENT_PROVIDER;
  return value === 'paddle' ? 'paddle' : 'cashfree';
}

export function isProviderActive(name: PaymentProviderName): boolean {
  return getActivePaymentProvider() === name;
}

export function assertProviderActive(name: PaymentProviderName): void {
  if (!isProviderActive(name)) {
    throw new HttpsError(
      'failed-precondition',
      'This payment method is not available right now. Please reload the page and use the current checkout.'
    );
  }
}

/** Audit trail for a verified webhook that was deliberately NOT processed because its provider is inactive. */
export async function recordIgnoredProviderEvent(
  provider: PaymentProviderName,
  eventId: string,
  eventType: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await admin
    .firestore()
    .collection('provider_ignored_events')
    .doc(`${provider}_${eventId}`)
    .set(
      {
        provider,
        eventId,
        eventType,
        activeProvider: getActivePaymentProvider(),
        needsManualReview: true,
        ...detail,
        receivedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

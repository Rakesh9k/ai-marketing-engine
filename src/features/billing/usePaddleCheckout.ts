'use client';

import { useCallback, useState } from 'react';
import { callFunction } from '@/services/api';

export type CheckoutTarget =
  | { kind: 'plan'; planId: string; billingCycle: 'monthly' | 'yearly'; expectedPriceId: string }
  | { kind: 'pack'; credits: number; expectedPriceId: string };

interface CheckoutResponse {
  transactionId: string;
  priceId?: string;
  checkoutUrl?: string;
}

export class CatalogMismatchError extends Error {
  constructor() {
    super(
      'The price shown does not match the price on our server. Please refresh the page and try again.'
    );
    this.name = 'CatalogMismatchError';
  }
}

/** Stable key identifying which button is mid-checkout. */
export function targetKey(target: CheckoutTarget): string {
  return target.kind === 'plan'
    ? `plan:${target.planId}:${target.billingCycle}`
    : `pack:${target.credits}`;
}

/**
 * Starts a Paddle overlay checkout.
 *
 * 1. Server creates the Paddle transaction (`createPaddleCheckout`): it resolves the price ID,
 *    attaches the signed-in user (custom_data) and the Paddle customer (email pre-fill).
 * 2. The server returns the price ID it used; if it differs from the one this page DISPLAYED,
 *    checkout is refused — the customer must never be charged a different price than shown.
 * 3. Paddle.js opens a one-page overlay for that transaction and redirects to /welcome on success.
 *
 * Nothing here grants credits or entitlements; the signed webhook does.
 */
export function usePaddleCheckout(onError: (message: string) => void) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const start = useCallback(
    async (target: CheckoutTarget) => {
      const key = targetKey(target);
      setPendingKey(key);
      try {
        const data =
          target.kind === 'plan'
            ? { planId: target.planId, billingCycle: target.billingCycle }
            : { creditPack: target.credits };

        const result = await callFunction<typeof data, CheckoutResponse>({
          functionName: 'createPaddleCheckout',
          data,
        });

        if (result.priceId !== target.expectedPriceId) {
          throw new CatalogMismatchError();
        }

        const { openPaddleCheckout } = await import('@/lib/paddle/initPaddle');
        await openPaddleCheckout({
          transactionId: result.transactionId,
          successUrl: `${window.location.origin}/welcome`,
          onClose: () => setPendingKey(null),
        });
      } catch (error) {
        console.error(error);
        onError(
          error instanceof Error ? error.message : 'Could not start checkout. Please try again.'
        );
        setPendingKey(null);
      }
    },
    [onError]
  );

  return { pendingKey, start };
}

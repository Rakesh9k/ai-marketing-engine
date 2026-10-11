'use client';

import { useCallback, useRef, useState } from 'react';
import { callFunction } from '@/services/api';
import { openCashfreeCheckout } from '@/lib/cashfree/initCashfree';

export type CashfreeCheckoutTarget =
  | { kind: 'plan'; planId: string; billingCycle: 'monthly' | 'yearly' }
  | { kind: 'pack'; credits: number };

interface CreateCashfreeCheckoutResponse {
  orderId: string;
  paymentSessionId: string;
  environment: 'sandbox' | 'production';
  amountINR: number;
  currency: 'INR';
}

export function targetKey(target: CashfreeCheckoutTarget): string {
  return target.kind === 'plan'
    ? `plan:${target.planId}:${target.billingCycle}`
    : `pack:${target.credits}`;
}

export function useCashfreeCheckout(onError: (message: string) => void) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const start = useCallback(async (target: CashfreeCheckoutTarget) => {
    const key = targetKey(target);
    setPendingKey(key);
    try {
      const data =
        target.kind === 'plan'
          ? { planId: target.planId, billingCycle: target.billingCycle }
          : { creditPack: target.credits };

      const returnUrl = `${window.location.origin}/billing?cashfree_order_id={order_id}`;

      const result = await callFunction<
        typeof data & { returnUrl: string },
        CreateCashfreeCheckoutResponse
      >({
        functionName: 'createCashfreeCheckout',
        data: { ...data, returnUrl },
      });

      await openCashfreeCheckout({
        paymentSessionId: result.paymentSessionId,
        environment: result.environment,
        returnUrl,
      });
    } catch (error) {
      console.error('Cashfree Checkout error:', error);
      onErrorRef.current(
        error instanceof Error ? error.message : 'Could not start checkout. Please try again.'
      );
      setPendingKey(null);
    }
  }, []);

  return { pendingKey, start };
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { callFunction } from '@/services/api';
import { openCashfreeCheckout } from '@/lib/cashfree/initCashfree';
import {
  PHONE_HELP,
  cashfreeCustomerPhone,
  phoneProblemCode,
} from '@/lib/validation/customerPhone';

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

/** Shown when the server needs the customer's mobile number (none on file, or the one given was not valid). */
export interface PhonePrompt {
  target: CashfreeCheckoutTarget;
  error: string | null;
}

export function useCashfreeCheckout(onError: (message: string) => void) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [phonePrompt, setPhonePrompt] = useState<PhonePrompt | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const run = useCallback(async (target: CashfreeCheckoutTarget, customerPhone?: string) => {
    const key = targetKey(target);
    setPendingKey(key);
    try {
      const data =
        target.kind === 'plan'
          ? { planId: target.planId, billingCycle: target.billingCycle }
          : { creditPack: target.credits };

      const returnUrl = `${window.location.origin}/billing?cashfree_order_id={order_id}`;

      const result = await callFunction<
        typeof data & { returnUrl: string; customerPhone?: string },
        CreateCashfreeCheckoutResponse
      >({
        functionName: 'createCashfreeCheckout',
        data: { ...data, returnUrl, ...(customerPhone ? { customerPhone } : {}) },
      });

      setPhonePrompt(null);
      await openCashfreeCheckout({
        paymentSessionId: result.paymentSessionId,
        environment: result.environment,
        returnUrl,
      });
    } catch (error) {
      setPendingKey(null);
      const problem = phoneProblemCode(error);
      if (problem) {
        // Not a failure: Cashfree needs a real mobile number. Ask for it and retry with it.
        setPhonePrompt({ target, error: problem === 'INVALID_PHONE' ? PHONE_HELP : null });
        return;
      }
      console.error('Cashfree Checkout error:', error);
      onErrorRef.current(
        error instanceof Error ? error.message : 'Could not start checkout. Please try again.'
      );
    }
  }, []);

  const start = useCallback((target: CashfreeCheckoutTarget) => run(target), [run]);

  /** The customer typed their number. Checked here first; the server checks it again. */
  const submitPhone = useCallback(
    async (rawPhone: string) => {
      if (!phonePrompt) return;
      if (!cashfreeCustomerPhone(rawPhone)) {
        setPhonePrompt({ target: phonePrompt.target, error: PHONE_HELP });
        return;
      }
      await run(phonePrompt.target, rawPhone);
    },
    [phonePrompt, run]
  );

  const cancelPhone = useCallback(() => setPhonePrompt(null), []);

  return { pendingKey, start, phonePrompt, submitPhone, cancelPhone };
}

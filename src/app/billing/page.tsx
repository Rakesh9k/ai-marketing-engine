'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { subscriptionService } from '@/services/database';
import type { Subscription, SubscriptionPlan } from '@/types';
import { formatINR } from '@/lib/utils';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { callFunction } from '@/services/api';
import { loadRazorpayCheckout, type RazorpaySuccessResponse } from '@/lib/razorpay/loadCheckout';
import { useToast } from '@/hooks/useToast';

interface CreateSubscriptionResponse {
  subscriptionId: string;
  shortUrl: string;
  planId: SubscriptionPlan;
  price: number;
}

interface VerifyPaymentResponse {
  success: boolean;
  status: string;
}

const TOP_UP_PACKS = [
  { credits: 500, price: 499, label: 'Small Pack' },
  { credits: 1200, price: 999, label: 'Medium Pack' },
  { credits: 3000, price: 1999, label: 'Large Pack' },
];

export default function BillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState<SubscriptionPlan | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const subscriptionData = await subscriptionService.getByUserId(user.uid);
      setSubscription(subscriptionData);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    async function loadSubscription() {
      if (!user) return;
      try {
        setLoading(true);
        const subscriptionData = await subscriptionService.getByUserId(user.uid);
        setSubscription(subscriptionData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void loadSubscription();
  }, [user]);

  // Phase 19A: wires the billing UI to the existing, already-tested backend
  // payment infrastructure (createSubscription + verifyPayment Cloud
  // Functions, Razorpay's own webhook) rather than a new payment system.
  // Credits themselves are granted exclusively by razorpayWebhook.ts once
  // Razorpay confirms the payment server-side — verifyPayment here only
  // updates the subscription's status so the UI can reflect it quickly;
  // it deliberately never grants credits itself (see verifyPayment.ts's
  // own comment and Phase 15's regression test for that exact boundary).
  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      if (plan === 'free' || plan === subscription?.planId) {
        return;
      }

      const razorpayKeyId = process.env['NEXT_PUBLIC_RAZORPAY_KEY_ID'];
      if (!razorpayKeyId) {
        showToast('Payments are not configured yet. Please try again later.', 'error');
        return;
      }

      setPurchasingPlan(plan);
      try {
        const order = await callFunction<{ planId: SubscriptionPlan }, CreateSubscriptionResponse>({
          functionName: 'createSubscription',
          data: { planId: plan },
        });

        await loadRazorpayCheckout();

        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout failed to load');
        }

        const checkout = new window.Razorpay({
          key: razorpayKeyId,
          subscription_id: order.subscriptionId,
          name: 'Mitra',
          description: `${PLAN_DETAILS[plan].name} plan`,
          prefill: { email: user?.email || undefined },
          theme: { color: '#E84D1A' },
          handler: (response: RazorpaySuccessResponse) => {
            void (async () => {
              try {
                await callFunction<
                  {
                    razorpaySubscriptionId: string;
                    razorpayPaymentId: string;
                    razorpaySignature: string;
                  },
                  VerifyPaymentResponse
                >({
                  functionName: 'verifyPayment',
                  data: {
                    razorpaySubscriptionId:
                      response.razorpay_subscription_id || order.subscriptionId,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  },
                });
                showToast(
                  'Payment successful! Your credits will reflect within a few moments.',
                  'success'
                );
                await refreshSubscription();
              } catch (verifyError) {
                console.error(verifyError);
                showToast(
                  'Payment received, but we could not confirm it automatically. Contact support if your credits do not update shortly.',
                  'warning'
                );
              } finally {
                setPurchasingPlan(null);
              }
            })();
          },
          modal: {
            ondismiss: () => setPurchasingPlan(null),
          },
        });

        checkout.open();
      } catch (err) {
        console.error(err);
        showToast(
          err instanceof Error ? err.message : 'Could not start checkout. Please try again.',
          'error'
        );
        setPurchasingPlan(null);
      }
    },
    [subscription, user, showToast, refreshSubscription]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  const currentPlan = subscription?.planId || 'free';

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Billing & Subscription</h1>
        <p className="mt-1 text-neutral-500">Manage your subscription and credits</p>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Your Current Plan</p>
              <h2 className="mt-1 text-2xl font-bold text-neutral-900">
                {PLAN_DETAILS[currentPlan].name}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-500">Monthly</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatINR(PLAN_DETAILS[currentPlan].price)}/month
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Monthly Credits</p>
              <p className="text-2xl font-bold text-neutral-900">
                {PLAN_DETAILS[currentPlan].credits.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Campaigns/Month</p>
              <p className="text-2xl font-bold text-neutral-900">
                {PLAN_DETAILS[currentPlan].campaigns}
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            {PLAN_DETAILS[currentPlan].features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-neutral-600">
                <svg
                  className="text-success-500 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-neutral-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <p className="mb-2 text-sm text-neutral-500">
              Credit Top-Up Packs (No Subscription Required) — purchasable one-time packs are coming
              soon; subscription plans below are available now
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TOP_UP_PACKS.map((pack) => (
                <div
                  key={pack.credits}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center"
                >
                  <p className="font-medium text-neutral-900">
                    {pack.credits.toLocaleString('en-IN')} credits
                  </p>
                  <p className="text-brand-600 mt-1 text-2xl font-bold">
                    ₹{pack.price.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    ~₹{Math.round((pack.price / pack.credits) * 100)}/campaign
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-6 text-xl font-bold text-neutral-900">Available Plans</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(PLAN_DETAILS) as SubscriptionPlan[]).map((plan) => {
            const isCurrent = plan === currentPlan;
            const isFree = plan === 'free';
            return (
              <div
                key={plan}
                className={`relative rounded-xl border-2 bg-white transition-all duration-200 ${
                  plan === currentPlan
                    ? 'border-brand-500 shadow-brand-500/10 shadow-lg'
                    : 'hover:border-brand-300 border-neutral-200'
                }`}
              >
                {!isFree && isCurrent && (
                  <div className="bg-brand-600 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-medium text-white">
                    Current Plan
                  </div>
                )}
                <div className="p-6">
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold text-neutral-900">
                      {PLAN_DETAILS[plan].name}
                    </h3>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-3xl font-bold text-neutral-900">
                        {formatINR(PLAN_DETAILS[plan].price)}
                      </span>
                      {PLAN_DETAILS[plan].price > 0 && (
                        <span className="text-neutral-500">/month</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                      <span className="text-neutral-600">Monthly Credits</span>
                      <span className="font-bold text-neutral-900">
                        {PLAN_DETAILS[plan].credits.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                      <span className="text-neutral-600">Campaigns/Month</span>
                      <span className="font-bold text-neutral-900">
                        {PLAN_DETAILS[plan].campaigns}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {PLAN_DETAILS[plan].features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-neutral-600">
                        <svg
                          className="text-success-500 h-4 w-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-neutral-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => void handleUpgrade(plan)}
                    disabled={plan === currentPlan || isFree || purchasingPlan !== null}
                    className={`mt-6 w-full rounded-lg px-4 py-3 font-medium transition-colors ${
                      plan === currentPlan || isFree
                        ? 'cursor-not-allowed bg-neutral-100 text-neutral-600'
                        : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60'
                    }`}
                  >
                    {plan === currentPlan
                      ? 'Current Plan'
                      : isFree
                        ? 'Free Plan'
                        : purchasingPlan === plan
                          ? 'Opening checkout…'
                          : 'Upgrade to this Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

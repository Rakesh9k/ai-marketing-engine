'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { subscriptionService } from '@/services/database';
import type { Subscription, SubscriptionPlan } from '@/types';
import { formatINR } from '@/lib/utils';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { callFunction } from '@/services/api';
import { submitPayUCheckout, type PayUCheckoutParams } from '@/lib/payu/submitCheckout';
import { useToast } from '@/hooks/useToast';

interface CancelSubscriptionResponse {
  success: boolean;
  alreadyCanceled: boolean;
  currentPeriodEnd: string;
}

const TOP_UP_PACKS = [
  { credits: 500, price: 499, label: 'Small Pack' },
  { credits: 1200, price: 999, label: 'Medium Pack' },
  { credits: 3000, price: 1999, label: 'Large Pack' },
];

export default function BillingPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState<SubscriptionPlan | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  // PayU migration: createPayUPayment computes the authoritative
  // amount/credits server-side from pricing.ts and returns the exact
  // hidden-form fields (including a server-generated hash) for PayU
  // Hosted Checkout — a full-page redirect, not an in-page popup like the
  // previous Razorpay integration. The browser never sees the PayU salt.
  // Credits are granted exclusively by payuWebhook.ts (server-to-server);
  // this page never grants credits itself — it just initiates checkout and,
  // on return (see the payu= query param handling below), refreshes the
  // subscription from Firestore to reflect whatever the webhook already did.
  const handleUpgrade = useCallback(
    async (plan: SubscriptionPlan) => {
      if (plan === 'free' || plan === subscription?.planId) {
        return;
      }

      setPurchasingPlan(plan);
      try {
        const payment = await callFunction<{ planId: SubscriptionPlan }, PayUCheckoutParams>({
          functionName: 'createPayUPayment',
          data: { planId: plan },
        });

        // Navigates the browser away to PayU — no further code here runs
        // in this tab; purchasingPlan intentionally stays set until then.
        submitPayUCheckout(payment);
      } catch (err) {
        console.error(err);
        showToast(
          err instanceof Error ? err.message : 'Could not start checkout. Please try again.',
          'error'
        );
        setPurchasingPlan(null);
      }
    },
    [subscription, showToast]
  );

  // Handles the return from PayU's checkout redirect (payuCallback.ts sends
  // the browser back to /billing?payu=<status>&txnid=<id>). This is
  // COSMETIC ONLY — the actual credit grant already happened (or didn't)
  // server-side via payuWebhook.ts before this page even loads; refreshing
  // the subscription here just reflects that real state, it never trusts
  // the query param as proof of anything.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payuStatus = params.get('payu');
    if (!payuStatus) return;

    if (payuStatus === 'success') {
      showToast('Payment received! Your credits will reflect within a few moments.', 'success');
    } else if (payuStatus === 'pending') {
      showToast('Your payment is being processed. This page will update shortly.', 'info');
    } else if (payuStatus === 'failure' || payuStatus === 'usercancel') {
      showToast('Payment was not completed. No credits were charged.', 'warning');
    } else if (payuStatus === 'unverified') {
      showToast(
        'We could not verify the payment response. Contact support if this seems wrong.',
        'warning'
      );
    }

    setPurchasingPlan(null);
    void refreshSubscription();
    // Clean the query params without a full navigation/reload.
    window.history.replaceState({}, '', '/billing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancelSubscription = useCallback(async () => {
    if (!subscription || subscription.planId === 'free') return;
    if (
      !window.confirm(
        'Cancel your subscription? You will keep access and remaining credits until the end of your current billing period, then your account reverts to the Free plan. This does not issue a refund.'
      )
    ) {
      return;
    }
    setCanceling(true);
    try {
      const result = await callFunction<Record<string, never>, CancelSubscriptionResponse>({
        functionName: 'cancelSubscription',
        data: {},
      });
      showToast(
        result.alreadyCanceled
          ? 'Your subscription is already set to cancel at the end of the current period.'
          : 'Subscription canceled. You keep access until the end of your current billing period.',
        'success'
      );
      await refreshSubscription();
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : 'Could not cancel subscription. Please try again.',
        'error'
      );
    } finally {
      setCanceling(false);
    }
  }, [subscription, showToast, refreshSubscription]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.email || deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return;
    }
    if (
      !window.confirm(
        'This permanently deletes your login and archives your businesses. This cannot be undone from the app. Continue?'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await callFunction<{ confirm: true }, { success: boolean }>({
        functionName: 'requestAccountDeletion',
        data: { confirm: true },
      });
      showToast('Your account has been deleted.', 'success');
      await logout();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes('sign out and sign back in') ||
        lowerMessage.includes('active subscription')
      ) {
        showToast(message, 'error');
      } else {
        showToast('Could not delete account. Please try again or contact support.', 'error');
      }
    } finally {
      setDeleting(false);
    }
  }, [user, deleteConfirmEmail, showToast, logout]);

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
              {subscription?.cancelAtPeriodEnd && (
                <p className="text-warning-600 mt-1 text-sm">
                  Cancels at the end of your current period (
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')})
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-500">Monthly</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatINR(PLAN_DETAILS[currentPlan].price)}/month
              </p>
              {currentPlan !== 'free' && !subscription?.cancelAtPeriodEnd && (
                <button
                  onClick={() => void handleCancelSubscription()}
                  disabled={canceling}
                  className="text-error-600 hover:text-error-700 mt-2 text-sm underline disabled:opacity-60"
                >
                  {canceling ? 'Canceling…' : 'Cancel subscription'}
                </button>
              )}
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

      <div className="mx-auto mt-8 max-w-4xl">
        <div className="border-error-200 rounded-xl border bg-white p-6">
          <h2 className="text-error-700 text-lg font-bold">Danger zone</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Deleting your account removes your login and archives your businesses. Some records
            (such as billing history) may be retained where legally required — see our{' '}
            <a href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </a>
            . This cannot be undone from the app.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="delete-confirm-email" className="sr-only">
              Type your email to confirm account deletion
            </label>
            <input
              id="delete-confirm-email"
              type="email"
              placeholder={`Type "${user?.email ?? 'your email'}" to confirm`}
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:max-w-xs"
            />
            <button
              onClick={() => void handleDeleteAccount()}
              disabled={
                deleting ||
                !user?.email ||
                deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
              }
              className="bg-error-600 hover:bg-error-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            For your security, you may be asked to sign out and back in again if you signed in a
            while ago.
          </p>
        </div>
      </div>
    </div>
  );
}

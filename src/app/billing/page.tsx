'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  subscriptionService,
  usageService,
  transactionService,
  businessService,
} from '@/services/database';
import type { Subscription, SubscriptionPlan, Usage, Transaction, BillingCycle } from '@/types';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { callFunction } from '@/services/api';
import { getTierPriceId, intervalOf } from '@/lib/paddle/catalog';
import { usePaddlePrices } from '@/features/billing/usePaddlePrices';
import { usePaddleCheckout } from '@/features/billing/usePaddleCheckout';
import { useSyncPaddleCustomer } from '@/features/billing/useSyncPaddleCustomer';
import { PaddlePrice, PriceStatusBanner } from '@/features/billing/components/PaddlePrice';
import { CreditPackCards } from '@/features/billing/components/CreditPackCards';
import { isVisibleTransaction } from '@/features/billing/visibleTransactions';
import { settleRead } from '@/features/billing/readState';
import { useToast } from '@/hooks/useToast';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

interface CancelSubscriptionResponse {
  success: boolean;
  alreadyCanceled: boolean;
  currentPeriodEnd: string;
}

export default function BillingPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  useSyncPaddleCustomer(user?.uid);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [businessCount, setBusinessCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  // Names of reads that FAILED (distinct from "document does not exist"). While the subscription or
  // usage read has failed we do not know the user's entitlement, so we must not show any plan.
  const [failedReads, setFailedReads] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  // Plan requested via /billing?plan=...&cycle=... (e.g. right after signup); started once prices load.
  const [autoPlan, setAutoPlan] = useState<{ plan: SubscriptionPlan; cycle: BillingCycle } | null>(
    null
  );
  const { state: priceState, catalog, retry: retryPrices } = usePaddlePrices();
  const { pendingKey, start: startCheckout } = usePaddleCheckout((message) =>
    showToast(message, 'error')
  );
  const [canceling, setCanceling] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const refreshBillingData = useCallback(async () => {
    if (!user) return;
    const [subscriptionRead, usageRead, txRead, businessRead] = await Promise.all([
      settleRead('subscription', () => subscriptionService.getByUserId(user.uid)),
      settleRead('usage', () => usageService.getCurrentPeriod(user.uid)),
      settleRead('transactions', () => transactionService.listByUser(user.uid)),
      settleRead('businesses', () => businessService.getByUserId(user.uid)),
    ]);

    const failed: string[] = [];
    // A missing document is `null` on a SUCCESSFUL read (documented default: Free). A failed read is
    // not: keep whatever we last knew, and flag it so the UI says "can't load" instead of "Free".
    if (subscriptionRead.ok) setSubscription(subscriptionRead.value);
    else failed.push('subscription');
    if (usageRead.ok) setUsage(usageRead.value);
    else failed.push('usage');
    if (txRead.ok) setTransactions(txRead.value ?? []);
    else failed.push('transactions');
    if (businessRead.ok) setBusinessCount(businessRead.value ? businessRead.value.length : 1);
    setFailedReads(failed);
  }, [user]);

  useEffect(() => {
    async function loadBillingData() {
      if (!user) return;
      try {
        setLoading(true);
        await refreshBillingData();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    void loadBillingData();
  }, [user, refreshBillingData]);

  const handleUpgrade = useCallback(
    (plan: SubscriptionPlan, cycle: BillingCycle = billingCycle) => {
      if (plan === 'free' || plan === subscription?.planId) return;
      const expectedPriceId = getTierPriceId(catalog, plan, intervalOf(cycle));
      if (!expectedPriceId) {
        showToast('This plan is not available for checkout right now.', 'error');
        return;
      }
      void startCheckout({ kind: 'plan', planId: plan, billingCycle: cycle, expectedPriceId });
    },
    [subscription, billingCycle, catalog, showToast, startCheckout]
  );

  const handleBuyTopUp = useCallback(
    (credits: number, expectedPriceId: string) => {
      void startCheckout({ kind: 'pack', credits, expectedPriceId });
    },
    [startCheckout]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    // PayU return params (?payu=) are no longer produced - its callback is not deployed.
    const status = params.get('paddle');
    const requestedPlan = params.get('plan') as SubscriptionPlan | null;
    const requestedCycle = params.get('cycle') as BillingCycle | null;

    if (requestedCycle) {
      setBillingCycle(requestedCycle);
    }

    if (status === 'success') {
      showToast(
        'Payment received! Your limits and credits will reflect within a few moments.',
        'success'
      );
    } else if (status === 'pending') {
      showToast('Your payment is being processed. This page will update shortly.', 'info');
    } else if (status === 'failure' || status === 'usercancel') {
      showToast('Payment was not completed.', 'warning');
    }

    if (status) {
      void refreshBillingData();
      window.history.replaceState({}, '', '/billing');
    } else if (requestedPlan && requestedPlan !== 'free') {
      setAutoPlan({ plan: requestedPlan, cycle: requestedCycle || 'yearly' });
      window.history.replaceState({}, '', '/billing');
    }
  }, [showToast, refreshBillingData]);

  // Start the requested checkout only once Paddle's prices are on screen, so the customer
  // never lands in an overlay for a price they were not shown.
  useEffect(() => {
    if (!autoPlan || loading || priceState.status !== 'ready') return;
    handleUpgrade(autoPlan.plan, autoPlan.cycle);
    setAutoPlan(null);
  }, [autoPlan, loading, priceState.status, handleUpgrade]);

  const handleCancelSubscription = useCallback(async () => {
    if (!subscription || subscription.planId === 'free') return;
    if (
      !window.confirm(
        'Cancel your subscription? You will keep access and remaining outputs until the end of your current billing period, then your account reverts to the Free plan. This does not issue a refund.'
      )
    ) {
      return;
    }
    setCanceling(true);
    try {
      const result = await callFunction<Record<string, never>, CancelSubscriptionResponse>({
        functionName: 'cancelPaddleSubscription',
        data: {},
      });
      showToast(
        result.alreadyCanceled
          ? 'Your subscription is already set to cancel at the end of the current period.'
          : 'Subscription canceled. You keep access until the end of your current billing period.',
        'success'
      );
      await refreshBillingData();
    } catch (err) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : 'Could not cancel subscription. Please try again.',
        'error'
      );
    } finally {
      setCanceling(false);
    }
  }, [subscription, showToast, refreshBillingData]);

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
    return <PageSkeleton variant="cards" />;
  }

  const entitlementUnknown = failedReads.includes('subscription') || failedReads.includes('usage');
  const visibleTransactions = transactions.filter(isVisibleTransaction);
  const currentPlan: SubscriptionPlan = subscription?.planId || 'free';
  const planDetails = PLAN_DETAILS[currentPlan] ?? PLAN_DETAILS.free;
  const creditsIncluded = usage?.creditsIncluded ?? planDetails.credits;
  const creditsUsed = usage?.creditsUsed ?? 0;
  const creditsAvailable = Math.max(0, creditsIncluded - creditsUsed);

  return (
    <div className="bg-bg-primary min-h-screen pb-12">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-neutral-900">Billing &amp; Subscription</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manage output allowances, brand limits, billing cycle, and credits.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                billingCycle === 'yearly' ? 'bg-brand-600 text-white shadow-xs' : 'text-neutral-500'
              }`}
            >
              <span>Yearly</span>
              <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-neutral-900 uppercase">
                Best value
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Plan & Output Allowances Summary */}
          {entitlementUnknown ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"
            >
              <h2 className="text-lg font-black">We couldn&apos;t load your billing details.</h2>
              <p className="mt-1">
                Your plan and credits haven&apos;t changed — this is a loading problem on our side,
                not a change to your account. Please try again in a moment.
              </p>
              <button
                type="button"
                onClick={() => void refreshBillingData()}
                className="mt-3 rounded-lg bg-amber-900 px-4 py-2 text-xs font-bold text-white"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-6 sm:flex-row sm:items-center">
                <div>
                  <span className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                    Current Active Subscription
                  </span>
                  <h2 className="mt-1 text-3xl font-black text-neutral-900">
                    {planDetails.name} Plan
                  </h2>
                  {subscription?.cancelAtPeriodEnd && (
                    <p className="text-warning-600 mt-1 text-xs font-semibold">
                      Cancels at period end (
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')})
                    </p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-neutral-500">
                    {billingCycle === 'yearly' ? 'Yearly Billing' : 'Monthly Billing'}
                  </p>
                  <p className="text-2xl font-black text-neutral-900">
                    {currentPlan === 'free' ? (
                      'Free'
                    ) : (
                      <PaddlePrice
                        state={priceState}
                        priceId={getTierPriceId(catalog, currentPlan, intervalOf(billingCycle))}
                      />
                    )}
                    <span className="text-xs font-medium text-neutral-500">
                      /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </p>
                  {currentPlan !== 'free' && !subscription?.cancelAtPeriodEnd && (
                    <button
                      onClick={() => void handleCancelSubscription()}
                      disabled={canceling}
                      className="text-error-600 hover:text-error-700 mt-2 text-xs font-medium underline disabled:opacity-60"
                    >
                      {canceling ? 'Canceling…' : 'Cancel subscription'}
                    </button>
                  )}
                </div>
              </div>

              {/* Output Entitlements & Usage Meters */}
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-bold text-neutral-900">
                  Monthly Content Allowances
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-[11px] font-bold text-amber-800 uppercase">🎬 AI Reels</p>
                    <p className="mt-1 text-2xl font-black text-neutral-900">
                      {planDetails.reels}{' '}
                      <span className="text-xs font-normal text-neutral-500">/mo</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                      Vertical video concepts
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                    <p className="text-[11px] font-bold text-orange-800 uppercase">
                      🎨 Social Creatives
                    </p>
                    <p className="mt-1 text-2xl font-black text-neutral-900">
                      {planDetails.creatives}{' '}
                      <span className="text-xs font-normal text-neutral-500">/mo</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-orange-700">
                      Posters &amp; ad visuals
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="text-[11px] font-bold text-blue-800 uppercase">
                      📲 Story Concepts
                    </p>
                    <p className="mt-1 text-2xl font-black text-neutral-900">
                      {planDetails.stories}{' '}
                      <span className="text-xs font-normal text-neutral-500">/mo</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-blue-700">
                      Daily story updates
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">
                      🏢 Business Profiles
                    </p>
                    <p className="mt-1 text-2xl font-black text-neutral-900">
                      {businessCount} / {planDetails.maxBusinesses}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                      Brands managed
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Ledger Secondary Card */}
              <div className="mt-6 border-t border-neutral-100 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                      Internal Credit Ledger Balance
                    </h4>
                    <p className="text-xs text-neutral-500">
                      1 Credit = ₹1 INR canonical valuation
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-brand-600 text-xl font-black">
                      {creditsAvailable.toLocaleString('en-IN')} Credits
                    </span>
                    <span className="block text-xs text-neutral-400">
                      Available of {creditsIncluded.toLocaleString('en-IN')} total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top-Up Credit Packs */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-neutral-900">Instant Credit Top-Up Packs</h3>
            <p className="mb-4 text-xs text-neutral-500">
              Need extra generations without changing your main plan? Add instant credit packs.
            </p>
            <CreditPackCards
              catalog={catalog}
              prices={priceState}
              pendingKey={pendingKey}
              onBuy={handleBuyTopUp}
              disabled={entitlementUnknown}
            />
          </div>

          {/* Available Subscription Plans */}
          <div>
            <h2 className="mb-4 text-xl font-black text-neutral-900">Subscription Plans</h2>
            <PriceStatusBanner state={priceState} onRetry={retryPrices} />
            {subscription && subscription.planId !== 'free' && !subscription.cancelAtPeriodEnd && (
              <p className="mb-4 text-xs text-neutral-500">
                Switching plans in place isn&apos;t available yet. To move to a different plan,
                cancel at period end and subscribe again afterwards.
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(PLAN_DETAILS) as SubscriptionPlan[]).map((planKey) => {
                const plan = PLAN_DETAILS[planKey];
                const isCurrent = planKey === currentPlan;
                const isFree = planKey === 'free';
                const isPro = planKey === 'pro';
                const period = billingCycle === 'yearly' ? '/yr' : '/mo';
                const tierPriceId = getTierPriceId(catalog, planKey, intervalOf(billingCycle));
                const priceShown =
                  priceState.status === 'ready' &&
                  !!tierPriceId &&
                  priceState.prices[tierPriceId] !== undefined;

                return (
                  <div
                    key={planKey}
                    className={`relative flex flex-col justify-between rounded-2xl border-2 bg-white p-5 transition-all ${
                      isPro
                        ? 'border-brand-500 ring-brand-500/20 shadow-md ring-2'
                        : isCurrent
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {isPro && (
                      <div className="bg-brand-600 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-black text-white uppercase shadow-xs">
                        MOST POPULAR
                      </div>
                    )}

                    {!isFree && isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white uppercase shadow-xs">
                        Current Plan
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-extrabold text-neutral-900">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-2xl font-black text-neutral-900">
                          {isFree ? (
                            'Free'
                          ) : (
                            <PaddlePrice state={priceState} priceId={tierPriceId} />
                          )}
                        </span>
                        {!isFree && <span className="text-xs text-neutral-500">{period}</span>}
                      </div>

                      {/* Output Highlights */}
                      <div className="mt-4 space-y-1.5 rounded-lg bg-neutral-50 p-2.5 text-xs font-semibold text-neutral-700">
                        <div className="flex justify-between">
                          <span>Reels:</span>
                          <span className="text-brand-600 font-bold">{plan.reels}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Creatives:</span>
                          <span className="text-brand-600 font-bold">{plan.creatives}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stories:</span>
                          <span className="text-brand-600 font-bold">{plan.stories}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Brands:</span>
                          <span className="font-bold text-neutral-900">{plan.maxBusinesses}</span>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-1.5 text-xs text-neutral-600">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-bold text-emerald-600">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleUpgrade(planKey, billingCycle)}
                      disabled={
                        isCurrent ||
                        isFree ||
                        pendingKey !== null ||
                        !priceShown ||
                        entitlementUnknown
                      }
                      className={`mt-6 w-full rounded-xl py-2.5 text-xs font-bold transition-all ${
                        isCurrent || isFree
                          ? 'cursor-not-allowed bg-neutral-100 text-neutral-500'
                          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs disabled:opacity-60'
                      }`}
                    >
                      {isCurrent
                        ? 'Current Plan'
                        : isFree
                          ? 'Free Plan'
                          : pendingKey === `plan:${planKey}:${billingCycle}`
                            ? 'Opening checkout…'
                            : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900">Transaction History</h2>
            <p className="mb-4 text-xs text-neutral-500">
              Recent credit reservations, deductions, refunds, and purchases
            </p>

            {visibleTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-xs text-neutral-500">
                {failedReads.includes('transactions')
                  ? "We couldn't load your transaction history right now."
                  : 'No transactions recorded yet this period.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleTransactions.map((tx) => {
                      const isPositive =
                        tx.amount > 0 ||
                        tx.type === 'credit_purchase' ||
                        tx.type === 'refund' ||
                        tx.type === 'grant';
                      const formattedDate = tx.createdAt
                        ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <tr key={tx.transactionId} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                            {formattedDate}
                          </td>
                          <td className="px-4 py-3 font-semibold text-neutral-900">
                            {tx.description}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 capitalize">
                            {tx.type.replace('_', ' ')}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                              isPositive ? 'text-emerald-600' : 'text-neutral-900'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {tx.amount}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                tx.status === 'completed' || (tx.status as string) === 'success'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Deleting your account removes your login and archives your businesses. Some records
              may be retained where legally required. This cannot be undone.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="delete-confirm-email"
                type="email"
                placeholder={`Type "${user?.email ?? 'your email'}" to confirm`}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs sm:max-w-xs"
              />
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={
                  deleting ||
                  !user?.email ||
                  deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

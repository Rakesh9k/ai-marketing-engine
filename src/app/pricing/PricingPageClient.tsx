'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import type { BillingTerm } from '@/lib/config/planCatalogue.generated';
import {
  useCashfreeCheckout,
  type CheckoutProblemKind,
} from '@/features/billing/useCashfreeCheckout';
import { CheckoutPhonePrompt } from '@/features/billing/CheckoutPhonePrompt';
import { CreditPackCards } from '@/features/billing/components/CreditPackCards';
import {
  CheckoutConfirmDialog,
  type CheckoutProblem,
} from '@/features/pricing/CheckoutConfirmDialog';
import {
  buildCheckoutSummary,
  buildCreditExamples,
  buildFreeView,
  buildOperationCosts,
  buildPlanViews,
  describeAllocation,
  formatINR,
  formatPercent,
  suggestPlan,
  type PaidPlanId,
  type PlanView,
} from '@/features/pricing/pricingModel';
import { useToast } from '@/hooks/useToast';
import { useExperiment } from '@/features/experiments/useExperiment';
import { trackEvent } from '@/lib/analytics/trackEvent';

// ─── Plain-language positioning. Facts (limits, prices) are read from the catalogue; only the wording is here. ──
const WHO_FOR: Record<PaidPlanId, string> = {
  starter: 'One business that wants a steady rhythm of campaigns each month.',
  business: 'One business that wants its brand kit applied and reels included.',
  pro: 'Owners running a few businesses, or one business that creates a lot.',
  agency: 'Many branches or client businesses under one login.',
};

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is this a subscription? Will I be charged again?',
    a: 'No. Every plan is a one-time payment for a fixed number of days: 30 days or 365 days. Nothing renews by itself and we never charge you again unless you choose to buy another term. There is no free trial. When your term ends you return to the Free plan, and you can buy again from the Billing page whenever you like.',
  },
  {
    q: 'What do I get for free, and is there a trial?',
    a: 'There is no trial and no countdown. When you have verified your email and set up your business, Mitra gives you 140 free credits once, with no card needed. They do not expire; they are used after any paid plan credits you have, and what you do not use stays with you. That is enough for your first full campaign (100 credits) plus a few edits.',
  },
  {
    q: 'Do unused credits roll over?',
    a: "Plan credits: no. A plan's credits belong to the period you paid for. A 30-day plan's credits last for its 30 days; a yearly plan adds that month's credits at the start of each monthly period of the year, not all at once. Credits you have not used when a period ends do not roll over into the next one. Credit top-up packs are valid only for the calendar month you buy them in. Your one-time free starter credits do not expire.",
  },
  {
    q: 'What is a credit, and how many campaigns will my plan give me?',
    a: 'Credits pay for the work Mitra does for you, and different work costs different amounts: creating a campaign costs more than regenerating one item. The cost of each action is listed on this page. Because how you use credits changes what you can make, we do not promise a fixed number of campaigns; the examples above show how credits are spent.',
  },
  {
    q: 'Is the yearly option really cheaper?',
    a: 'We compare it with the thing you would otherwise do: buying the monthly plan twelve times at its current price. The saving shown on each plan is that difference, worked out from the prices on this page. Twelve 30-day purchases cover 360 days, while the yearly term is 365 days. You pay the full yearly amount today, and you receive the credits month by month, not all at once.',
  },
  {
    q: 'Can I buy again before my access ends?',
    a: 'Yes, for the same plan and the same term length. The new term is added after your current access ends, so you do not lose days. To move to a different plan, buy it after your current term ends. We do not prorate or switch plans in the middle of a term.',
  },
  {
    q: 'What if my payment fails or I am charged and see nothing?',
    a: 'If a payment fails you are not charged for the plan. If your bank took the money and your plan has not appeared, open Billing: it checks the payment with our payment partner and shows its status. If it still is not resolved, contact support and we will look into it.',
  },
  {
    q: 'What about refunds?',
    a: 'Our refund policy explains what can be refunded and how to ask. Please read it before you buy.',
  },
  {
    q: 'Are my payments secure?',
    a: 'Yes. Payments are processed over encrypted channels by our payment partner, Cashfree Payments. We never store raw payment details on our servers.',
  },
];

const NOT_YET = [
  'Scheduling and automatic publishing to social media',
  'Analytics dashboards for your posts',
  'Automatic sending of WhatsApp messages (Mitra writes the copy for you to send yourself)',
];

type Cycle = BillingTerm;

export default function PricingPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { status: authStatus, user } = useAuth();

  const plans = useMemo(() => buildPlanViews(), []);
  const free = useMemo(() => buildFreeView(), []);
  const operations = useMemo(() => buildOperationCosts(), []);
  const examples = useMemo(() => buildCreditExamples(), []);
  const mainPlans = plans.filter((p) => p.planId !== 'agency');
  const agency = plans.find((p) => p.planId === 'agency');
  const reelCost = operations.find((o) => o.operation === 'reel_generation')?.credits ?? 0;

  // Monthly is the default: the annual option is never pre-selected.
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [confirmPlan, setConfirmPlan] = useState<PaidPlanId | null>(null);
  const [problem, setProblem] = useState<CheckoutProblem | null>(null);

  const {
    pendingKey,
    start: startCheckout,
    phonePrompt,
    submitPhone,
    cancelPhone,
  } = useCashfreeCheckout((message: string, kind?: CheckoutProblemKind) => {
    if (kind === 'unavailable') {
      setProblem({ kind: 'unavailable', message });
    } else if (confirmPlan) {
      setProblem({ kind: 'error', message });
    } else {
      showToast(message, 'error');
    }
  });

  // Activation measurement: a signed-in user looked at the plans. Nothing is sent with it.
  useEffect(() => {
    if (authStatus === 'authenticated') trackEvent({ eventName: 'pricing_page_viewed' });
  }, [authStatus]);

  // ─── Auth & subscription state ───────────────────────────────────────────
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  // A paid term that has not ended yet: another plan cannot be bought until it does (no proration).
  const [hasLiveSubscription, setHasLiveSubscription] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) {
      setActivePlanId(null);
      setHasLiveSubscription(false);
      setSubError(false);
      return;
    }

    let cancelled = false;

    async function fetchSubscription() {
      setSubLoading(true);
      setSubError(false);
      try {
        const db = getFirebaseDb();
        if (!db || !user) return;

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;

        const subscriptionId = userSnap.exists()
          ? (userSnap.data()['subscriptionId'] as string | undefined)
          : undefined;

        if (!subscriptionId) {
          setActivePlanId('free');
          return;
        }

        const subSnap = await getDoc(doc(db, 'subscriptions', subscriptionId));
        if (cancelled) return;

        if (subSnap.exists()) {
          const subData = subSnap.data();
          // Prepaid fixed term: entitled only while the paid-through date is in the future.
          const endRaw = subData['currentPeriodEnd'];
          const notEnded = !endRaw || new Date(endRaw as string).getTime() > Date.now();
          const isActive = subData['status'] === 'active' && notEnded;
          setActivePlanId(isActive ? (subData['planId'] as string) : 'free');
          setHasLiveSubscription(isActive && subData['planId'] !== 'free');
        } else {
          setActivePlanId('free');
        }
      } catch {
        setActivePlanId(null);
        setSubError(true);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    }

    void fetchSubscription();
    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  const signedIn = authStatus === 'authenticated';
  // Presentation-only experiment (none runs unless the reviewed server registry says so): how the saving is framed.
  const savingVariant = useExperiment(
    'annual_saving_display',
    ['amount_only', 'effective_monthly'] as const,
    signedIn && !hasLiveSubscription
  );
  const termWord = cycle === 'yearly' ? '365 days' : '30 days';

  function ctaLabel(plan: PlanView): string {
    if (!signedIn) return `Buy ${termWord} of ${plan.name}`;
    if (subLoading) return 'Checking your plan…';
    if (activePlanId === plan.planId) return 'Current plan';
    if (hasLiveSubscription) return 'Manage in Billing';
    return `Buy ${termWord} of ${plan.name}`;
  }

  function ctaDisabled(plan: PlanView): boolean {
    if (signedIn && subLoading) return true;
    if (activePlanId === plan.planId) return true;
    if (hasLiveSubscription) return false;
    return pendingKey !== null;
  }

  function onChoose(planId: PaidPlanId) {
    if (!signedIn) {
      router.push(`/signup?plan=${planId}&cycle=${cycle}`);
      return;
    }
    if (activePlanId === planId) return;
    if (hasLiveSubscription) {
      router.push('/billing');
      return;
    }
    setProblem(null);
    setConfirmPlan(planId);
  }

  function onConfirmPurchase() {
    if (!confirmPlan) return;
    setProblem(null);
    void startCheckout({ kind: 'plan', planId: confirmPlan, billingCycle: cycle });
  }

  function closeConfirm() {
    setConfirmPlan(null);
    setProblem(null);
  }

  const summary = confirmPlan && !phonePrompt ? buildCheckoutSummary(confirmPlan, cycle) : null;
  const confirmPending = confirmPlan !== null && pendingKey === `plan:${confirmPlan}:${cycle}`;

  // ─── "Which plan fits?" helper: an aid, not a recommendation. Nothing is highlighted until it is used. ────
  const [fitTouched, setFitTouched] = useState(false);
  const [fitCampaigns, setFitCampaigns] = useState(4);
  const [fitBusinesses, setFitBusinesses] = useState(1);
  const [fitReels, setFitReels] = useState(false);
  const fit = suggestPlan({
    campaignsPerMonth: fitCampaigns,
    businesses: fitBusinesses,
    needsReels: fitReels,
  });
  const fitPlanId = fitTouched && fit?.kind === 'plan' ? fit.view.planId : null;

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      <LandingNav />

      <main id="main-content" className="mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6 lg:px-8">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-brand-700 text-sm font-medium tracking-wide">Pricing</p>
          <h1 className="text-text-primary mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pay once for the days you need.
          </h1>
          <p className="text-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Every Mitra plan is a one-time payment for 30 or 365 days. Nothing renews by itself, and
            you are never charged again unless you choose to buy another term.
          </p>
        </header>

        {/* ── Term choice ────────────────────────────────────────────────── */}
        <fieldset className="mx-auto mt-10 max-w-md">
          <legend className="sr-only">Choose how long to buy for</legend>
          <div className="border-border-medium bg-bg-secondary grid grid-cols-2 gap-1 rounded-xl border p-1">
            {(
              [
                ['monthly', '30 days', 'Pay each time'],
                ['yearly', '1 year', 'Pay once'],
              ] as const
            ).map(([value, title, sub]) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="term"
                  value={value}
                  checked={cycle === value}
                  onChange={() => setCycle(value)}
                  className="peer sr-only"
                />
                <span className="peer-checked:bg-bg-primary peer-checked:text-text-primary text-text-secondary peer-focus-visible:ring-brand-500 peer-checked:border-border-medium flex flex-col items-center rounded-lg border border-transparent px-3 py-2 text-center peer-focus-visible:ring-2">
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs">{sub}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-text-tertiary mt-3 text-center text-xs">
            One-time payment. No automatic renewal. Prices are in Indian rupees.
          </p>
        </fieldset>

        {hasLiveSubscription && (
          <p className="text-text-secondary mx-auto mt-6 max-w-xl text-center text-sm">
            You already have access to a paid plan. Open{' '}
            <Link href="/billing" className="text-brand-700 underline">
              Billing
            </Link>{' '}
            to see when it ends and to renew it; to switch plans, buy the new one after your access
            ends.
          </p>
        )}
        {subError && (
          <p
            role="status"
            className="text-text-secondary mx-auto mt-6 max-w-xl text-center text-sm"
          >
            We could not check your current plan just now. You can still choose a plan; we check
            again before you pay.
          </p>
        )}

        {/* ── Which plan fits ────────────────────────────────────────────── */}
        <section
          aria-labelledby="fit-heading"
          className="border-border-light bg-surface mx-auto mt-10 max-w-3xl rounded-2xl border p-5 sm:p-6"
        >
          <h2 id="fit-heading" className="text-text-primary text-lg font-semibold">
            Not sure which plan fits?
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Tell us roughly how much you create. This only compares credits and limits; it is not a
            promise of what you will make.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-text-primary block font-medium">Campaigns per month</span>
              <input
                type="number"
                min={0}
                max={60}
                inputMode="numeric"
                value={fitCampaigns}
                onChange={(e) => {
                  setFitTouched(true);
                  setFitCampaigns(Math.min(60, Math.max(0, Number(e.target.value) || 0)));
                }}
                className="border-border-medium bg-bg-primary focus-visible:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-text-primary block font-medium">Businesses</span>
              <input
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={fitBusinesses}
                onChange={(e) => {
                  setFitTouched(true);
                  setFitBusinesses(Math.min(20, Math.max(1, Number(e.target.value) || 1)));
                }}
                className="border-border-medium bg-bg-primary focus-visible:ring-brand-500 mt-1 w-full rounded-lg border px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={fitReels}
                onChange={(e) => {
                  setFitTouched(true);
                  setFitReels(e.target.checked);
                }}
                className="accent-brand-600 h-4 w-4"
              />
              <span className="text-text-primary font-medium">I want reels</span>
            </label>
          </div>
          <p
            aria-live="polite"
            className="text-text-secondary mt-4 text-sm"
            data-testid="fit-result"
          >
            {fit?.kind === 'plan' && (
              <>
                <strong className="text-text-primary">{fit.view.name}</strong> has enough credits
                for {fitCampaigns} {fitCampaigns === 1 ? 'campaign' : 'campaigns'} a month (
                {fit.campaignCredits.toLocaleString('en-IN')} of{' '}
                {fit.view.creditsPerPeriod.toLocaleString('en-IN')} credits), leaving{' '}
                {fit.leftoverCredits.toLocaleString('en-IN')} credits for changes, images
                {fitReels ? ' and reels' : ''}.
              </>
            )}
            {fit?.kind === 'beyond' && fit.reason === 'credits' && (
              <>
                That is more than one {fit.largest.name} period of credits (
                {fit.largest.creditsPerPeriod.toLocaleString('en-IN')}). You can add top-up packs
                below.
              </>
            )}
            {fit?.kind === 'beyond' && fit.reason === 'businesses' && (
              <>
                {fit.largest.name} supports up to {fit.largest.maxBusinesses} businesses. For more,
                please contact us.
              </>
            )}
          </p>
        </section>

        {/* ── Plans ──────────────────────────────────────────────────────── */}
        <section aria-labelledby="plans-heading" className="mt-12">
          <h2 id="plans-heading" className="sr-only">
            Plans
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <li className="border-border-light bg-bg-primary flex flex-col rounded-2xl border p-6">
              <h3 className="text-text-primary text-xl font-semibold">Free</h3>
              <p className="text-text-secondary mt-1 min-h-[3rem] text-sm">
                Try Mitra on your own business before you pay anything.
              </p>
              <p className="mt-4">
                <span className="text-text-primary text-4xl font-semibold tracking-tight">₹0</span>
              </p>
              <p className="text-text-tertiary mt-1 text-xs">No card needed</p>
              <p className="text-text-primary mt-4 text-sm font-medium">
                {free.welcomeCredits} credits, once
              </p>
              <p className="text-text-secondary mt-1 text-xs">
                {free.neverExpire
                  ? 'They do not expire. Whatever you do not use stays with you.'
                  : 'They expire if unused.'}
              </p>
              <FeatureList
                items={[
                  [
                    true,
                    `${free.maxBusinesses} business ${free.maxBusinesses === 1 ? 'profile' : 'profiles'}`,
                  ],
                  [free.brandKit, 'Brand kit'],
                  [free.reels, 'Reels'],
                ]}
              />
              <div className="mt-auto pt-6">
                <Button
                  variant="outline"
                  fullWidth
                  disabled={signedIn}
                  onClick={() => router.push('/signup')}
                >
                  {!signedIn ? 'Start free' : activePlanId === 'free' ? 'Current plan' : 'Included'}
                </Button>
              </div>
            </li>

            {mainPlans.map((plan) => {
              const term = cycle === 'yearly' ? plan.yearly : plan.monthly;
              const isCurrent = signedIn && !subLoading && activePlanId === plan.planId;
              const fits = fitPlanId === plan.planId;
              return (
                <li
                  key={plan.planId}
                  className={`bg-bg-primary relative flex flex-col rounded-2xl border p-6 ${
                    fits ? 'border-brand-500 ring-brand-500 ring-1' : 'border-border-light'
                  }`}
                >
                  {fits && (
                    <p className="bg-brand-50 text-brand-800 absolute -top-3 left-5 rounded-full px-3 py-0.5 text-xs font-medium">
                      Fits your answers
                    </p>
                  )}
                  {isCurrent && (
                    <p className="text-success-600 absolute -top-3 right-5 rounded-full bg-white px-3 py-0.5 text-xs font-medium">
                      Your current plan
                    </p>
                  )}
                  <h3 className="text-text-primary text-xl font-semibold">{plan.name}</h3>
                  <p className="text-text-secondary mt-1 min-h-[3rem] text-sm">
                    {WHO_FOR[plan.planId]}
                  </p>
                  <p className="mt-4">
                    <span className="text-text-primary text-4xl font-semibold tracking-tight">
                      {formatINR(term.priceINR)}
                    </span>
                  </p>
                  <p className="text-text-tertiary mt-1 text-xs">
                    for {term.termDays} days, paid once. No automatic renewal.
                  </p>
                  <p className="text-text-primary mt-4 text-sm font-medium">
                    {describeAllocation(term)}
                  </p>
                  <FeatureList
                    items={[
                      [
                        true,
                        `${plan.maxBusinesses} business ${plan.maxBusinesses === 1 ? 'profile' : 'profiles'}`,
                      ],
                      [plan.brandKit, 'Brand kit'],
                      [plan.reels, `Reels (${reelCost} credits each)`],
                    ]}
                  />
                  <AnnualNote plan={plan} cycle={cycle} variant={savingVariant} />
                  <div className="mt-auto pt-6">
                    <Button
                      variant={hasLiveSubscription || isCurrent ? 'outline' : 'primary'}
                      fullWidth
                      disabled={ctaDisabled(plan)}
                      onClick={() => onChoose(plan.planId)}
                    >
                      {ctaLabel(plan)}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {agency && (
            <div className="border-border-light bg-bg-secondary mt-5 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-text-primary text-lg font-semibold">
                  {agency.name}: more than {mainPlans[mainPlans.length - 1]?.maxBusinesses ?? 3}{' '}
                  businesses
                </h3>
                <p className="text-text-secondary mt-1 text-sm">
                  Up to {agency.maxBusinesses} business profiles, with{' '}
                  {(cycle === 'yearly'
                    ? agency.yearly
                    : agency.monthly
                  ).creditsPerPeriod.toLocaleString('en-IN')}{' '}
                  credits per monthly period.{agency.brandKit ? ' Brand kit included.' : ''}
                  {agency.reels ? ' Reels included.' : ''}
                </p>
                <p className="text-text-primary mt-2 text-sm">
                  <strong>
                    {formatINR((cycle === 'yearly' ? agency.yearly : agency.monthly).priceINR)}
                  </strong>{' '}
                  for {termWord}, paid once.
                </p>
                <AnnualNote plan={agency} cycle={cycle} variant={savingVariant} />
              </div>
              <Button
                variant="outline"
                className="shrink-0 whitespace-nowrap"
                disabled={ctaDisabled(agency)}
                onClick={() => onChoose(agency.planId)}
              >
                {ctaLabel(agency)}
              </Button>
            </div>
          )}
        </section>

        {/* ── Credits explained ──────────────────────────────────────────── */}
        <section aria-labelledby="credits-heading" className="mt-20">
          <div className="max-w-2xl">
            <h2 id="credits-heading" className="text-text-primary text-2xl font-semibold">
              What credits pay for
            </h2>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">
              Credits are not all worth the same. Each action costs the number of credits below, so
              what a plan lets you make depends on what you choose to do with it.
            </p>
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Credits each action costs</caption>
              <thead>
                <tr className="border-border-medium border-b">
                  <th scope="col" className="text-text-tertiary py-2 pr-4 font-medium">
                    Action
                  </th>
                  <th scope="col" className="text-text-tertiary py-2 text-right font-medium">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-light divide-y">
                {operations.map((op) => (
                  <tr key={op.operation}>
                    <th scope="row" className="text-text-primary py-2.5 pr-4 font-normal">
                      {op.label}
                    </th>
                    <td className="text-text-primary py-2.5 text-right font-medium">
                      {op.credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <h3 className="text-text-primary text-base font-semibold">
                Examples of how they add up
              </h3>
              <ul className="mt-3 space-y-3">
                {examples.map((ex) => (
                  <li key={ex.id} className="border-border-light rounded-xl border p-4 text-sm">
                    <p className="text-text-primary font-medium">{ex.title}</p>
                    <p className="text-text-secondary mt-1">
                      {ex.lines.map((l) => `${l.count} ${l.label} (${l.credits})`).join(' + ')} ={' '}
                      <strong className="text-text-primary">{ex.totalCredits} credits</strong>
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-text-tertiary mt-3 text-xs leading-relaxed">
                These are illustrations built from the costs above, not a promise of any number of
                campaigns.
              </p>
            </div>
          </div>
        </section>

        {/* ── Expiry and renewal ─────────────────────────────────────────── */}
        <section aria-labelledby="terms-heading" className="mt-20">
          <h2 id="terms-heading" className="text-text-primary text-2xl font-semibold">
            How access and credits end
          </h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-text-primary font-medium">Manual renewal</dt>
              <dd className="text-text-secondary mt-1 text-sm leading-relaxed">
                Each purchase is one payment for one term. There is no automatic renewal. When your
                access ends you return to Free, and you buy again if you want to continue.
              </dd>
            </div>
            <div>
              <dt className="text-text-primary font-medium">Plan credits expire</dt>
              <dd className="text-text-secondary mt-1 text-sm leading-relaxed">
                A 30-day plan&apos;s credits last for its 30 days. A yearly plan adds each
                month&apos;s credits at the start of that monthly period. Unused plan credits do not
                roll over.
              </dd>
            </div>
            <div>
              <dt className="text-text-primary font-medium">Free credits do not expire</dt>
              <dd className="text-text-secondary mt-1 text-sm leading-relaxed">
                Your one-time {free.welcomeCredits} free credits stay until you use them. They are
                spent after your paid plan credits. Top-up packs are valid for the calendar month
                you buy them in.
              </dd>
            </div>
          </dl>
          <div className="border-border-light mt-8 rounded-xl border p-5">
            <h3 className="text-text-primary text-base font-semibold">Not available yet</h3>
            <ul className="text-text-secondary mt-2 list-inside list-disc space-y-1 text-sm">
              {NOT_YET.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-text-tertiary mt-3 text-xs">
              We list these so you do not buy a plan expecting them.
            </p>
          </div>
        </section>

        {/* ── Comparison table ───────────────────────────────────────────── */}
        <section aria-labelledby="compare-heading" className="mt-20">
          <h2 id="compare-heading" className="text-text-primary text-2xl font-semibold">
            Compare plans side by side
          </h2>
          <div className="border-border-light mt-6 overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">
                Comparison of Free, {plans.map((p) => p.name).join(', ')}: price, credits, limits
                and included features
              </caption>
              <thead>
                <tr className="border-border-medium bg-bg-secondary border-b">
                  <th scope="col" className="text-text-primary p-4 font-medium">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="text-text-primary p-4 font-semibold">
                    Free
                  </th>
                  {plans.map((p) => (
                    <th key={p.planId} scope="col" className="text-text-primary p-4 font-semibold">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border-light divide-y">
                <CompareRow
                  label="Price for 30 days"
                  free="₹0"
                  cells={plans.map((p) => formatINR(p.monthly.priceINR))}
                />
                <CompareRow
                  label="Price for 365 days"
                  free="Not sold"
                  cells={plans.map((p) => formatINR(p.yearly.priceINR))}
                />
                <CompareRow
                  label="Yearly saving vs twelve 30-day purchases"
                  free="Not applicable"
                  cells={plans.map(
                    (p) =>
                      `${formatINR(p.annual.savingINR)} (${formatPercent(p.annual.savingPercent)})`
                  )}
                />
                <CompareRow
                  label="Credits"
                  free={`${free.welcomeCredits}, once`}
                  cells={plans.map(
                    (p) => `${p.creditsPerPeriod.toLocaleString('en-IN')} per monthly period`
                  )}
                />
                <CompareRow
                  label="Credits in a yearly term"
                  free="Not applicable"
                  cells={plans.map(
                    (p) => `${p.yearly.totalCredits.toLocaleString('en-IN')}, released monthly`
                  )}
                />
                <CompareRow
                  label="Business profiles"
                  free={String(free.maxBusinesses)}
                  cells={plans.map((p) => String(p.maxBusinesses))}
                />
                <CompareRow
                  label="Brand kit"
                  free={free.brandKit ? 'Included' : 'Not included'}
                  cells={plans.map((p) => (p.brandKit ? 'Included' : 'Not included'))}
                />
                <CompareRow
                  label="Reels"
                  free={free.reels ? 'Included' : 'Not included'}
                  cells={plans.map((p) => (p.reels ? 'Included' : 'Not included'))}
                />
                <CompareRow
                  label="When credits expire"
                  free="Never"
                  cells={plans.map(() => 'End of each period, no rollover')}
                />
                <CompareRow
                  label="Renewal"
                  free="Not applicable"
                  cells={plans.map(() => 'Manual. No automatic renewal')}
                />
              </tbody>
            </table>
          </div>
          <p className="text-text-tertiary mt-3 text-xs">
            Every plan, including Free, includes Truth Check, Business Brain and your own exports.
            English and Hinglish are supported; Hindi and Telugu are in beta.
          </p>
        </section>

        {/* ── Credit packs (one-time) ───────────────────────────────────── */}
        <section className="mt-20" aria-labelledby="credit-packs-heading">
          <h2 id="credit-packs-heading" className="text-text-primary text-2xl font-semibold">
            Need a little extra? Top up credits.
          </h2>
          <p className="text-text-secondary mt-2 max-w-2xl text-sm">
            One-time packs that work alongside any plan, including Free. No subscription. Pack
            credits are valid for the calendar month you buy them in.
          </p>
          <div className="mt-6">
            {signedIn ? (
              <CreditPackCards
                pendingKey={pendingKey}
                onBuy={(credits) => void startCheckout({ kind: 'pack', credits })}
              />
            ) : (
              <Button variant="outline" onClick={() => router.push('/signup')}>
                Sign up to buy credits
              </Button>
            )}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section aria-labelledby="faq-heading" className="mx-auto mt-20 max-w-3xl">
          <h2 id="faq-heading" className="text-text-primary text-2xl font-semibold">
            Questions people ask before paying
          </h2>
          <div className="divide-border-light border-border-light mt-6 divide-y border-y">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="text-text-primary focus-visible:ring-brand-500 flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium focus-visible:ring-2 focus-visible:outline-none">
                  {faq.q}
                  <span aria-hidden="true" className="text-text-tertiary group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                  {faq.a}
                  {faq.q === 'What about refunds?' && (
                    <>
                      {' '}
                      <Link href="/refund-policy" className="text-brand-700 underline">
                        Read the refund policy
                      </Link>
                      .
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-text-tertiary mx-auto mt-12 max-w-2xl text-center text-xs">
          Payments are processed securely by Cashfree Payments. Plans are prepaid for a fixed term
          (30 days or 365 days) and do not renew automatically: you are not charged again unless you
          choose to buy another term.
        </p>
      </main>

      <CheckoutConfirmDialog
        summary={summary}
        pending={confirmPending}
        problem={problem}
        onConfirm={onConfirmPurchase}
        onCancel={closeConfirm}
      />
      <CheckoutPhonePrompt
        prompt={phonePrompt}
        busy={pendingKey !== null}
        onSubmit={(phone) => void submitPhone(phone)}
        onCancel={cancelPhone}
      />

      <LandingFooter />
    </div>
  );
}

function FeatureList({ items }: { items: [boolean, string][] }) {
  return (
    <ul className="text-text-secondary mt-4 space-y-1.5 text-sm">
      {items.map(([included, label]) => (
        <li key={label} className="flex gap-2">
          <span aria-hidden="true" className={included ? 'text-success-600' : 'text-text-tertiary'}>
            {included ? '✓' : '–'}
          </span>
          <span>
            {label}
            {!included && <span className="sr-only">: not included</span>}
            {included && <span className="sr-only">: included</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The annual price against twelve monthly purchases at the actual monthly price, with the 360 vs 365 day note.
 * Experiment variants change only HOW the saving is framed. Every variant states the same true prices, that the
 * full yearly amount is paid up front, and the same term; none invents a price or hides the upfront amount.
 */
export type SavingVariant = 'control' | 'amount_only' | 'effective_monthly';

function AnnualNote({
  plan,
  cycle,
  variant = 'control',
}: {
  plan: PlanView;
  cycle: Cycle;
  variant?: SavingVariant;
}) {
  const a = plan.annual;
  const saving =
    variant === 'amount_only'
      ? formatINR(a.savingINR)
      : `${formatINR(a.savingINR)} (${formatPercent(a.savingPercent)})`;
  const effectiveMonthly = formatINR(Math.round(a.yearlyINR / 12));
  return (
    <p className="text-text-secondary mt-4 border-t border-dashed pt-3 text-xs leading-relaxed">
      {cycle === 'yearly' ? (
        <>
          Twelve 30-day purchases at {formatINR(plan.monthly.priceINR)} would cost{' '}
          {formatINR(a.twelveMonthlyINR)}. The year costs {formatINR(a.yearlyINR)}: you save{' '}
          {saving}.
          {variant === 'effective_monthly' && (
            <> That works out to about {effectiveMonthly} a month, paid once, up front.</>
          )}{' '}
          You pay the full {formatINR(a.yearlyINR)} today.
        </>
      ) : (
        <>
          Paying for a year at once costs {formatINR(a.yearlyINR)} instead of{' '}
          {formatINR(a.twelveMonthlyINR)} for twelve 30-day purchases: a saving of {saving}.
          {variant === 'effective_monthly' && (
            <> That works out to about {effectiveMonthly} a month, paid once, up front.</>
          )}{' '}
          Twelve 30-day purchases cover {a.monthlyCoverageDays} days; the year covers {a.yearlyDays}
          .
        </>
      )}
    </p>
  );
}

function CompareRow({ label, free, cells }: { label: string; free: string; cells: string[] }) {
  return (
    <tr>
      <th scope="row" className="text-text-primary p-4 font-medium">
        {label}
      </th>
      <td className="text-text-secondary p-4">{free}</td>
      {cells.map((value, i) => (
        <td key={i} className="text-text-secondary p-4">
          {value}
        </td>
      ))}
    </tr>
  );
}

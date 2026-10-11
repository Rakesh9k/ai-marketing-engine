'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { LandingNav } from '@/features/landing/components/LandingNav';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { Reveal } from '@/components/motion/Reveal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { PLANS, type SubscriptionPlan, type PlanDefinition } from '@/lib/config/pricing';
import { getTierPriceId, intervalOf } from '@/lib/paddle/catalog';
import { setPaddleCustomer } from '@/lib/paddle/initPaddle';
import { usePaddlePrices } from '@/features/billing/usePaddlePrices';
import { usePaddleCheckout } from '@/features/billing/usePaddleCheckout';
import { PaddlePrice, PriceStatusBanner } from '@/features/billing/components/PaddlePrice';
import { CreditPackCards } from '@/features/billing/components/CreditPackCards';
import { useToast } from '@/hooks/useToast';

// ─── Feature Comparison Matrix Data ──────────────────────────────────────────
interface ComparisonFeature {
  name: string;
  tooltip?: string;
  values: Record<SubscriptionPlan, string | boolean>;
}

interface FeatureCategory {
  category: string;
  features: ComparisonFeature[];
}

const COMPARISON_MATRIX: FeatureCategory[] = [
  {
    category: 'Content Creation & Outputs',
    features: [
      {
        name: 'AI Reels / month',
        tooltip: 'High-converting vertical video concepts with hook, script & B-roll direction',
        values: { free: '0', starter: '3', business: '10', pro: '20', agency: '40' },
      },
      {
        name: 'Social Creatives / month',
        tooltip: 'Ready-to-post promotional posters, announcements, and festival visual creatives',
        values: { free: '5', starter: '15', business: '30', pro: '60', agency: '120' },
      },
      {
        name: 'Story Concepts / month',
        tooltip: 'Engagement-boosting daily story ideas, polls, and quick updates',
        values: { free: '3', starter: '9', business: '30', pro: '60', agency: '120' },
      },
      {
        name: 'Captions, Hooks & CTAs',
        tooltip: 'Platform-optimized copy with trending hashtags and local call-to-actions',
        values: { free: true, starter: true, business: true, pro: true, agency: true },
      },
      {
        name: 'WhatsApp Broadcast Copy',
        tooltip: 'Conversational messages engineered for customer broadcast lists',
        values: { free: true, starter: true, business: true, pro: true, agency: true },
      },
    ],
  },
  {
    category: 'Marketing Intelligence & Brain',
    features: [
      {
        name: 'Business Brain & Persona',
        tooltip: 'Remembers your brand tone, offerings, location, and audience preferences',
        values: {
          free: 'Standard',
          starter: 'Standard',
          business: 'Enhanced',
          pro: 'Full Intelligence',
          agency: 'Full + Agency Custom',
        },
      },
      {
        name: 'Multi-Business Profiles',
        tooltip: 'Manage separate business entities under a single subscription account',
        values: {
          free: '1 Business',
          starter: '1 Business',
          business: '1 Business',
          pro: '3 Businesses',
          agency: '10 Businesses',
        },
      },
      {
        name: 'Regional Languages (Telugu, Hindi, etc.)',
        tooltip: 'Generate content natively adapted to local linguistic nuances',
        values: { free: false, starter: true, business: true, pro: true, agency: true },
      },
      {
        name: 'Truth Check Fact Validation',
        tooltip: 'AI fact-checks pricing, offers, and operational details before output',
        values: { free: false, starter: true, business: true, pro: true, agency: true },
      },
    ],
  },
  {
    category: 'Brand Customization & Quality',
    features: [
      {
        name: 'No Watermark on Creatives',
        tooltip: 'Clean visual downloads ready for commercial distribution',
        values: { free: false, starter: true, business: true, pro: true, agency: true },
      },
      {
        name: 'Brand Kit & Logo Integration',
        tooltip: 'Automatic watermark, logo placement, and brand color palette matching',
        values: { free: false, starter: false, business: true, pro: true, agency: true },
      },
      {
        name: 'Premium Visual Generation & Variations',
        tooltip: 'Highest-resolution AI graphic rendering with multi-style variations',
        values: { free: false, starter: false, business: false, pro: true, agency: true },
      },
      {
        name: 'Agency Workspace & Client Management',
        tooltip: 'Dedicated client folders, asset organization, and white-label tools',
        values: { free: false, starter: false, business: false, pro: false, agency: true },
      },
      {
        name: 'Priority Generation Queue',
        tooltip: 'Faster processing times during high-volume server demand',
        values: {
          free: 'Standard',
          starter: 'Standard',
          business: 'Priority',
          pro: 'High Priority',
          agency: 'VIP Immediate',
        },
      },
    ],
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What counts as an AI Reel vs a Social Creative?',
    a: 'A Social Creative is an eye-catching static poster or image visual paired with high-converting caption copy. An AI Reel is a video concept breakdown complete with attention-grabbing hooks, Scene-by-Scene script, voiceover transcript, and recommended B-roll clips for Instagram Reels or YouTube Shorts.',
  },
  {
    q: 'How does annual billing saving work?',
    a: 'When you choose annual billing you pay once a year instead of every month. The exact yearly and monthly prices for your country are always shown on the plan cards above, straight from our payment partner.',
  },
  {
    q: 'Do plans renew automatically? How do I cancel or switch plans?',
    a: 'Paid plans renew automatically at the end of each billing period until you cancel, and there is no free trial. You can cancel from the Billing page at any time: cancelling stops the next renewal, and you keep your plan until the end of the period you have already paid for. Switching plans inside an active subscription is not available yet — to move to a different plan, cancel and subscribe to the new plan once your current period ends.',
  },
  {
    q: 'Do unused credits roll over?',
    a: "No. A plan's credits are valid through the current calendar month, and unused credits do not roll over into the next month. Credit top-up packs are likewise valid only for the month you buy them in.",
  },
  {
    q: 'What happens if I reach my monthly reel or creative limit?',
    a: 'If you use up your credits before the month ends, you can buy a credit top-up pack from your Billing page and keep going. Top-up credits are valid for the month you buy them in.',
  },
  {
    q: 'How does multi-business management work on Pro & Agency plans?',
    a: 'The Pro plan allows you to manage up to 3 separate business profiles (e.g. main restaurant, cloud kitchen, catering arm) under one login. The Agency plan supports up to 10 client businesses with isolated brand profiles and workspaces.',
  },
  {
    q: 'Are my payments secure?',
    a: 'Yes. All payment transactions are securely processed over encrypted channels by our payment partner, Paddle. We never store raw payment details on our servers.',
  },
];

export default function PricingPageClient({ countryCode }: { countryCode?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  // Paddle's localized, pre-formatted prices. countryCode is undefined when the CDN gave us no
  // usable country - Paddle then auto-detects from the visitor's IP.
  const { state: priceState, catalog, retry: retryPrices } = usePaddlePrices(countryCode);
  const { pendingKey, start: startCheckout } = usePaddleCheckout((message) =>
    showToast(message, 'error')
  );

  // Default billing cycle is YEARLY as requested
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // ─── Auth & subscription state ──────────────────────────────────────────────
  const { status: authStatus, user } = useAuth();
  const [activePlanId, setActivePlanId] = useState<SubscriptionPlan | null>(null);
  // A paid, still-renewing subscription: buying another plan would double-bill.
  const [hasLiveSubscription, setHasLiveSubscription] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) {
      setActivePlanId(null);
      setHasLiveSubscription(false);
      setPaddleCustomer(undefined);
      return;
    }

    let cancelled = false;

    async function fetchSubscription() {
      setSubLoading(true);
      try {
        const db = getFirebaseDb();
        if (!db || !user) return;

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;

        // Paddle Retain: tell Paddle.js which Paddle customer this is (no-op if none yet).
        setPaddleCustomer(
          userSnap.exists()
            ? (userSnap.data()['paddleCustomerId'] as string | undefined)
            : undefined
        );

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
          const isActive = subData['status'] === 'active';
          setActivePlanId(isActive ? (subData['planId'] as SubscriptionPlan) : 'free');
          setHasLiveSubscription(
            isActive && subData['planId'] !== 'free' && subData['cancelAtPeriodEnd'] !== true
          );
        } else {
          setActivePlanId('free');
        }
      } catch {
        setActivePlanId(null);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    }

    void fetchSubscription();
    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  // ─── CTA helpers ────────────────────────────────────────────────────────────
  function getCtaLabel(planId: SubscriptionPlan, planName: string): string {
    if (planId === 'free') {
      if (authStatus !== 'authenticated') return 'Get Started Free';
      return activePlanId === 'free' ? 'Current Plan' : 'Included';
    }
    if (authStatus !== 'authenticated') return `Subscribe to ${planName}`;
    if (subLoading) return 'Loading…';
    if (activePlanId === planId) return 'Current Plan';
    if (hasLiveSubscription) return 'Manage in Billing';
    if (pendingKey === `plan:${planId}:${billingCycle}`) return 'Opening checkout…';
    return `Subscribe to ${planName}`;
  }

  function getCtaVariant(planId: SubscriptionPlan): 'primary' | 'outline' | 'ghost' {
    if (planId === 'free') return 'outline';
    if (activePlanId === planId) return 'ghost';
    if (hasLiveSubscription) return 'outline';
    return planId === 'pro' || planId === 'business' ? 'primary' : 'outline';
  }

  function isCtaDisabled(planId: SubscriptionPlan): boolean {
    if (authStatus === 'authenticated' && subLoading) return true;
    if (planId === 'free') return authStatus === 'authenticated';
    if (activePlanId === planId) return true;
    if (hasLiveSubscription) return false; // routes to /billing
    // Checkout needs a Paddle price shown on screen and no other checkout in flight.
    const priceId = getTierPriceId(catalog, planId, intervalOf(billingCycle));
    const priceShown =
      priceState.status === 'ready' && !!priceId && priceState.prices[priceId] !== undefined;
    return !priceShown || pendingKey !== null;
  }

  function handleCtaClick(planId: SubscriptionPlan) {
    if (planId === 'free') {
      router.push('/signup');
      return;
    }
    if (authStatus !== 'authenticated') {
      router.push(`/signup?plan=${planId}&cycle=${billingCycle}`);
      return;
    }
    if (activePlanId === planId) return;
    if (hasLiveSubscription) {
      // In-place plan changes are not supported yet and a second subscription would double-bill.
      router.push('/billing');
      return;
    }
    const expectedPriceId = getTierPriceId(catalog, planId, intervalOf(billingCycle));
    if (!expectedPriceId) return;
    void startCheckout({ kind: 'plan', planId, billingCycle, expectedPriceId });
  }

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      <LandingNav />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        {/* ── Hero Header ────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="border-brand-200 bg-brand-50/80 mb-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1">
            <MitraLogo size="sm" />
            <span className="text-brand-700 text-xs font-bold tracking-wider uppercase">
              SIMPLE, CLEAR, BUILT FOR YOUR GROWTH
            </span>
          </div>

          <h1 className="text-text-primary text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Choose how much marketing you want <br className="hidden sm:inline" />
            <span className="from-brand-600 bg-gradient-to-r to-amber-600 bg-clip-text text-transparent">
              Mitra to handle.
            </span>
          </h1>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            From your first campaign to a complete content engine. Scale up or down seamlessly as
            your business grows.
          </p>

          {/* ── Billing Cycle Toggle ────────────────────────────────────────── */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <div className="border-border-medium bg-bg-secondary inline-flex items-center rounded-2xl border p-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'text-text-primary bg-white shadow-xs'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                <span>Yearly Billing</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                    billingCycle === 'yearly'
                      ? 'bg-amber-400 text-neutral-900'
                      : 'bg-brand-100 text-brand-700'
                  }`}
                >
                  Best value
                </span>
              </button>
            </div>
          </div>
        </div>

        <PriceStatusBanner state={priceState} onRetry={retryPrices} />

        {hasLiveSubscription && (
          <p className="text-text-secondary mx-auto mt-6 max-w-xl text-center text-xs">
            You already have an active subscription. Changing plans from here isn&apos;t available
            yet - open Billing to manage it.
          </p>
        )}

        {/* ── 5 Plan Cards Grid ──────────────────────────────────────────────── */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:items-stretch">
          {PLANS.map((plan: PlanDefinition, planIdx: number) => {
            const isYearly = billingCycle === 'yearly';
            const period = isYearly ? '/year' : '/month';
            const isCurrent =
              authStatus === 'authenticated' && !subLoading && activePlanId === plan.id;
            const isPro = plan.id === 'pro';

            return (
              <Reveal key={plan.id} index={planIdx} className="flex">
                <div
                  className={`card-interactive relative flex w-full flex-col justify-between rounded-2xl border p-6 shadow-xs transition-all duration-200 ${
                    isPro
                      ? 'border-brand-500 ring-brand-500 bg-gradient-to-b from-amber-50/40 via-white to-orange-50/30 shadow-xl ring-2'
                      : plan.popular
                        ? 'border-brand-300 bg-bg-primary ring-brand-300 ring-1'
                        : 'border-border-light bg-bg-primary hover:border-border-medium'
                  } ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  {/* Badge header */}
                  {isPro && (
                    <div className="from-brand-600 absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r to-amber-600 px-3.5 py-1 text-[11px] font-black tracking-wider text-white uppercase shadow-sm">
                      MOST POPULAR
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow-sm">
                      Current Plan
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-text-primary text-xl font-bold">{plan.name}</h3>
                      {plan.maxBusinesses > 1 && (
                        <span className="bg-brand-100 text-brand-800 rounded-md px-2 py-0.5 text-[10px] font-bold">
                          {plan.maxBusinesses} Brands
                        </span>
                      )}
                    </div>
                    <p className="text-text-tertiary mt-1 min-h-[32px] text-xs font-medium">
                      {plan.tagline}
                    </p>

                    {/* Price display - Paddle's own formatted total, shown verbatim */}
                    <div className="border-border-light mt-5 border-t pt-4">
                      {plan.id === 'free' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-text-primary text-3xl font-black">Free</span>
                          <span className="text-text-tertiary text-xs">forever</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <PaddlePrice
                              state={priceState}
                              priceId={getTierPriceId(catalog, plan.id, intervalOf(billingCycle))}
                              className="text-text-primary text-3xl font-black"
                            />
                            <span className="text-text-tertiary text-xs">{period}</span>
                          </div>
                          <p className="text-text-tertiary mt-1 text-[11px]">
                            {isYearly ? 'Billed once a year' : 'Billed monthly'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pro positioning highlight */}
                    {isPro && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-center">
                        <p className="text-xs font-extrabold text-amber-900">
                          &quot;Run your marketing for an entire year with Mitra.&quot;
                        </p>
                      </div>
                    )}

                    {/* Output allowances pill group */}
                    <div className="bg-bg-secondary mt-5 space-y-2 rounded-xl p-3 text-xs">
                      <div className="text-text-primary flex items-center justify-between font-bold">
                        <span>🎬 AI Reels</span>
                        <span
                          className={
                            plan.monthlyReels > 0 ? 'text-brand-600' : 'text-text-tertiary'
                          }
                        >
                          {plan.monthlyReels}/mo
                        </span>
                      </div>
                      <div className="text-text-primary flex items-center justify-between font-bold">
                        <span>🎨 Social Creatives</span>
                        <span className="text-brand-600">{plan.monthlyCreatives}/mo</span>
                      </div>
                      <div className="text-text-primary flex items-center justify-between font-bold">
                        <span>📲 Story Concepts</span>
                        <span
                          className={
                            plan.monthlyStories > 0 ? 'text-brand-600' : 'text-text-tertiary'
                          }
                        >
                          {plan.monthlyStories}/mo
                        </span>
                      </div>
                    </div>

                    {/* Feature check list */}
                    <ul className="mt-5 space-y-2.5">
                      {plan.features.map((feature: string) => (
                        <li
                          key={feature}
                          className="text-text-secondary flex items-start gap-2 text-xs"
                        >
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA button */}
                  <div className="border-border-light mt-6 border-t pt-4">
                    <Button
                      fullWidth
                      size="md"
                      variant={getCtaVariant(plan.id)}
                      disabled={isCtaDisabled(plan.id)}
                      onClick={() => handleCtaClick(plan.id)}
                      className={
                        isPro
                          ? 'bg-brand-600 hover:bg-brand-700 font-bold text-white shadow-sm'
                          : ''
                      }
                    >
                      {getCtaLabel(plan.id, plan.name)}
                    </Button>
                    {plan.id !== 'free' && (
                      <p className="text-text-tertiary mt-2 text-center text-[11px]">
                        Renews automatically until you cancel.
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* ── Credit packs (one-time) ───────────────────────────────────────── */}
        <section className="mt-16" aria-labelledby="credit-packs-heading">
          <div className="text-center">
            <h2 id="credit-packs-heading" className="text-text-primary text-2xl font-extrabold">
              Need a little extra? Top up credits.
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              One-time packs that work alongside any plan, including Free. No subscription. Pack
              credits are valid for the calendar month you buy them in.
            </p>
          </div>
          <div className="mt-6">
            {authStatus === 'authenticated' ? (
              <CreditPackCards
                catalog={catalog}
                prices={priceState}
                pendingKey={pendingKey}
                onBuy={(credits, expectedPriceId) =>
                  void startCheckout({ kind: 'pack', credits, expectedPriceId })
                }
              />
            ) : (
              <div className="text-center">
                <Button variant="outline" onClick={() => router.push('/signup')}>
                  Sign up to buy credits
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Feature Comparison Table ────────────────────────────────────────── */}
        <section className="border-border-medium mt-20 border-t pt-12">
          <div className="text-center">
            <h2 className="text-text-primary text-2xl font-extrabold sm:text-3xl">
              Compare All Features &amp; Entitlements Side-by-Side
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              Everything you need to know about what each plan includes.
            </p>
          </div>

          <div className="border-border-light bg-bg-primary mt-8 overflow-x-auto rounded-2xl border shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-border-medium bg-bg-secondary text-text-primary border-b">
                  <th className="min-w-[200px] p-4 font-bold">Features</th>
                  <th className="p-4 text-center font-bold">Free</th>
                  <th className="p-4 text-center font-bold">Starter</th>
                  <th className="p-4 text-center font-bold">Business</th>
                  <th className="text-brand-600 bg-amber-50/50 p-4 text-center font-bold">Pro</th>
                  <th className="p-4 text-center font-bold">Agency</th>
                </tr>
              </thead>
              <tbody className="divide-border-light divide-y">
                {COMPARISON_MATRIX.map((cat) => (
                  <Fragment key={cat.category}>
                    <tr className="bg-bg-secondary/60">
                      <td
                        colSpan={6}
                        className="text-brand-700 p-3 text-[11px] font-extrabold tracking-wider uppercase"
                      >
                        {cat.category}
                      </td>
                    </tr>
                    {cat.features.map((feat) => (
                      <tr key={feat.name} className="hover:bg-bg-secondary/30 transition-colors">
                        <td className="text-text-primary p-4 font-medium">
                          <div>
                            {feat.name}
                            {feat.tooltip && (
                              <p className="text-text-tertiary mt-0.5 text-[11px] font-normal">
                                {feat.tooltip}
                              </p>
                            )}
                          </div>
                        </td>
                        {(
                          ['free', 'starter', 'business', 'pro', 'agency'] as SubscriptionPlan[]
                        ).map((planKey) => {
                          const val = feat.values[planKey];
                          const isProCol = planKey === 'pro';
                          return (
                            <td
                              key={planKey}
                              className={`p-4 text-center font-semibold ${
                                isProCol ? 'text-brand-900 bg-amber-50/20' : 'text-text-secondary'
                              }`}
                            >
                              {typeof val === 'boolean' ? (
                                val ? (
                                  <span className="text-base font-bold text-emerald-600">✓</span>
                                ) : (
                                  <span className="text-text-tertiary">—</span>
                                )
                              ) : (
                                val
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ Section ────────────────────────────────────────────────────── */}
        <section className="border-border-medium mt-20 border-t pt-12">
          <div className="text-center">
            <h2 className="text-text-primary text-2xl font-extrabold sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="text-text-secondary mt-2 text-sm">
              Got questions about billing, outputs, or plan limits? We have answers.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="border-border-light bg-bg-primary rounded-2xl border p-6 shadow-2xs"
              >
                <h3 className="text-text-primary text-base font-bold">{faq.q}</h3>
                <p className="text-text-secondary mt-2.5 text-xs leading-relaxed sm:text-sm">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Guarantee & Security section ──────────────────────────────────── */}
        <div className="border-border-light bg-bg-secondary mt-16 rounded-2xl border p-8 text-center shadow-xs">
          <h2 className="text-text-primary text-xl font-bold">
            Trusted &amp; Secure Payment Guarantee
          </h2>
          <p className="text-text-secondary mx-auto mt-2 max-w-2xl text-xs sm:text-sm">
            Payments are processed securely by our payment partner, Paddle. Subscriptions renew
            automatically until you cancel. You can cancel from your Billing page at any time and
            keep your plan until the end of the period you have paid for.
          </p>
          <div className="text-text-tertiary mt-6 flex flex-wrap justify-center gap-6 text-xs font-semibold">
            <span>✓ Instant Output Entitlement</span>
            <span>✓ Cancel anytime in Billing</span>
            <span>✓ Encrypted Checkout</span>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

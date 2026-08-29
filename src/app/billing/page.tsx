'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { subscriptionService } from '@/services/database';
import type { Subscription, SubscriptionPlan } from '@/types';
import { formatINR } from '@/lib/utils';

const PLAN_DETAILS: Record<
  SubscriptionPlan,
  { name: string; price: number; credits: number; campaigns: number; features: string[] }
> = {
  free: {
    name: 'Free',
    price: 0,
    credits: 100,
    campaigns: 1,
    features: [
      '1 campaign per month',
      '100 credits/month',
      'Basic templates',
      'Watermark on creatives',
      '1 business',
    ],
  },
  starter: {
    name: 'Starter',
    price: 499,
    credits: 500,
    campaigns: 5,
    features: [
      '5 campaigns per month',
      '500 credits/month',
      'Basic templates',
      'No watermark',
      '1 business',
    ],
  },
  business: {
    name: 'Business',
    price: 999,
    credits: 1200,
    campaigns: 12,
    features: [
      '12 campaigns per month',
      '1,200 credits/month',
      'Premium templates',
      'Brand Kit access',
      'Priority generation',
      '1 business',
    ],
  },
  agency: {
    name: 'Agency',
    price: 2499,
    credits: 3000,
    campaigns: 30,
    features: [
      '30 campaigns per month',
      '3,000 credits/month',
      'Multi-business',
      'Client management',
      'Partner dashboard',
      'White-label path',
    ],
  },
};

const TOP_UP_PACKS = [
  { credits: 500, price: 499, label: 'Small Pack' },
  { credits: 1200, price: 999, label: 'Medium Pack' },
  { credits: 3000, price: 1999, label: 'Large Pack' },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

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
              Credit Top-Up Packs (No Subscription Required)
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
                    onClick={() => {
                      console.log('Upgrade to:', plan);
                      alert(
                        `Upgrade to ${PLAN_DETAILS[plan].name} - Razorpay integration coming soon!`
                      );
                    }}
                    disabled={plan === currentPlan}
                    className={`mt-6 w-full rounded-lg px-4 py-3 font-medium transition-colors ${
                      plan === currentPlan
                        ? 'cursor-not-allowed bg-neutral-100 text-neutral-600'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }`}
                  >
                    {plan === currentPlan ? 'Current Plan' : 'Upgrade to this Plan'}
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

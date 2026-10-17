'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';
import { FeedbackPrompt } from './FeedbackPrompt';

/** The shape returned by the server callable getBillingOverview (functions/src/services/billingOverview.ts). */
export interface BillingOverviewData {
  access: {
    status: 'active' | 'free' | 'ended';
    planId: string;
    planName: string;
    cycle: 'monthly' | 'yearly' | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  credits: {
    available: number;
    welcomeRemaining: number;
    expiredTotal: number;
    nextAllocation: { at: string; credits: number } | null;
  };
  expiredHistory: { at: string; credits: number }[];
  lastPayment: PurchaseRowData | null;
  purchases: PurchaseRowData[];
  reminders: { enabled: boolean };
  receipts: { supported: false; note: string };
}

export interface PurchaseRowData {
  orderId: string;
  kind: 'plan' | 'pack';
  label: string;
  amountINR: number;
  state: string;
  paidAt: string | null;
}

const STATE_LABEL: Record<string, string> = {
  fulfilled: 'Paid',
  payment_confirmed: 'Paid, activating',
  refund_pending: 'Refund in progress',
  partially_refunded: 'Partly refunded',
  refunded: 'Refunded',
  disputed: 'Under review with your bank',
  charged_back: 'Reversed by your bank',
};

const n = (v: number) => v.toLocaleString('en-IN');
const when = (iso: string | null) =>
  iso
    ? `${new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso))}, ${new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
        .format(new Date(iso))
        .toLowerCase()} IST`
    : '';
const day = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso))
    : '';

/**
 * Billing summary for the signed-in user. Every figure is what the SERVER reports; nothing here is computed from
 * browser-held balances, and if the server cannot be reached it says so rather than showing a guess.
 */
export function BillingOverviewPanel() {
  const [data, setData] = useState<BillingOverviewData | null>(null);
  const [failed, setFailed] = useState(false);
  const [prefError, setPrefError] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const result = await callFunction<Record<string, never>, BillingOverviewData>({
        functionName: 'getBillingOverview',
        data: {},
      });
      // Anything that is not a complete summary is treated as a failure, never shown as a guess.
      if (!result?.access || !result?.credits) throw new Error('incomplete billing overview');
      setData(result);
    } catch (err) {
      console.error('Could not load billing overview:', err);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleReminders(enabled: boolean) {
    if (!data) return;
    setSavingPref(true);
    setPrefError(false);
    try {
      await callFunction<{ renewalReminders: boolean }, { renewalReminders: boolean }>({
        functionName: 'setEmailPreferences',
        data: { renewalReminders: enabled },
      });
      setData({ ...data, reminders: { enabled } });
    } catch (err) {
      console.error('Could not save email preference:', err);
      setPrefError(true);
    } finally {
      setSavingPref(false);
    }
  }

  if (failed) {
    return (
      <section
        aria-labelledby="overview-title"
        className="mb-6 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <h2 id="overview-title" className="text-lg font-bold text-neutral-900">
          Your plan and credits
        </h2>
        <p role="alert" className="mt-2 text-sm text-neutral-600">
          We could not load your billing summary just now. Your plan and credits are not affected.
        </p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </section>
    );
  }
  if (!data) {
    return (
      <section
        aria-busy="true"
        aria-label="Your plan and credits"
        className="mb-6 h-32 animate-pulse rounded-xl bg-neutral-100"
      />
    );
  }

  const { access, credits } = data;
  const status =
    access.status === 'active'
      ? `Active until ${when(access.endsAt)}`
      : access.status === 'ended'
        ? `Ended on ${when(access.endsAt)}. You are on the Free plan.`
        : 'You are on the Free plan.';

  return (
    <section
      aria-labelledby="overview-title"
      data-testid="billing-overview"
      className="mb-6 rounded-xl border border-neutral-200 bg-white p-5"
    >
      <h2 id="overview-title" className="text-lg font-bold text-neutral-900">
        Your plan and credits
      </h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-neutral-500">Plan</dt>
          <dd className="font-semibold text-neutral-900">
            {access.planName}
            {access.cycle ? ` (${access.cycle === 'yearly' ? '365' : '30'}-day term)` : ''}
          </dd>
          <dd className="text-neutral-600">{status}</dd>
          {access.status === 'active' && access.startsAt && (
            <dd className="text-neutral-500">Term started {day(access.startsAt)}</dd>
          )}
          {access.status === 'ended' && (
            <dd>
              <FeedbackPrompt context="not_renewing" />
            </dd>
          )}
        </div>
        <div>
          <dt className="font-medium text-neutral-500">Credits available now</dt>
          <dd className="font-semibold text-neutral-900">{n(credits.available)}</dd>
          {credits.welcomeRemaining > 0 && (
            <dd className="text-neutral-600">
              Includes {n(credits.welcomeRemaining)} free starter credits, which do not expire.
            </dd>
          )}
          {credits.nextAllocation && (
            <dd className="text-neutral-600">
              Next: {n(credits.nextAllocation.credits)} credits on {day(credits.nextAllocation.at)}
            </dd>
          )}
          {credits.expiredTotal > 0 && (
            <dd className="text-neutral-500">
              {n(credits.expiredTotal)} plan credits have expired unused in total.
            </dd>
          )}
        </div>
        <div>
          <dt className="font-medium text-neutral-500">Last successful payment</dt>
          {data.lastPayment ? (
            <>
              <dd className="font-semibold text-neutral-900">
                ₹{n(data.lastPayment.amountINR)}, {data.lastPayment.label}
              </dd>
              <dd className="text-neutral-600">{when(data.lastPayment.paidAt)}</dd>
            </>
          ) : (
            <dd className="text-neutral-600">No payments yet.</dd>
          )}
        </div>
        <div>
          <dt className="font-medium text-neutral-500">Renewal</dt>
          <dd className="text-neutral-600">
            Manual. Nothing renews automatically; you buy a new term when you want one.
          </dd>
          <dd>
            <a href="#subscription-plans" className="font-medium text-[#B83212] underline">
              Renew or buy a term
            </a>
          </dd>
        </div>
      </dl>

      {data.expiredHistory.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-neutral-900">Expired credits</h3>
          <ul className="mt-1 text-sm text-neutral-600">
            {data.expiredHistory.map((e) => (
              <li key={e.at}>
                {n(e.credits)} plan credits expired unused on {day(e.at)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-neutral-900">Purchase history</h3>
        {data.purchases.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-600">Nothing purchased yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Your purchases</caption>
              <thead>
                <tr className="text-neutral-500">
                  <th scope="col" className="py-1 pr-4 font-medium">
                    Date
                  </th>
                  <th scope="col" className="py-1 pr-4 font-medium">
                    Purchase
                  </th>
                  <th scope="col" className="py-1 pr-4 font-medium">
                    Amount
                  </th>
                  <th scope="col" className="py-1 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((p) => (
                  <tr key={p.orderId} className="border-t border-neutral-100">
                    <td className="py-1.5 pr-4">{day(p.paidAt)}</td>
                    <td className="py-1.5 pr-4">{p.label}</td>
                    <td className="py-1.5 pr-4">₹{n(p.amountINR)}</td>
                    <td className="py-1.5 pr-4">{STATE_LABEL[p.state] ?? p.state}</td>
                    <td className="py-1.5 font-mono text-xs">{p.orderId.slice(-10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-neutral-500">{data.receipts.note}</p>
      </div>

      <div className="mt-5 border-t border-neutral-100 pt-4">
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#E84D1A]"
            checked={data.reminders.enabled}
            disabled={savingPref}
            onChange={(e) => void toggleReminders(e.target.checked)}
          />
          <span>
            Email me before my access ends. These are service messages about your plan, not offers.
          </span>
        </label>
        {prefError && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            We could not save that. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}

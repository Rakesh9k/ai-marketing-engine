'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { MitraLogo } from '@/components/ui/MitraLogo';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { subscriptionService, usageService } from '@/services/database';
import { PLAN_DETAILS } from '@/features/billing/planDetails';
import { settleRead } from '@/features/billing/readState';

/**
 * Where Paddle sends the customer after a successful checkout (settings.successUrl).
 *
 * This page only REFLECTS state. It never grants anything: plan and credits are applied by the
 * signed Paddle webhook, which usually lands within seconds. We poll the user's own
 * subscription/usage for a short while and say plainly when it has not arrived yet, instead of
 * claiming success the server has not recorded.
 */
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60s

type Confirmation =
  | { status: 'waiting' }
  | { status: 'confirmed'; planName: string; credits?: number }
  | { status: 'delayed' }
  | { status: 'error' };

export default function WelcomePage() {
  const router = useRouter();
  const { status: authStatus, user } = useAuth();
  const [confirmation, setConfirmation] = useState<Confirmation>({ status: 'waiting' });
  const baseline = useRef<{ creditsIncluded?: number; planId?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) return;
    let cancelled = false;
    let polls = 0;

    async function check() {
      const [subscriptionRead, usageRead] = await Promise.all([
        settleRead('subscription', () => subscriptionService.getByUserId(user!.uid)),
        settleRead('usage', () => usageService.getCurrentPeriod(user!.uid)),
      ]);
      if (cancelled) return true;

      // A failed read is NOT "still free": we cannot tell, so say so rather than guess.
      if (!subscriptionRead.ok || !usageRead.ok) {
        setConfirmation({ status: 'error' });
        return true;
      }
      const subscription = subscriptionRead.value;
      const usage = usageRead.value;

      const current = { creditsIncluded: usage?.creditsIncluded, planId: subscription?.planId };
      if (baseline.current === null) {
        baseline.current = current;
      }

      // Confirmed = a paid plan is now active, or the period's credit total moved (top-up).
      const paidNow =
        !!subscription && subscription.planId !== 'free' && subscription.status === 'active';
      const creditsMoved =
        current.creditsIncluded !== undefined &&
        baseline.current.creditsIncluded !== undefined &&
        current.creditsIncluded > baseline.current.creditsIncluded;

      if (paidNow || creditsMoved) {
        const planName = PLAN_DETAILS[subscription?.planId ?? 'free']?.name ?? 'Mitra';
        setConfirmation({ status: 'confirmed', planName, credits: current.creditsIncluded });
        return true;
      }
      return false;
    }

    const timer = window.setInterval(async () => {
      polls += 1;
      const done = await check();
      if (done) window.clearInterval(timer);
      else if (polls >= MAX_POLLS) {
        window.clearInterval(timer);
        setConfirmation({ status: 'delayed' });
      }
    }, POLL_INTERVAL_MS);
    void check().then((done) => {
      if (done) window.clearInterval(timer);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authStatus, user, attempt]);

  return (
    <main className="bg-bg-primary text-text-primary flex min-h-screen items-center justify-center px-4 py-16">
      <div className="border-border-light bg-bg-primary w-full max-w-lg rounded-2xl border p-8 text-center shadow-xs">
        <div className="mb-4 flex justify-center">
          <MitraLogo size="md" />
        </div>

        {confirmation.status === 'confirmed' ? (
          <>
            <h1 className="text-3xl font-black">You&apos;re all set.</h1>
            <p className="text-text-secondary mt-3 text-sm">
              Your {confirmation.planName} plan is active
              {confirmation.credits !== undefined
                ? ` with ${confirmation.credits.toLocaleString('en-IN')} credits this month`
                : ''}
              . Let&apos;s get your first campaign going.
            </p>
          </>
        ) : confirmation.status === 'error' ? (
          <>
            <h1 className="text-3xl font-black">We couldn&apos;t check your plan.</h1>
            <p className="text-text-secondary mt-3 text-sm" role="alert">
              If you just paid, your payment is safe — we just couldn&apos;t load your account
              status right now. Please try again, or open Billing in a moment.
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  baseline.current = null;
                  setConfirmation({ status: 'waiting' });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </Button>
            </div>
          </>
        ) : confirmation.status === 'delayed' ? (
          <>
            <h1 className="text-3xl font-black">Still confirming your payment.</h1>
            <p className="text-text-secondary mt-3 text-sm">
              If you just paid, your plan or credits are applied as soon as our payment partner
              confirms the payment — usually within a minute. Check Billing to see them; if
              they&apos;re still missing after a few minutes, contact support.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black">Thank you!</h1>
            <p className="text-text-secondary mt-3 text-sm" role="status">
              {authStatus === 'unauthenticated'
                ? 'Sign in to see your plan and credits.'
                : 'We are confirming your payment with Paddle. This usually takes a few seconds.'}
            </p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {authStatus === 'unauthenticated' ? (
            <Button onClick={() => router.push('/login')}>Sign in</Button>
          ) : (
            <>
              <Button onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
              <Button variant="outline" onClick={() => router.push('/billing')}>
                View billing
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

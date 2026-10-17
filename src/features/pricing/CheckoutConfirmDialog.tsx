'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { formatAccessDate } from '@/features/billing/prepaidTermUi';
import { estimateAccessEnd, formatINR, type CheckoutSummary } from './pricingModel';

export interface CheckoutProblem {
  kind: 'error' | 'unavailable';
  message: string;
}

export interface CheckoutConfirmDialogProps {
  /** null = closed. */
  summary: CheckoutSummary | null;
  /** Checkout is being created / the payment window is opening. */
  pending: boolean;
  problem: CheckoutProblem | null;
  /** When the customer already holds a live term of THIS plan and cycle: the new term is added after it. */
  liveTermEndsAt?: Date | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const expiryPolicyText = (summary: CheckoutSummary): string =>
  summary.periods === 1
    ? `Your ${summary.creditsPerPeriod.toLocaleString('en-IN')} plan credits last for your ${summary.termDays} days. Any you have not used when the ${summary.termDays} days end expire; they do not roll over.`
    : `Each monthly period's ${summary.creditsPerPeriod.toLocaleString('en-IN')} credits are available for that period only. Any you have not used when the period ends expire; they do not roll over into the next one.`;

/**
 * The last screen before payment. It states, in plain words, exactly what will be charged and what is received,
 * so nothing is learned only after paying. Accessible: a modal dialog that traps focus, closes on Escape and
 * returns focus to the control that opened it.
 */
export function CheckoutConfirmDialog({
  summary,
  pending,
  problem,
  liveTermEndsAt = null,
  onConfirm,
  onCancel,
}: CheckoutConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const open = summary !== null;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingRef.current) {
        event.stopPropagation();
        cancelRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!summary) return null;

  const unavailable = problem?.kind === 'unavailable';
  const start = liveTermEndsAt ?? new Date();
  const endsAround = estimateAccessEnd(summary.termDays, start);
  const yearly = summary.cycle === 'yearly';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-confirm-title"
        aria-describedby="checkout-confirm-lead"
        tabIndex={-1}
        className="bg-bg-primary max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-6 shadow-xl outline-none sm:rounded-2xl sm:p-8"
      >
        <h2 id="checkout-confirm-title" className="text-text-primary text-xl font-semibold">
          Confirm your purchase
        </h2>
        <p id="checkout-confirm-lead" className="text-text-secondary mt-1 text-sm">
          Check these details. You are not charged until you complete payment on the next screen.
        </p>

        <dl className="divide-border-light mt-5 divide-y text-sm">
          <Row term="Plan">
            {summary.planName}, {yearly ? 'yearly' : 'monthly'}
          </Row>
          <Row term="You will pay">
            <span className="text-text-primary text-lg font-semibold">
              {formatINR(summary.priceINR)}
            </span>{' '}
            <span>one time. This is the full amount for the whole term.</span>
          </Row>
          <Row term="Access">
            {summary.termDays} days from payment confirmation
            {liveTermEndsAt
              ? `, added after your current access ends on ${formatAccessDate(liveTermEndsAt)}, so it runs to about ${formatAccessDate(endsAround)}.`
              : `, until about ${formatAccessDate(endsAround)} if you pay today.`}
          </Row>
          <Row term="Credits you receive">{summary.allocation}.</Row>
          <Row term="Credit expiry">{expiryPolicyText(summary)}</Row>
          <Row term="Renewal">
            <strong className="text-text-primary">No automatic renewal.</strong> We will not charge
            you again unless you choose to buy another term. When your access ends, your account
            returns to Free and you buy again to carry on.
          </Row>
        </dl>

        {problem && (
          <p
            role="alert"
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              unavailable
                ? 'border-warning-200 bg-warning-50 text-text-primary'
                : 'border-error-200 bg-error-50 text-text-primary'
            }`}
          >
            {problem.message}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {unavailable ? 'Close' : 'Go back'}
          </Button>
          {!unavailable && (
            <Button type="button" onClick={onConfirm} loading={pending}>
              {pending
                ? 'Opening secure payment…'
                : problem
                  ? `Try again, pay ${formatINR(summary.priceINR)} once`
                  : `Pay ${formatINR(summary.priceINR)} once`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <dt className="text-text-tertiary font-medium">{term}</dt>
      <dd className="text-text-secondary">{children}</dd>
    </div>
  );
}

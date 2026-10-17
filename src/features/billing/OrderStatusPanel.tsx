'use client';

import { Button } from '@/components/ui/Button';
import { formatAccessDate } from './prepaidTermUi';
import { FeedbackPrompt } from './FeedbackPrompt';
import { presentOrderStatus, type VerifiedOrder } from './orderStatusUi';

const TONE_CLASS = {
  pending: 'border-border-medium bg-bg-secondary',
  success: 'border-success-500 bg-success-50',
  problem: 'border-error-500 bg-error-50',
  review: 'border-warning-500 bg-warning-50',
} as const;

/** The result of the server's check of the order that the customer just came back from paying. */
export function OrderStatusPanel({
  orderId,
  result,
  checking,
  onCheckAgain,
  onDismiss,
}: {
  orderId?: string;
  /** null until the server has answered once. */
  result: VerifiedOrder | null;
  checking: boolean;
  onCheckAgain: () => void;
  onDismiss: () => void;
}) {
  const view = presentOrderStatus(result, (iso) => formatAccessDate(new Date(iso)));
  const settled = view.tone === 'success' || view.tone === 'problem';
  return (
    <section
      aria-labelledby="order-status-title"
      role="status"
      className={`mb-6 rounded-xl border p-4 ${TONE_CLASS[view.tone]}`}
    >
      <h2 id="order-status-title" className="text-text-primary text-base font-semibold">
        {view.title}
      </h2>
      <p className="text-text-secondary mt-1 text-sm">{view.detail}</p>
      {/* Only when no payment was taken: the one moment the reason for not paying is knowable. */}
      {view.tone === 'problem' && orderId && (
        <FeedbackPrompt context="checkout_abandoned" orderId={orderId} />
      )}
      <div className="mt-3 flex gap-3">
        {!settled && (
          <Button size="sm" variant="outline" onClick={onCheckAgain} loading={checking}>
            Check again
          </Button>
        )}
        {settled && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </section>
  );
}

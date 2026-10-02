import type { Transaction } from '@/types';

/**
 * Which billing-history rows a customer should see.
 *
 * An unpaid or abandoned checkout is not a transaction: a Paddle checkout record is created
 * (type 'subscription' | 'credit_purchase', status 'pending') when the overlay opens, and is
 * 'expired' once the user starts another, or 'failed' if the payment was declined. None of
 * those are purchases. Genuine credit reservations are also 'pending' while a generation runs,
 * so only the checkout types are hidden.
 */
export function isVisibleTransaction(tx: Pick<Transaction, 'type' | 'status'>): boolean {
  const isCheckout = tx.type === 'subscription' || tx.type === 'credit_purchase';
  if (!isCheckout) return true;
  return tx.status === 'completed' || tx.status === 'refunded';
}

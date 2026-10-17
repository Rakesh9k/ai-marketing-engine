/**
 * How the Billing page words a payment's status. Everything shown comes from the SERVER's answer
 * (verifyCashfreeOrder, which checks the order with the payment provider); the redirect back from the payment
 * page proves nothing and is never used to claim a payment succeeded.
 */
export interface VerifiedOrder {
  state: string;
  confirmed: boolean;
  message: string;
  accessEndsAt?: string;
}

export type OrderStatusTone = 'pending' | 'success' | 'problem' | 'review';

export interface OrderStatusView {
  tone: OrderStatusTone;
  title: string;
  detail: string;
}

export function presentOrderStatus(
  result: VerifiedOrder | null,
  formatDate: (iso: string) => string
): OrderStatusView {
  if (!result) {
    return {
      tone: 'pending',
      title: 'Checking your payment',
      detail:
        'We are asking our payment partner for the result. Nothing is shown as paid until it confirms.',
    };
  }
  if (result.confirmed) {
    return {
      tone: 'success',
      title: 'Payment confirmed',
      detail: result.accessEndsAt
        ? `Your plan is active until ${formatDate(result.accessEndsAt)}. No automatic renewal.`
        : 'Your credits have been added.',
    };
  }
  switch (result.state) {
    case 'payment_failed':
      return { tone: 'problem', title: 'Payment did not go through', detail: result.message };
    case 'cancelled':
    case 'expired':
      return {
        tone: 'problem',
        title: 'No payment was taken',
        detail: 'This payment session ended without a payment. You have not been charged for it.',
      };
    case 'needs_review':
    case 'disputed':
    case 'charged_back':
      return { tone: 'review', title: 'Our team is checking this payment', detail: result.message };
    default:
      return { tone: 'pending', title: 'Waiting for payment confirmation', detail: result.message };
  }
}

import { isVisibleTransaction } from './visibleTransactions';

describe('isVisibleTransaction', () => {
  it.each(['pending', 'expired', 'failed'] as const)(
    'hides an unpaid Paddle checkout (%s) of either kind',
    (status) => {
      expect(isVisibleTransaction({ type: 'subscription', status })).toBe(false);
      expect(isVisibleTransaction({ type: 'credit_purchase', status })).toBe(false);
    }
  );

  it('shows paid purchases and refunds', () => {
    expect(isVisibleTransaction({ type: 'subscription', status: 'completed' })).toBe(true);
    expect(isVisibleTransaction({ type: 'credit_purchase', status: 'completed' })).toBe(true);
    expect(isVisibleTransaction({ type: 'credit_purchase', status: 'refunded' })).toBe(true);
  });

  it('never hides credit activity, including genuinely pending reservations', () => {
    expect(isVisibleTransaction({ type: 'reservation', status: 'pending' })).toBe(true);
    expect(isVisibleTransaction({ type: 'deduction', status: 'completed' })).toBe(true);
    expect(isVisibleTransaction({ type: 'grant', status: 'completed' })).toBe(true);
    expect(isVisibleTransaction({ type: 'refund', status: 'completed' })).toBe(true);
  });
});

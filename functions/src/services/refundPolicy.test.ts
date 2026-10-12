import {
  creditsToRevoke,
  isDisputeLost,
  isDisputeOpen,
  isFullRefund,
  isRefundSucceeded,
  shortenedTermEnd,
} from './refundPolicy';

describe('isFullRefund', () => {
  it('is true only when refunds cover the order', () => {
    expect(isFullRefund(999, 999)).toBe(true);
    expect(isFullRefund(999, 999.004)).toBe(true);
    expect(isFullRefund(999, 998.99)).toBe(false);
    expect(isFullRefund(999, 500)).toBe(false);
    expect(isFullRefund(999, 0)).toBe(false);
    expect(isFullRefund(0, 0)).toBe(false); // an order with no amount is never "fully refunded"
  });
});

describe('creditsToRevoke: only UNSPENT credits are taken back', () => {
  it('takes the whole pack when none of it is spent', () => {
    expect(creditsToRevoke(500, 640, 0)).toBe(500);
  });
  it('never takes spent credits', () => {
    expect(creditsToRevoke(500, 640, 300)).toBe(340);
    expect(creditsToRevoke(500, 640, 640)).toBe(0);
  });
  it('never goes negative or above the pack', () => {
    expect(creditsToRevoke(500, 640, 9999)).toBe(0);
    expect(creditsToRevoke(100, 9999, 0)).toBe(100);
    expect(creditsToRevoke(-5, 100, 0)).toBe(0);
  });
});

describe('shortenedTermEnd', () => {
  const now = new Date('2026-10-12T00:00:00.000Z');
  it('takes the refunded order days off a stacked term, keeping access', () => {
    const r = shortenedTermEnd('2026-12-31T00:00:00.000Z', 'monthly', now);
    expect(r.ended).toBe(false);
    expect(r.endIso).toBe('2026-12-01T00:00:00.000Z');
  });
  it('ends access now when nothing paid is left', () => {
    const r = shortenedTermEnd('2026-10-20T00:00:00.000Z', 'monthly', now);
    expect(r).toEqual({ endIso: now.toISOString(), ended: true });
  });
  it('a yearly order takes 365 days', () => {
    const r = shortenedTermEnd('2028-10-12T00:00:00.000Z', 'yearly', now);
    expect(r.ended).toBe(false);
    expect(r.endIso).toBe('2027-10-13T00:00:00.000Z');
  });
  it('a missing or invalid end date ends access rather than extending it', () => {
    expect(shortenedTermEnd(undefined, 'monthly', now).ended).toBe(true);
    expect(shortenedTermEnd('garbage', 'monthly', now).ended).toBe(true);
  });
});

describe('statuses', () => {
  it('only SUCCESS counts as a refund that happened', () => {
    expect(isRefundSucceeded('SUCCESS')).toBe(true);
    for (const s of ['PENDING', 'CANCELLED', 'ONHOLD', 'success', undefined, '']) {
      expect(isRefundSucceeded(s as string)).toBe(false);
    }
  });
  it('classifies dispute statuses', () => {
    expect(isDisputeOpen('DISPUTE_CREATED')).toBe(true);
    expect(isDisputeOpen('CHARGEBACK_UNDER_REVIEW')).toBe(true);
    expect(isDisputeOpen(undefined)).toBe(true); // unknown stays open (safer)
    expect(isDisputeOpen('CHARGEBACK_MERCHANT_WON')).toBe(false);
    expect(isDisputeOpen('DISPUTE_MERCHANT_LOST')).toBe(false);
    expect(isDisputeLost('CHARGEBACK_MERCHANT_LOST')).toBe(true);
    expect(isDisputeLost('RETRIEVAL_MERCHANT_ACCEPTED')).toBe(true);
    expect(isDisputeLost('CHARGEBACK_MERCHANT_WON')).toBe(false);
    expect(isDisputeLost('DISPUTE_CREATED')).toBe(false);
  });
});

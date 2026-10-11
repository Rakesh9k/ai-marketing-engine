import { decidePurchase, isTermLive, TERM_DAYS } from './prepaidTerm';

const DAY = 86_400_000;
const NOW = new Date('2026-10-11T12:00:00.000Z');
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
const live = (over: Record<string, unknown> = {}) => ({
  planId: 'starter',
  billingCycle: 'monthly',
  status: 'active',
  provider: 'cashfree',
  currentPeriodEnd: at(10),
  ...over,
});

describe('terms', () => {
  it('monthly is 30 days and yearly is 365 days', () => {
    expect(TERM_DAYS).toEqual({ monthly: 30, yearly: 365 });
  });

  it('a first purchase starts now and lasts exactly the term', () => {
    const m = decidePurchase(undefined, 'starter', 'monthly', NOW);
    const y = decidePurchase(undefined, 'starter', 'yearly', NOW);
    expect(m).toMatchObject({ allowed: true, kind: 'new', newEnd: at(30), termDays: 30 });
    expect(y).toMatchObject({ allowed: true, kind: 'new', newEnd: at(365), termDays: 365 });
  });
});

describe('liveness and the paid-through date', () => {
  it('is live before the end date and not at or after it (boundary)', () => {
    expect(isTermLive(live({ currentPeriodEnd: at(1) }), NOW)).toBe(true);
    expect(isTermLive(live({ currentPeriodEnd: NOW.toISOString() }), NOW)).toBe(false);
    expect(isTermLive(live({ currentPeriodEnd: at(-1) }), NOW)).toBe(false);
  });
  it('only active / trialing / past_due entitle', () => {
    for (const status of ['active', 'trialing', 'past_due'])
      expect(isTermLive(live({ status }), NOW)).toBe(true);
    for (const status of ['canceled', 'incomplete', undefined])
      expect(isTermLive(live({ status }), NOW)).toBe(false);
    expect(isTermLive(undefined, NOW)).toBe(false);
  });
});

describe('renewing the same plan and billing period EXTENDS the live term', () => {
  it('adds the new term after the current end date (paid days are not lost)', () => {
    const d = decidePurchase(live({ currentPeriodEnd: at(10) }), 'starter', 'monthly', NOW);
    expect(d).toMatchObject({ allowed: true, kind: 'renewal', newEnd: at(40) });
  });
  it('repeated renewals stack', () => {
    const first = decidePurchase(live({ currentPeriodEnd: at(10) }), 'starter', 'monthly', NOW);
    if (!first.allowed) throw new Error('unexpected');
    const second = decidePurchase(
      live({ currentPeriodEnd: first.newEnd }),
      'starter',
      'monthly',
      NOW
    );
    expect(second).toMatchObject({ allowed: true, kind: 'renewal', newEnd: at(70) });
  });
  it('a yearly renewal adds 365 days', () => {
    const d = decidePurchase(
      live({ billingCycle: 'yearly', currentPeriodEnd: at(100) }),
      'starter',
      'yearly',
      NOW
    );
    expect(d).toMatchObject({ kind: 'renewal', newEnd: at(465) });
  });
  it('a legacy record with no billingCycle is treated as monthly', () => {
    const d = decidePurchase(live({ billingCycle: undefined }), 'starter', 'monthly', NOW);
    expect(d).toMatchObject({ kind: 'renewal' });
  });
});

describe('what is refused', () => {
  it('a different plan while a term is live', () => {
    expect(decidePurchase(live(), 'business', 'monthly', NOW)).toMatchObject({
      allowed: false,
      reason: 'different_plan_or_cycle_live',
      liveEnd: at(10),
    });
  });
  it('a different billing period on the same plan while a term is live', () => {
    expect(decidePurchase(live(), 'starter', 'yearly', NOW)).toMatchObject({
      allowed: false,
      reason: 'different_plan_or_cycle_live',
    });
  });
  it('a live term bought through ANOTHER provider can never be extended here, even for the same plan', () => {
    expect(decidePurchase(live({ provider: 'paddle' }), 'starter', 'monthly', NOW)).toMatchObject({
      allowed: false,
      reason: 'other_provider_live',
    });
  });
});

describe('an ended term never blocks and never carries over', () => {
  it('after the end date any plan may be bought, starting NOW (lapsed days are not stacked)', () => {
    for (const [plan, cycle] of [
      ['starter', 'monthly'],
      ['business', 'monthly'],
      ['starter', 'yearly'],
    ] as const) {
      const d = decidePurchase(live({ currentPeriodEnd: at(-5) }), plan, cycle, NOW);
      expect(d).toMatchObject({ allowed: true, kind: 'new', newEnd: at(TERM_DAYS[cycle]) });
    }
  });
  it('a canceled record never blocks', () => {
    expect(decidePurchase(live({ status: 'canceled' }), 'business', 'yearly', NOW)).toMatchObject({
      kind: 'new',
    });
  });
  it('an expired term from another provider does not block either', () => {
    expect(
      decidePurchase(
        live({ provider: 'paddle', currentPeriodEnd: at(-1) }),
        'starter',
        'monthly',
        NOW
      )
    ).toMatchObject({ kind: 'new' });
  });
});

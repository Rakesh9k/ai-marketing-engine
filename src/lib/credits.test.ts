import { computeCreditsRemaining } from './credits';

describe('computeCreditsRemaining', () => {
  it('counts purchased top-up credits (they live on the usage doc, not the subscription)', () => {
    expect(
      computeCreditsRemaining({ creditsIncluded: 100 }, { creditsIncluded: 600, creditsUsed: 0 })
    ).toBe(600);
  });
  it('subtracts usage and never goes negative', () => {
    expect(computeCreditsRemaining(null, { creditsIncluded: 500, creditsUsed: 120 })).toBe(380);
    expect(computeCreditsRemaining(null, { creditsIncluded: 100, creditsUsed: 140 })).toBe(0);
  });
  it('falls back to the subscription, then to the free allowance, when there is no usage doc', () => {
    expect(computeCreditsRemaining({ creditsIncluded: 500 }, null)).toBe(500);
    expect(computeCreditsRemaining(null, null)).toBe(140);
  });
});

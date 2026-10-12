import { installLiveBudgetOrThrow, LIVE_BUDGET_CEILING_INR } from './liveBudget';
import { getUsageMeter, installUsageMeter } from './usageMeter';

const models = {
  text: 'gemini-3.1-flash-lite',
  vision: 'gemini-3.5-flash-lite',
  image: 'gemini-3.1-flash-lite-image',
};
afterEach(() => installUsageMeter(null));

describe('live budget gate', () => {
  it.each([undefined, '', '0', '-5', 'abc'])(
    'refuses LIVE_BUDGET_INR=%p (no implicit allowance)',
    (v) => {
      expect(() =>
        installLiveBudgetOrThrow({ GEMINI_API_KEY: 'k', LIVE_BUDGET_INR: v }, models)
      ).toThrow(/LIVE_BUDGET_INR/);
      expect(getUsageMeter()).toBeNull();
    }
  );
  it('refuses a budget above the approved ceiling (the ₹300 batch is not approved)', () => {
    expect(() =>
      installLiveBudgetOrThrow(
        { GEMINI_API_KEY: 'k', LIVE_BUDGET_INR: String(LIVE_BUDGET_CEILING_INR + 1) },
        models
      )
    ).toThrow(/approved ceiling/);
  });
  it('refuses without a key, and with the discovery alias', () => {
    expect(() => installLiveBudgetOrThrow({ LIVE_BUDGET_INR: '50' }, models)).toThrow(
      /GEMINI_API_KEY/
    );
    expect(() =>
      installLiveBudgetOrThrow(
        { GEMINI_API_KEY: 'k', LIVE_BUDGET_INR: '50' },
        { ...models, discovery: 'gemini-flash-lite-latest' }
      )
    ).toThrow(/alias/);
  });
  it('installs a meter with exactly the stated budget', () => {
    const m = installLiveBudgetOrThrow({ GEMINI_API_KEY: 'k', LIVE_BUDGET_INR: '100' }, models);
    expect(getUsageMeter()).toBe(m);
    expect(m.config.budgetInr).toBe(100);
  });
});

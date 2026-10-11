import { z } from 'zod';

const generateContentMock = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({ generateContent: (...a: unknown[]) => generateContentMock(...a) }),
  })),
}));

import {
  UsageMeter,
  BudgetExceededError,
  RunStoppedError,
  installUsageMeter,
  getUsageMeter,
  meteredCall,
  withMeterContext,
  runScenariosUnderBudget,
  liveRunEnvironmentProblems,
  ASSUMED_LIVE_PRICES,
  type MeterConfig,
} from './usageMeter';
import { GeminiTextProvider } from './text';
import { GeminiImageProvider } from './image';

const cfg = (over: Partial<MeterConfig> = {}): MeterConfig => ({
  budgetInr: 10,
  usdToInr: 100,
  prices: { m: { inputPerMTokUsd: 1, outputPerMTokUsd: 10, maxCallUsd: 0.02 } }, // max ₹2 per call
  defaultPrice: { inputPerMTokUsd: 5, outputPerMTokUsd: 20, maxCallUsd: 0.05 }, // max ₹5
  imageFallbackUsd: 0.04, // ₹4
  failedCallChargeFraction: 1,
  maxConsecutiveFailures: 2,
  ...over,
});
const usage = (i: number, o: number) => ({ promptTokenCount: i, candidatesTokenCount: o });

afterEach(() => installUsageMeter(null));

describe('inactive by default', () => {
  it('passes straight through when no meter is installed (production path)', async () => {
    expect(getUsageMeter()).toBeNull();
    const fn = jest.fn().mockResolvedValue('x');
    await expect(meteredCall({ kind: 'text', model: 'm' }, fn, () => undefined)).resolves.toBe('x');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('cost accounting', () => {
  it('measures cost from reported tokens', async () => {
    const m = new UsageMeter(cfg());
    installUsageMeter(m);
    await meteredCall(
      { kind: 'text', model: 'm' },
      async () => 1,
      () => usage(100_000, 10_000)
    );
    // 100k in * $1/M + 10k out * $10/M = $0.10 + $0.10 = $0.20 = ₹20 ... bounded by test config: expect exact maths
    expect(m.spentInr).toBeCloseTo((0.1 + 0.1) * 100, 6);
    expect(m.ledger[0]).toMatchObject({
      costSource: 'measured',
      inputTokens: 100_000,
      outputTokens: 10_000,
      ok: true,
    });
  });

  it('thinking tokens are billed as output', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1000 }));
    installUsageMeter(m);
    await meteredCall(
      { kind: 'text', model: 'm' },
      async () => 1,
      () => ({ promptTokenCount: 0, candidatesTokenCount: 1000, thoughtsTokenCount: 4000 })
    );
    expect(m.ledger[0]!.outputTokens).toBe(5000);
  });

  it('a call that reports NO usage is charged its conservative maximum, never free', async () => {
    const m = new UsageMeter(cfg());
    installUsageMeter(m);
    await meteredCall(
      { kind: 'text', model: 'm' },
      async () => 1,
      () => undefined
    );
    expect(m.spentInr).toBeCloseTo(2, 6);
    expect(m.ledger[0]!.costSource).toBe('fallback');
  });

  it('an unknown model uses the pessimistic default price', async () => {
    const m = new UsageMeter(cfg());
    installUsageMeter(m);
    await meteredCall(
      { kind: 'text', model: 'mystery' },
      async () => 1,
      () => undefined
    );
    expect(m.spentInr).toBeCloseTo(5, 6);
  });

  it('an image call with no usage is charged the assumed per-image price', async () => {
    const m = new UsageMeter(
      cfg({
        budgetInr: 100,
        prices: { img: { inputPerMTokUsd: 0.3, outputPerMTokUsd: 30, maxCallUsd: 0.08 } },
      })
    );
    installUsageMeter(m);
    await meteredCall(
      { kind: 'image', model: 'img' },
      async () => 1,
      () => undefined
    );
    expect(m.spentInr).toBeCloseTo(4, 6);
    expect(m.ledger[0]!.imageCalls).toBe(1);
  });

  it('a FAILED call is still charged (a timeout may be billed): retries and failures count', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 100 }));
    installUsageMeter(m);
    await expect(
      meteredCall(
        { kind: 'text', model: 'm' },
        async () => {
          throw new Error('503');
        },
        () => undefined
      )
    ).rejects.toThrow('503');
    expect(m.spentInr).toBeCloseTo(2, 6);
    expect(m.ledger[0]).toMatchObject({ ok: false, costSource: 'fallback', error: '503' });
  });
});

describe('the cap is enforced before the provider is contacted', () => {
  it('refuses a call whose worst case does not fit, without invoking the provider', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 3 })); // room for one ₹2 reservation, not two
    installUsageMeter(m);
    await meteredCall(
      { kind: 'text', model: 'm' },
      async () => 1,
      () => usage(1, 1)
    ); // measured ≈ ₹0
    const fn = jest.fn();
    await expect(
      meteredCall({ kind: 'text', model: 'mystery' }, fn, () => undefined)
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fn).not.toHaveBeenCalled();
    expect(m.stopped).toMatch(/budget of ₹3 would be exceeded/);
  });

  it('parallel calls cannot overshoot: worst cases are reserved up front', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 5 })); // ₹2 each -> two fit, the third does not
    installUsageMeter(m);
    const gate: Array<() => void> = [];
    const slow = () => new Promise<number>((resolve) => gate.push(() => resolve(1)));
    const calls = [1, 2, 3].map(() =>
      meteredCall({ kind: 'text', model: 'm' }, slow, () => undefined)
    );
    const results = await Promise.race([
      Promise.allSettled(calls),
      new Promise((r) =>
        setTimeout(() => {
          gate.forEach((g) => g());
          r(null);
        }, 20)
      ).then(() => Promise.allSettled(calls)),
    ]);
    const settled = results as PromiseSettledResult<number>[];
    expect(settled.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(m.spentInr).toBeLessThanOrEqual(5);
  });

  it('once stopped, every later call is refused', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1 }));
    installUsageMeter(m);
    await expect(
      meteredCall({ kind: 'text', model: 'm' }, jest.fn(), () => undefined)
    ).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(
      meteredCall({ kind: 'text', model: 'm' }, jest.fn(), () => undefined)
    ).rejects.toBeInstanceOf(RunStoppedError);
  });

  it('consecutive provider failures stop the run; a success resets the count', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1000, maxConsecutiveFailures: 2 }));
    installUsageMeter(m);
    const fail = () =>
      meteredCall(
        { kind: 'text', model: 'm' },
        async () => {
          throw new Error('x');
        },
        () => undefined
      ).catch(() => undefined);
    await fail();
    await meteredCall(
      { kind: 'text', model: 'm' },
      async () => 1,
      () => usage(1, 1)
    ); // reset
    await fail();
    expect(m.stopped).toBeNull();
    await fail();
    expect(m.stopped).toMatch(/2 consecutive provider failures/);
    await expect(
      meteredCall({ kind: 'text', model: 'm' }, jest.fn(), () => undefined)
    ).rejects.toBeInstanceOf(RunStoppedError);
  });
});

describe('scenario runner and audit output', () => {
  it('attributes calls to scenarios and reports estimated vs measured cost', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1000 }));
    installUsageMeter(m);
    const outcomes = await runScenariosUnderBudget(m, [
      {
        name: 'S1',
        run: async () => {
          await meteredCall(
            { kind: 'text', model: 'm' },
            async () => 1,
            () => usage(10_000, 1_000)
          );
        },
      },
      {
        name: 'S2',
        run: async () => {
          await meteredCall(
            { kind: 'text', model: 'm' },
            async () => 1,
            () => undefined
          );
        },
      },
    ]);
    expect(outcomes.map((o) => o.status)).toEqual(['completed', 'completed']);
    const s = m.summary({ S1: 5, S2: 5 });
    expect(s.byScenario['S1']).toMatchObject({ calls: 1, estimatedInr: 5 });
    expect(s.byScenario['S1']!.measuredInr).toBeGreaterThan(0);
    expect(s.byScenario['S2']!.fallbackInr).toBeCloseTo(2, 6); // unreported usage charged at max
    expect(s.byModel['m']!.calls).toBe(2);
    expect(s.totalSpentInr).toBeCloseTo(m.spentInr, 9);
  });

  it('when the cap is hit: the running scenario is incomplete and the rest are skipped, never dropped', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 5 }));
    installUsageMeter(m);
    const call = () =>
      meteredCall(
        { kind: 'text', model: 'mystery' },
        async () => 1,
        () => undefined
      ); // ₹5 each
    const outcomes = await runScenariosUnderBudget(m, [
      {
        name: 'A',
        run: async () => {
          await call();
        },
      }, // spends ₹5
      {
        name: 'B',
        run: async () => {
          await call();
        },
      }, // refused
      {
        name: 'C',
        run: async () => {
          await call();
        },
      },
    ]);
    expect(outcomes.map((o) => `${o.name}:${o.status}`)).toEqual([
      'A:completed',
      'B:incomplete',
      'C:skipped',
    ]);
    expect(m.spentInr).toBeLessThanOrEqual(5);
  });

  it('a scenario that swallows the refusal (provider wrappers re-throw as plain errors) is still reported incomplete', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1 }));
    installUsageMeter(m);
    const outcomes = await runScenariosUnderBudget(m, [
      {
        name: 'A',
        run: async () => {
          await meteredCall({ kind: 'text', model: 'm' }, jest.fn(), () => undefined).catch(
            () => undefined
          );
        },
      },
    ]);
    expect(outcomes[0]).toMatchObject({ name: 'A', status: 'incomplete' });
  });

  it('withMeterContext attributes outside the runner too', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1000 }));
    installUsageMeter(m);
    await withMeterContext({ scenario: 'X', campaignRef: 'fixture-1' }, () =>
      meteredCall(
        { kind: 'text', model: 'm' },
        async () => 1,
        () => usage(1, 1)
      )
    );
    expect(m.ledger[0]).toMatchObject({ scenario: 'X', campaignRef: 'fixture-1' });
  });
});

describe('safety preconditions for a live run', () => {
  const ok = {
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
    GCLOUD_PROJECT: 'demo-mitra-audit',
    GEMINI_API_KEY: 'k',
  };
  it('passes only with emulators, a demo- project and a key', () => {
    expect(liveRunEnvironmentProblems(ok as never)).toEqual([]);
  });
  it.each([
    ['no Firestore emulator', { ...ok, FIRESTORE_EMULATOR_HOST: undefined }],
    ['no Storage emulator', { ...ok, FIREBASE_STORAGE_EMULATOR_HOST: undefined }],
    ['a production project id', { ...ok, GCLOUD_PROJECT: 'brainwise-ai-marketing-engine' }],
    ['no key', { ...ok, GEMINI_API_KEY: undefined }],
    ['NODE_ENV=production', { ...ok, NODE_ENV: 'production' }],
  ])('refuses %s', (_label, env) => {
    expect(liveRunEnvironmentProblems(env as never).length).toBeGreaterThan(0);
  });
  it('the assumed price table is pessimistic and the budget is the approved ₹300 ceiling', () => {
    expect(ASSUMED_LIVE_PRICES.budgetInr).toBe(300);
    expect(ASSUMED_LIVE_PRICES.usdToInr).toBeGreaterThanOrEqual(88);
  });
});

describe('wired into the real providers', () => {
  const schema = z.object({ a: z.string() });
  beforeEach(() => {
    generateContentMock.mockReset();
    process.env['GEMINI_API_KEY'] = 'test-key-unit-tests-only';
  });

  it('text provider: each call (including a schema repair) is metered from usageMetadata', async () => {
    const m = new UsageMeter(
      cfg({
        budgetInr: 1000,
        prices: {
          'gemini-3.1-flash-lite': { inputPerMTokUsd: 1, outputPerMTokUsd: 10, maxCallUsd: 0.02 },
        },
        defaultPrice: { inputPerMTokUsd: 1, outputPerMTokUsd: 10, maxCallUsd: 0.02 },
      })
    );
    installUsageMeter(m);
    generateContentMock
      .mockResolvedValueOnce({
        response: {
          text: () => '{"wrong":1}',
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 50 },
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => '{"a":"ok"}',
          usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 20 },
        },
      });
    const out = await new GeminiTextProvider().generateStructured('prompt', schema);
    expect(out).toEqual({ a: 'ok' });
    expect(m.ledger).toHaveLength(2); // the first attempt AND the repair are both counted
    expect(m.ledger.every((e) => e.kind === 'text' && e.costSource === 'measured')).toBe(true);
    expect(m.ledger[1]!.inputTokens).toBe(1500);
  });

  it('text provider: a refused call never reaches the SDK', async () => {
    const m = new UsageMeter(cfg({ budgetInr: 1 }));
    installUsageMeter(m);
    await expect(new GeminiTextProvider().generateStructured('p', schema)).rejects.toThrow();
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('image provider: measured from usageMetadata; reservation released on HTTP failure; refused calls never fetch', async () => {
    const realFetch = global.fetch;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const m = new UsageMeter(
        cfg({
          budgetInr: 100,
          prices: {
            'gemini-2.5-flash-image': {
              inputPerMTokUsd: 0.3,
              outputPerMTokUsd: 30,
              maxCallUsd: 0.08,
            },
          },
        })
      );
      installUsageMeter(m);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: Buffer.from('x').toString('base64'),
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 1290 },
        }),
        text: async () => '',
      });
      const res = await new GeminiImageProvider().generateImage({
        prompt: 'p',
        generationMode: 'product_ad',
      } as never);
      expect(res.success).toBe(true);
      expect(m.ledger[0]).toMatchObject({
        kind: 'image',
        imageCalls: 1,
        costSource: 'measured',
        outputTokens: 1290,
      });

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => 'down',
      });
      const bad = await new GeminiImageProvider().generateImage({
        prompt: 'p',
        generationMode: 'product_ad',
      } as never);
      expect(bad.success).toBe(false);
      expect(m.ledger[1]).toMatchObject({ ok: false });
      expect(m.remainingInr).toBeCloseTo(m.config.budgetInr - m.spentInr, 9); // nothing left reserved

      const tiny = new UsageMeter(cfg({ budgetInr: 1 }));
      installUsageMeter(tiny);
      fetchMock.mockClear();
      await expect(
        new GeminiImageProvider().generateImage({
          prompt: 'p',
          generationMode: 'product_ad',
        } as never)
      ).resolves.toMatchObject({ success: false });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = realFetch;
    }
  });
});

/**
 * LIVE end-to-end check of the discovery callable: the real Gemini provider behind the real callable,
 * on the real Firestore emulator. OPT-IN — skipped unless `LIVE_GEMINI=1`, a real `GEMINI_API_KEY` and
 * the Firestore emulator are all present, so it never runs in normal CI or spends anything by default.
 *
 *   LIVE_GEMINI=1 firebase emulators:exec --only firestore,auth --project demo-live \
 *     "npm --prefix functions run test -- src/functions/onboarding/discoverOnboardingFacts.live"
 *
 * Synthetic, non-sensitive data only. Proves what the mocked tests cannot:
 *   - a real response is stored as an unconfirmed guess and returned;
 *   - discovery consumes ZERO credits (usage, subscription and transactions are untouched);
 *   - every real failure (retired model, invalid key) comes back as `unavailable` — never an error to
 *     the owner — and leaves their answers untouched;
 *   - the API key (real or fake) never appears in anything logged or returned.
 */
const live =
  process.env['LIVE_GEMINI'] === '1' &&
  !!process.env['GEMINI_API_KEY'] &&
  !!process.env['FIRESTORE_EMULATOR_HOST'];
const describeLive = live ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { discoverOnboardingFacts } from './discoverOnboardingFacts';
import { saveOnboardingDraft } from './saveOnboardingDraft';

const REAL_KEY = process.env['GEMINI_API_KEY'] ?? '';
const FAKE_KEY = 'AIzaSyFAKE0000000000000000000000000000';

const call = (fn: unknown, data: unknown, uid: string) =>
  (fn as any).run({ data, auth: { uid, token: {} } });

const READY = [
  { path: 'identity.industry', value: 'fitness' },
  { path: 'identity.subcategory', value: 'yoga' },
  { path: 'identity.name', value: 'Prana Yoga Studio' },
  { path: 'identity.city', value: 'Pune' },
];

describeLive('discoverOnboardingFacts — LIVE Gemini behind the real callable', () => {
  jest.setTimeout(120_000);
  const db = admin.firestore();
  const captured: string[] = [];
  const spies: jest.SpyInstance[] = [];

  beforeAll(() => {
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      spies.push(
        jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
          captured.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
        })
      );
    }
  });

  afterAll(async () => {
    spies.forEach((s) => s.mockRestore());
    const everything = captured.join('\n');
    expect(everything).not.toContain(REAL_KEY);
    expect(everything).not.toContain(FAKE_KEY);
    await admin.app().delete();
  });

  /** An owner with a credit record we can watch, and a draft that is ready for discovery. */
  async function owner() {
    const uid = `user-${uuid()}`;
    const subscriptionId = `sub-${uid}`;
    const usageId = `usage-${uid}`;
    await db.collection('subscriptions').doc(subscriptionId).set({
      subscriptionId,
      userId: uid,
      planId: 'free',
      status: 'active',
      creditsIncluded: 100,
      creditsUsed: 0,
    });
    await db.collection('usage').doc(usageId).set({
      usageId,
      userId: uid,
      planId: 'free',
      creditsIncluded: 100,
      creditsUsed: 0,
      campaignsCreated: 0,
    });
    await db.collection('users').doc(uid).set({ userId: uid, subscriptionId, businessIds: [] });
    await call(saveOnboardingDraft, { welcomed: true, updates: READY }, uid);
    return { uid, subscriptionId, usageId };
  }

  const creditState = async (o: { uid: string; subscriptionId: string; usageId: string }) => ({
    subscription: (await db.collection('subscriptions').doc(o.subscriptionId).get()).data(),
    usage: (await db.collection('usage').doc(o.usageId).get()).data(),
    transactions: (await db.collection('transactions').where('userId', '==', o.uid).get()).size,
    generationLogs: (await db.collection('generation_logs').where('userId', '==', o.uid).get())
      .size,
  });

  it('real Gemini: stores unconfirmed guesses, returns them, and consumes zero credits', async () => {
    const o = await owner();
    const before = await creditState(o);

    const started = Date.now();
    const result = await call(discoverOnboardingFacts, {}, o.uid);
    const ms = Date.now() - started;

    expect(result.status).toBe('completed');
    expect(ms).toBeLessThan(20_000);
    expect(result.suggestions['offering.signature'].length).toBeGreaterThan(0);

    const draft = (await db.collection('onboarding_drafts').doc(o.uid).get()).data()!;
    expect(draft['facts']['offering__signature']).toMatchObject({
      source: 'AI_INFERRED',
      confirmed: false,
    });
    expect(draft['facts']['offering__signature'].confidence).toBeLessThanOrEqual(0.7);
    expect(draft['discovery'].status).toBe('completed');

    // Zero credits: nothing about the owner's credit state changed in any way.
    expect(await creditState(o)).toEqual(before);
    expect(before.subscription!['creditsUsed']).toBe(0);
    expect(before.usage!['creditsUsed']).toBe(0);

    // eslint-disable-next-line no-console -- surfaced via the afterAll-restored console only
    captured.push(
      `LIVE callable: completed in ${ms}ms, suggestions=${JSON.stringify(result.suggestions)}`
    );
  });

  it('a second call for the same business is served from the saved result (no second model call)', async () => {
    const o = await owner();
    expect((await call(discoverOnboardingFacts, {}, o.uid)).status).toBe('completed');
    const started = Date.now();
    const again = await call(discoverOnboardingFacts, {}, o.uid);
    expect(again.status).toBe('cached');
    expect(Date.now() - started).toBeLessThan(2_000); // no provider round trip
  });

  describe('real failures surface as "unavailable", never as an error', () => {
    const withEnv = async (vars: Record<string, string>, fn: () => Promise<void>) => {
      const before: Record<string, string | undefined> = {};
      for (const k of Object.keys(vars)) {
        before[k] = process.env[k];
        process.env[k] = vars[k]!;
      }
      try {
        await fn();
      } finally {
        for (const [k, v] of Object.entries(before)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
    };

    it('a retired model (the old default) is unavailable, and the owner loses nothing', async () => {
      const o = await owner();
      const before = await creditState(o);
      await withEnv({ GEMINI_DISCOVERY_MODEL: 'gemini-1.5-flash' }, async () => {
        const result = await call(discoverOnboardingFacts, {}, o.uid); // must not throw
        expect(result.status).toBe('unavailable');
        expect(Object.keys(result.suggestions ?? {})).toEqual([]); // no suggestions, not an error
      });

      const draft = (await db.collection('onboarding_drafts').doc(o.uid).get()).data()!;
      expect(draft['discovery'].status).toBe('failed');
      expect(Object.keys(draft['facts']).sort()).toEqual([
        'identity__city',
        'identity__industry',
        'identity__name',
        'identity__subcategory',
      ]); // the owner's answers are exactly as they were
      expect(await creditState(o)).toEqual(before); // and a failure costs nothing either
    });

    it('an invalid API key is unavailable, and the key appears in nothing returned or logged', async () => {
      const o = await owner();
      await withEnv({ GEMINI_API_KEY: FAKE_KEY }, async () => {
        const result = await call(discoverOnboardingFacts, {}, o.uid);
        expect(result.status).toBe('unavailable');
        expect(JSON.stringify(result)).not.toContain(FAKE_KEY);
      });
      // (afterAll asserts neither the fake nor the real key is anywhere in the captured logs.)
    });

    it('a failure is not hammered: an immediate retry for the same business makes no new provider call', async () => {
      const o = await owner();
      await withEnv({ GEMINI_DISCOVERY_MODEL: 'gemini-1.5-flash' }, async () => {
        expect((await call(discoverOnboardingFacts, {}, o.uid)).status).toBe('unavailable');
      });
      // Back on a working model, but still inside the cool-down: answered from the record.
      const started = Date.now();
      expect((await call(discoverOnboardingFacts, {}, o.uid)).status).toBe('unavailable');
      expect(Date.now() - started).toBeLessThan(2_000);
    });
  });
});

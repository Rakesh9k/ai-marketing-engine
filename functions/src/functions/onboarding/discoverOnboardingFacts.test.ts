/**
 * discoverOnboardingFacts against the real Firestore emulator, with only the AI provider mocked.
 * SKIPPED, never falsely green, when the emulator is not running.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const generateStructuredTextMock = jest.fn();
jest.mock('../../services/ai', () => ({
  generateStructuredText: (...a: unknown[]) => generateStructuredTextMock(...a),
}));

// Discovery is free: it must never touch credit enforcement. Tripwire, not a stub.
const creditReserveMock = jest.fn();
jest.mock('../../services/usageControl', () => ({
  executeWithUsageControl: (...a: unknown[]) => creditReserveMock(...a),
  reserveCreditsForOperation: (...a: unknown[]) => creditReserveMock(...a),
}));

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { discoverOnboardingFacts } from './discoverOnboardingFacts';
import { saveOnboardingDraft } from './saveOnboardingDraft';

const call = (fn: unknown, data: unknown, uid: string) =>
  (fn as any).run({ data, auth: { uid, token: {} } });

const READY = [
  { path: 'identity.industry', value: 'restaurant_food' },
  { path: 'identity.subcategory', value: 'cloud_kitchen' },
  { path: 'identity.name', value: 'Biryani House' },
  { path: 'identity.city', value: 'Hyderabad' },
];

describeIfEmulator('discoverOnboardingFacts (emulator)', () => {
  const db = admin.firestore();
  const draftOf = async (uid: string) =>
    (await db.collection('onboarding_drafts').doc(uid).get()).data()!;

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await admin.app().delete();
  });

  async function readyOwner(extra: Array<{ path: string; value: unknown }> = []) {
    const uid = `user-${uuid()}`;
    await call(saveOnboardingDraft, { updates: [...READY, ...extra] }, uid);
    return uid;
  }

  it('is not ready until the business type, name and city are known, and then makes no AI call', async () => {
    const uid = `user-${uuid()}`;
    await call(
      saveOnboardingDraft,
      { updates: [{ path: 'identity.industry', value: 'retail' }] },
      uid
    );
    const r = await call(discoverOnboardingFacts, {}, uid);
    expect(r.status).toBe('not_ready');
    expect(generateStructuredTextMock).not.toHaveBeenCalled();
  });

  it('stores suggestions as unconfirmed guesses, spends no credits, and returns them', async () => {
    generateStructuredTextMock.mockResolvedValue({
      offerings: ['Biryani', 'Haleem', 'Best kebabs in town'],
      audiences: ['Families'],
    });
    const uid = await readyOwner();

    const r = await call(discoverOnboardingFacts, {}, uid);

    expect(r.status).toBe('completed');
    expect(r.suggestions).toEqual({
      'offering.signature': ['Biryani', 'Haleem'], // the claim was sanitised away
      'audience.primary': ['Families'],
    });
    const d = await draftOf(uid);
    expect(d['facts']['offering__signature']).toMatchObject({
      source: 'AI_INFERRED',
      confirmed: false,
    });
    expect(d['discovery'].status).toBe('completed');
    expect(creditReserveMock).not.toHaveBeenCalled();
  });

  it("never sends the owner's name to the model", async () => {
    generateStructuredTextMock.mockResolvedValue({ offerings: ['Biryani'] });
    const uid = await readyOwner([{ path: 'owner.name', value: 'Asha Rao' }]);
    await call(discoverOnboardingFacts, {}, uid);
    expect(generateStructuredTextMock.mock.calls[0]![0]).not.toContain('Asha');
  });

  it('answers a repeat from the saved result instead of calling the model again', async () => {
    generateStructuredTextMock.mockResolvedValue({ offerings: ['Biryani'] });
    const uid = await readyOwner();
    await call(discoverOnboardingFacts, {}, uid);
    const again = await call(discoverOnboardingFacts, {}, uid);
    expect(again.status).toBe('cached');
    expect(generateStructuredTextMock).toHaveBeenCalledTimes(1);
  });

  it('runs again when the business details change', async () => {
    generateStructuredTextMock.mockResolvedValue({ offerings: ['Biryani'] });
    const uid = await readyOwner();
    await call(discoverOnboardingFacts, {}, uid);
    await call(saveOnboardingDraft, { updates: [{ path: 'identity.city', value: 'Pune' }] }, uid);
    await call(discoverOnboardingFacts, {}, uid);
    expect(generateStructuredTextMock).toHaveBeenCalledTimes(2);
  });

  it('a provider failure is "unavailable", not an error, so onboarding is never blocked', async () => {
    generateStructuredTextMock.mockRejectedValue(new Error('503 provider down'));
    const uid = await readyOwner();

    const r = await call(discoverOnboardingFacts, {}, uid); // must not throw

    expect(r.status).toBe('unavailable');
    const d = await draftOf(uid);
    expect(d['discovery'].status).toBe('failed');
    expect(Object.keys(d['facts']).sort()).toEqual([
      'identity__city',
      'identity__industry',
      'identity__name',
      'identity__subcategory',
    ]); // the owner's answers are untouched
  });

  it('malformed or all-claims output counts as unavailable, and does not hammer the model', async () => {
    generateStructuredTextMock.mockResolvedValue({ offerings: ['Best food ever', '#1 chef'] });
    const uid = await readyOwner();
    expect((await call(discoverOnboardingFacts, {}, uid)).status).toBe('unavailable');
    // Within the cool-down, an identical retry is answered without another model call.
    expect((await call(discoverOnboardingFacts, {}, uid)).status).toBe('unavailable');
    expect(generateStructuredTextMock).toHaveBeenCalledTimes(1);
  });

  it('can never overwrite an offering the owner already confirmed', async () => {
    generateStructuredTextMock.mockResolvedValue({ offerings: ['Pizza'], audiences: ['Students'] });
    const uid = await readyOwner([{ path: 'offering.signature', value: ['Haleem'] }]);

    const r = await call(discoverOnboardingFacts, {}, uid);

    const d = await draftOf(uid);
    expect(d['facts']['offering__signature']).toMatchObject({
      value: ['Haleem'],
      source: 'USER_CONFIRMED',
      confirmed: true,
    });
    expect(r.suggestions['audience.primary']).toEqual(['Students']); // other guesses still arrive
  });

  it('rejects unauthenticated callers', async () => {
    await expect((discoverOnboardingFacts as any).run({ data: {} })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});

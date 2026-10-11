/**
 * saveOnboardingDraft against the real Firestore emulator (skipped, never falsely green, when the
 * emulator is not running — same pattern as createBusiness.test.ts). The pure rules are covered in
 * onboarding/draftModel.test.ts; this proves the callable wires them to the right document in a
 * real transaction, and that identity comes from the token, not the request.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { saveOnboardingDraft } from './saveOnboardingDraft';

const run = (data: unknown, uid: string | null, token: Record<string, unknown> = {}) =>
  (saveOnboardingDraft as any).run({
    data,
    auth: uid ? { uid, token } : undefined,
  });

describeIfEmulator('saveOnboardingDraft (emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  it('creates onboarding_drafts/{uid} on first save and stamps provenance server-side', async () => {
    const uid = `user-${uuid()}`;
    const { draft } = await run(
      { welcomed: true, updates: [{ path: 'owner.name', value: 'Asha' }] },
      uid
    );

    expect(draft.revision).toBe(1);
    const stored = (await db.collection('onboarding_drafts').doc(uid).get()).data()!;
    expect(stored['uid']).toBe(uid);
    expect(stored['welcomed']).toBe(true);
    expect(stored['facts']['owner__name']).toMatchObject({
      value: 'Asha',
      source: 'USER_CONFIRMED',
      confirmed: true,
      confidence: 1,
    });
  });

  it('merges later saves into the same draft and keeps earlier answers (resume)', async () => {
    const uid = `user-${uuid()}`;
    await run({ updates: [{ path: 'owner.name', value: 'Asha' }] }, uid);
    const { draft } = await run(
      { updates: [{ path: 'identity.industry', value: 'restaurant_food' }] },
      uid
    );
    expect(draft.revision).toBe(2);
    expect(Object.keys(draft.facts).sort()).toEqual(['identity__industry', 'owner__name']);
  });

  it("writes only the caller's own draft — a uid in the payload is ignored", async () => {
    const mine = `user-${uuid()}`;
    const victim = `user-${uuid()}`;
    await run({ updates: [{ path: 'owner.name', value: 'Victim' }] }, victim);

    await run({ uid: victim, updates: [{ path: 'owner.name', value: 'Mallory' }] }, mine);

    const victimDraft = (await db.collection('onboarding_drafts').doc(victim).get()).data()!;
    expect(victimDraft['facts']['owner__name'].value).toBe('Victim');
    const mineDraft = (await db.collection('onboarding_drafts').doc(mine).get()).data()!;
    expect(mineDraft['facts']['owner__name'].value).toBe('Mallory');
  });

  it('rejects unknown fields as invalid-argument, and writes nothing', async () => {
    const uid = `user-${uuid()}`;
    await expect(
      run({ updates: [{ path: 'brand.colors.primary', value: '#fff' }] }, uid)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect((await db.collection('onboarding_drafts').doc(uid).get()).exists).toBe(false);
  });

  it('rejects unauthenticated callers', async () => {
    await expect(run({ welcomed: true }, null)).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it("pre-fills the owner's name from their Google account as an unconfirmed detection, never as a fact", async () => {
    const uid = `user-${uuid()}`;
    const { draft } = await run({ welcomed: true }, uid, { name: 'Asha Rao' });
    expect(draft.facts['owner__name']).toMatchObject({
      value: 'Asha',
      source: 'AI_DETECTED',
      confirmed: false,
    });
    expect(draft.revision).toBe(1);
  });

  it("an owner's own answer replaces the pre-filled name and becomes confirmed", async () => {
    const uid = `user-${uuid()}`;
    await run({ welcomed: true }, uid, { name: 'Asha Rao' });
    const { draft } = await run({ updates: [{ path: 'owner.name', value: 'Ashu' }] }, uid, {
      name: 'Asha Rao',
    });
    expect(draft.facts['owner__name']).toMatchObject({ value: 'Ashu', confirmed: true });
  });

  it('warns (but still saves) when the caller is behind another tab, and not otherwise', async () => {
    const uid = `user-${uuid()}`;
    const first = await run({ updates: [{ path: 'owner.name', value: 'Asha' }] }, uid);
    expect(first.stale).toBe(false);

    // "Tab B" writes, moving the revision on.
    await run({ updates: [{ path: 'owner.role', value: 'owner' }] }, uid);

    // "Tab A" still believes revision 1.
    const behind = await run(
      { baseRevision: 1, updates: [{ path: 'identity.industry', value: 'fitness' }] },
      uid
    );
    expect(behind.stale).toBe(true);
    expect(Object.keys(behind.draft.facts).sort()).toEqual([
      'identity__industry',
      'owner__name',
      'owner__role',
    ]); // last write wins per field; nothing was lost

    const current = await run(
      {
        baseRevision: behind.draft.revision,
        updates: [{ path: 'identity.subcategory', value: 'gym' }],
      },
      uid
    );
    expect(current.stale).toBe(false);
  });

  it('records the funnel server-side once per milestone, with no free text', async () => {
    const uid = `user-${uuid()}`;
    await run({ welcomed: true, updates: [{ path: 'identity.industry', value: 'fitness' }] }, uid);
    await run({ updates: [{ path: 'owner.name', value: 'Secret Person' }] }, uid);
    // A retry of the same save must not double-count.
    await run({ updates: [{ path: 'identity.industry', value: 'fitness' }] }, uid);

    const events = await db.collection('analytics_events').where('userId', '==', uid).get();
    const names = events.docs.map((d) => d.data()['eventName']).sort();
    expect(names).toEqual([
      'onboarding_answered',
      'onboarding_answered',
      'onboarding_industry_selected',
      'onboarding_started',
    ]);
    expect(JSON.stringify(events.docs.map((d) => d.data()))).not.toContain('Secret Person');
  });
});

/**
 * Account deletion must take the owner's onboarding draft with it (it holds their name and what
 * they told Mitra about their business). Runs against the Firestore emulator; SKIPPED, never
 * falsely green, when it is not running.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import { onUserDeletedHandler } from './onUserCreated';

const run = (uid: string) =>
  (onUserDeletedHandler as unknown as { run: (r: unknown) => Promise<void> }).run({
    uid,
    email: `${uid}@test.example`,
  });

describeIfEmulator('onUserDeletedHandler — onboarding draft cleanup', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  it("deletes the user's onboarding draft", async () => {
    const uid = `user-${uuid()}`;
    await db.collection('users').doc(uid).set({ userId: uid, businessIds: [] });
    await db
      .collection('onboarding_drafts')
      .doc(uid)
      .set({ uid, facts: { owner__name: { value: 'Asha' } } });

    await run(uid);

    expect((await db.collection('onboarding_drafts').doc(uid).get()).exists).toBe(false);
  });

  it("leaves other users' drafts alone", async () => {
    const mine = `user-${uuid()}`;
    const other = `user-${uuid()}`;
    await db.collection('users').doc(mine).set({ userId: mine, businessIds: [] });
    await db.collection('onboarding_drafts').doc(other).set({ uid: other });

    await run(mine);

    expect((await db.collection('onboarding_drafts').doc(other).get()).exists).toBe(true);
  });

  it('still succeeds, and still archives businesses, when the user never started onboarding', async () => {
    const uid = `user-${uuid()}`;
    const businessId = `biz-${uuid()}`;
    await db
      .collection('users')
      .doc(uid)
      .set({ userId: uid, businessIds: [businessId] });
    await db
      .collection('businesses')
      .doc(businessId)
      .set({ businessId, userId: uid, status: 'active' });

    await run(uid); // no draft exists

    expect((await db.collection('businesses').doc(businessId).get()).data()!['status']).toBe(
      'archived'
    );
    expect((await db.collection('users').doc(uid).get()).data()!['deletedAt']).toBeTruthy();
  });
});

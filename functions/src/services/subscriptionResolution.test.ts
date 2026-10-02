/**
 * getSubscriptionByUser must return the user's PAID subscription even though the Free
 * subscription created at signup stays `active` alongside it (regression: an unordered
 * limit(1) query returned an arbitrary one, so a paying customer could be treated as Free).
 * Real Firestore emulator; self-skips without FIRESTORE_EMULATOR_HOST.
 */
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { getSubscriptionByUser } from './firestore';

let seq = 0;
const uniq = (p: string) => `${p}_${Date.now()}_${++seq}`;

describeIfEmulator('getSubscriptionByUser (Firestore emulator)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  async function seed(
    userId: string,
    subs: Array<{ id: string; planId: string; status: string }>,
    pointer?: string | null
  ) {
    await db
      .collection('users')
      .doc(userId)
      .set({ userId, subscriptionId: pointer ?? null });
    for (const s of subs) {
      await db
        .collection('subscriptions')
        .doc(s.id)
        .set({ subscriptionId: s.id, userId, planId: s.planId, status: s.status });
    }
  }

  it('returns the paid subscription when both Free and paid are active (pointer set)', async () => {
    const userId = uniq('u');
    // "01…" sorts before "sub_…", the order that used to win the unordered query.
    await seed(
      userId,
      [
        { id: '01a_free_' + userId, planId: 'free', status: 'active' },
        { id: 'sub_paid_' + userId, planId: 'business', status: 'active' },
      ],
      'sub_paid_' + userId
    );
    expect((await getSubscriptionByUser(userId))?.planId).toBe('business');
  });

  it('still prefers the paid subscription when the pointer is missing', async () => {
    const userId = uniq('u');
    await seed(userId, [
      { id: '01a_free_' + userId, planId: 'free', status: 'active' },
      { id: 'sub_paid_' + userId, planId: 'pro', status: 'active' },
    ]);
    expect((await getSubscriptionByUser(userId))?.planId).toBe('pro');
  });

  it('ignores a pointer to someone else’s or a canceled subscription', async () => {
    const userId = uniq('u');
    await seed(
      userId,
      [
        { id: '01a_free_' + userId, planId: 'free', status: 'active' },
        { id: 'sub_old_' + userId, planId: 'agency', status: 'canceled' },
      ],
      'sub_old_' + userId
    );
    expect((await getSubscriptionByUser(userId))?.planId).toBe('free');

    const other = uniq('other');
    await seed(other, [{ id: 'sub_other_' + other, planId: 'agency', status: 'active' }]);
    const victim = uniq('victim');
    await seed(
      victim,
      [{ id: '01a_free_' + victim, planId: 'free', status: 'active' }],
      'sub_other_' + other
    );
    expect((await getSubscriptionByUser(victim))?.planId).toBe('free');
  });

  it('returns null when the user has no live subscription', async () => {
    const userId = uniq('u');
    await seed(userId, [{ id: 'sub_c_' + userId, planId: 'starter', status: 'canceled' }]);
    expect(await getSubscriptionByUser(userId)).toBeNull();
  });
});

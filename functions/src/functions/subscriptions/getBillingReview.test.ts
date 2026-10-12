const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { getBillingReview } from './getBillingReview';

const call = (auth: unknown) =>
  (getBillingReview as unknown as { run: (r: unknown) => Promise<any> }).run({ data: {}, auth });

describeIfEmulator('getBillingReview access', () => {
  const db = admin.firestore();
  afterAll(async () => {
    await admin.app().delete();
  });

  it('refuses anonymous callers and ordinary users, and writes nothing', async () => {
    const before = (
      await db.collection('billing_audit').where('kind', '==', 'review_accessed').get()
    ).size;
    await expect(call(undefined)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(call({ uid: 'u1', token: {} })).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(call({ uid: 'u1', token: { role: 'owner' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
    const after = (
      await db.collection('billing_audit').where('kind', '==', 'review_accessed').get()
    ).size;
    expect(after).toBe(before);
  });

  it('lets an admin in and records who looked', async () => {
    const uid = `admin_${Date.now()}`;
    const res = await call({ uid, token: { role: 'admin' } });
    expect(Array.isArray(res.items)).toBe(true);
    const logged = await db.collection('billing_audit').where('userId', '==', uid).get();
    expect(logged.size).toBe(1);
    expect(logged.docs[0]!.data()).toMatchObject({ kind: 'review_accessed' });
  });
});

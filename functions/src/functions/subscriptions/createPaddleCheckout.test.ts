/**
 * createPaddleCheckout — real Firestore emulator; the Paddle SDK client is mocked (no
 * network). Proves the checkout side of the identity flow: the client only names a
 * Mitra product, the server resolves the price, and the Paddle transaction is created
 * with the purchaser in custom_data and a pending record keyed by the REAL Paddle
 * transaction ID — which is exactly what paddleWebhook later reconciles against.
 */
process.env['ACTIVE_PAYMENT_PROVIDER'] = 'paddle'; // these tests exercise the Paddle path, which is inert unless Paddle is the active provider
process.env['PADDLE_API_KEY'] = 'pdl_sdbx_apikey_test_only';
process.env['PADDLE_ENVIRONMENT'] = 'sandbox';
process.env['PADDLE_PRICE_ID_STARTER_MONTHLY'] = 'pri_starter_m';
process.env['PADDLE_PRICE_ID_PRO_YEARLY'] = 'pri_pro_y';
process.env['PADDLE_PRICE_ID_PACK_500'] = 'pri_pack_500';
// Deliberately NOT set: PADDLE_PRICE_ID_AGENCY_MONTHLY, PADDLE_PRICE_ID_PACK_3000.

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

const customersCreate = jest.fn();
const transactionsCreate = jest.fn();
jest.mock('../../services/paddle', () => ({
  ...jest.requireActual('../../services/paddle'),
  getPaddleClient: () => ({
    customers: { create: (...a: unknown[]) => customersCreate(...a) },
    transactions: { create: (...a: unknown[]) => transactionsCreate(...a) },
  }),
}));

import * as admin from 'firebase-admin';
import { createPaddleCheckout } from './createPaddleCheckout';

let seq = 0;
const uniq = (p: string) => `${p}_${Date.now()}_${++seq}`;
const call = (data: unknown, uid: string) =>
  (createPaddleCheckout as any).run({ data, auth: { uid, token: {} }, app: { appId: 'test' } });

describeIfEmulator('createPaddleCheckout (Firestore emulator, Paddle SDK mocked)', () => {
  const db = admin.firestore();

  afterAll(async () => {
    await admin.app().delete();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    customersCreate.mockResolvedValue({ id: 'ctm_new' });
    transactionsCreate.mockImplementation(async () => ({
      id: uniq('txn'),
      checkout: { url: null },
    }));
  });

  async function seedUser(userId: string, extra: Record<string, unknown> = {}) {
    await db
      .collection('users')
      .doc(userId)
      .set({
        userId,
        email: `${userId}@example.com`,
        displayName: 'Test User',
        role: 'owner',
        businessIds: [],
        ...extra,
      });
  }

  it('subscription: server-resolved price, purchaser in custom_data, pending record keyed by Paddle txn ID', async () => {
    const userId = uniq('u');
    await seedUser(userId);

    const result = await call({ planId: 'starter', billingCycle: 'monthly' }, userId);
    // The exact price ID used is returned so the client can verify it matches what it displayed.
    expect(result.priceId).toBe('pri_starter_m');

    expect(transactionsCreate).toHaveBeenCalledTimes(1);
    const arg = transactionsCreate.mock.calls[0]![0];
    expect(arg.items).toEqual([{ priceId: 'pri_starter_m', quantity: 1 }]);
    expect(arg.customerId).toBe('ctm_new');
    expect(arg.customData).toEqual({
      firebaseUid: userId,
      kind: 'subscription',
      planId: 'starter',
      billingCycle: 'monthly',
    });

    const pending = (await db.collection('transactions').doc(result.transactionId).get()).data()!;
    expect(pending).toMatchObject({
      transactionId: result.transactionId,
      paddleTransactionId: result.transactionId,
      userId,
      type: 'subscription',
      status: 'pending',
      provider: 'paddle',
      amount: 500,
      currency: 'INR',
    });
    expect(pending['metadata']).toMatchObject({
      planId: 'starter',
      billingCycle: 'monthly',
      expectedPriceINR: 999,
    });
    expect((await db.collection('users').doc(userId).get()).data()!['paddleCustomerId']).toBe(
      'ctm_new'
    );
  });

  it('expires the user’s earlier unpaid checkouts when they start a new one, and nothing else', async () => {
    const userId = uniq('u');
    const otherUser = uniq('other');
    await seedUser(userId);
    const mk = (id: string, uid: string, status: string, provider = 'paddle') =>
      db
        .collection('transactions')
        .doc(id)
        .set({ transactionId: id, userId: uid, type: 'subscription', status, provider });
    await mk('txn_old_pending_' + userId, userId, 'pending');
    await mk('txn_old_done_' + userId, userId, 'completed');
    await mk('txn_other_pending_' + otherUser, otherUser, 'pending');
    // A genuine credit reservation is also "pending" but is not a Paddle checkout.
    await db
      .collection('transactions')
      .doc('res_' + userId)
      .set({ transactionId: 'res_' + userId, userId, type: 'reservation', status: 'pending' });

    const result = await call({ creditPack: 500 }, userId);

    const status = async (id: string) =>
      (await db.collection('transactions').doc(id).get()).data()!['status'];
    expect(await status('txn_old_pending_' + userId)).toBe('expired');
    expect(await status('txn_old_done_' + userId)).toBe('completed');
    expect(await status('txn_other_pending_' + otherUser)).toBe('pending');
    expect(await status('res_' + userId)).toBe('pending');
    expect(await status(result.transactionId)).toBe('pending'); // the new checkout stays pending
  });

  it('uses customer-facing descriptions on the pending record', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    const sub = await call({ planId: 'starter', billingCycle: 'monthly' }, userId);
    const pack = await call({ creditPack: 500 }, userId);
    const d = async (id: string) =>
      (await db.collection('transactions').doc(id).get()).data()!['description'];
    expect(await d(sub.transactionId)).toBe('Starter plan (monthly) — subscription started');
    expect(await d(pack.transactionId)).toBe('500 credit top-up');
  });

  it('yearly Pro uses the yearly price and the pricing.ts amount', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    const result = await call({ planId: 'pro', billingCycle: 'yearly' }, userId);
    expect(transactionsCreate.mock.calls[0]![0].items[0].priceId).toBe('pri_pro_y');
    const pending = (await db.collection('transactions').doc(result.transactionId).get()).data()!;
    expect(pending['metadata']).toMatchObject({ expectedPriceINR: 24990 });
    expect(pending['amount']).toBe(2500);
  });

  it('credit pack: custom_data names the purchaser and pack; pending record is a credit_purchase', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    const result = await call({ creditPack: 500 }, userId);

    const arg = transactionsCreate.mock.calls[0]![0];
    expect(arg.items).toEqual([{ priceId: 'pri_pack_500', quantity: 1 }]);
    expect(arg.customData).toEqual({ firebaseUid: userId, kind: 'credit_pack', credits: 500 });
    const pending = (await db.collection('transactions').doc(result.transactionId).get()).data()!;
    expect(pending).toMatchObject({
      type: 'credit_purchase',
      amount: 500,
      status: 'pending',
      userId,
    });
    expect(pending['metadata']).toMatchObject({ expectedPriceINR: 499 });
  });

  it('reuses a stored Paddle customer instead of creating another', async () => {
    const userId = uniq('u');
    await seedUser(userId, { paddleCustomerId: 'ctm_existing' });
    await call({ creditPack: 500 }, userId);
    expect(customersCreate).not.toHaveBeenCalled();
    expect(transactionsCreate.mock.calls[0]![0].customerId).toBe('ctm_existing');
  });

  it('recovers the existing customer ID when Paddle reports the email already exists', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    customersCreate.mockRejectedValueOnce({
      code: 'customer_already_exists',
      detail: 'customer email conflicts with customer of id ctm_01abcdef123',
    });
    await call({ creditPack: 500 }, userId);
    expect(transactionsCreate.mock.calls[0]![0].customerId).toBe('ctm_01abcdef123');
  });

  it('rejects a pack size that is not sold, and never calls Paddle', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    await expect(call({ creditPack: 777 }, userId)).rejects.toBeDefined();
    expect(transactionsCreate).not.toHaveBeenCalled();
  });

  it('rejects requests naming both, or neither, of plan and pack', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    await expect(call({ planId: 'starter', creditPack: 500 }, userId)).rejects.toBeDefined();
    await expect(call({}, userId)).rejects.toBeDefined();
    expect(transactionsCreate).not.toHaveBeenCalled();
  });

  it('fails closed when a price ID is not configured (no mock price ever used)', async () => {
    const userId = uniq('u');
    await seedUser(userId);
    await expect(call({ planId: 'agency', billingCycle: 'monthly' }, userId)).rejects.toBeDefined();
    await expect(call({ creditPack: 3000 }, userId)).rejects.toBeDefined();
    expect(transactionsCreate).not.toHaveBeenCalled();
  });

  it('blocks a second concurrent subscription (double billing) but allows one after cancel-at-period-end', async () => {
    const userId = uniq('u');
    const subId = uniq('sub');
    await seedUser(userId, { subscriptionId: subId });
    await db.collection('subscriptions').doc(subId).set({
      subscriptionId: subId,
      userId,
      provider: 'paddle',
      planId: 'starter',
      status: 'active',
      cancelAtPeriodEnd: false,
    });
    await expect(
      call({ planId: 'business', billingCycle: 'monthly' }, userId)
    ).rejects.toBeDefined();
    expect(transactionsCreate).not.toHaveBeenCalled();

    // Credit packs are always allowed.
    await expect(call({ creditPack: 500 }, userId)).resolves.toBeDefined();

    await db.collection('subscriptions').doc(subId).update({ cancelAtPeriodEnd: true });
    await expect(
      call({ planId: 'starter', billingCycle: 'monthly' }, userId)
    ).resolves.toBeDefined();
  });
});

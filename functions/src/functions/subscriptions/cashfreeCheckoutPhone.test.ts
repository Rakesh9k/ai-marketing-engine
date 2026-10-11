/**
 * Cashfree requires a REAL customer mobile number (Create Order API 2023-08-01: customer_phone required, exactly 10
 * characters). These tests prove that a missing or invalid number can never produce a malformed or placeholder
 * order: nothing is sent to Cashfree, no transaction is written, and the client is told exactly what is needed.
 */
process.env['CASHFREE_APP_ID'] = 'test_app_id';
process.env['CASHFREE_SECRET_KEY'] = 'test_secret_key_for_phone_tests';
process.env['CASHFREE_WEBHOOK_SECRET'] = 'test_secret_key_for_phone_tests';
process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const describeIfEmulator = emulatorHost ? describe : describe.skip;

import * as admin from 'firebase-admin';
import { createCashfreeCheckout } from './createCashfreeCheckout';
import { createCashfreeOrder } from '../../services/cashfree';

let seq = 0;
const uniq = (p: string) => `${p}_ph_${Date.now()}_${++seq}`;

describeIfEmulator('Cashfree checkout needs a real customer phone number', () => {
  const db = admin.firestore();
  const realFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env['ACTIVE_PAYMENT_PROVIDER'] = 'cashfree';
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_u: string, init: { body: string }) => {
      const sent = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          order_id: sent.order_id,
          payment_session_id: `s_${sent.order_id}`,
          order_status: 'ACTIVE',
        }),
        text: async () => '',
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });
  afterAll(async () => {
    delete process.env['ACTIVE_PAYMENT_PROVIDER'];
    await admin.app().delete();
  });

  async function seedUser(extra: Record<string, unknown> = {}) {
    const userId = uniq('u');
    await db
      .collection('users')
      .doc(userId)
      .set({
        userId,
        email: `${userId}@example.com`,
        displayName: 'T',
        role: 'owner',
        businessIds: [],
        ...extra,
      });
    return userId;
  }
  const checkout = (userId: string, data: Record<string, unknown> = {}) =>
    (createCashfreeCheckout as unknown as { run: (r: unknown) => Promise<any> }).run({
      data: { creditPack: 500, ...data },
      auth: { uid: userId, token: {} },
    });
  const nothingCreated = async (userId: string) => {
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await db.collection('transactions').where('userId', '==', userId).get()).size).toBe(0);
  };

  describe('missing', () => {
    it('no number anywhere: refused with PHONE_REQUIRED, no order sent, no transaction written', async () => {
      const userId = await seedUser();
      await expect(checkout(userId)).rejects.toMatchObject({
        code: 'failed-precondition',
        details: { code: 'PHONE_REQUIRED' },
      });
      await nothingCreated(userId);
    });

    it('a stored number that is not usable (too short, fake) counts as missing', async () => {
      for (const bad of ['12345', '9999999999', '9876543210', 'not a number']) {
        const userId = await seedUser({ phone: bad });
        await expect(checkout(userId)).rejects.toMatchObject({
          details: { code: 'PHONE_REQUIRED' },
        });
        await nothingCreated(userId);
        fetchMock.mockClear();
      }
    });
  });

  describe('invalid in the request', () => {
    it.each(['12345', '5812345670', '+44 7911 123456', '9999999999', 'abc', '9876543210'])(
      'refuses %p with INVALID_PHONE, and does NOT fall back to a stored number',
      async (bad) => {
        const userId = await seedUser({ billingPhone: '9812345670' }); // a good stored number exists
        await expect(checkout(userId, { customerPhone: bad })).rejects.toMatchObject({
          code: 'invalid-argument',
          details: { code: 'INVALID_PHONE' },
        });
        await nothingCreated(userId);
      }
    );
  });

  describe('valid', () => {
    it.each([
      ['9812345670', '9812345670'],
      ['+91 98123 45670', '9812345670'],
      ['09812345670', '9812345670'],
    ])(
      'an explicit %p is sent to Cashfree as the 10 national digits and remembered',
      async (given, sent) => {
        const userId = await seedUser();
        await checkout(userId, { customerPhone: given });
        const order = JSON.parse(fetchMock.mock.calls[0]![1].body);
        expect(order.customer_details.customer_phone).toBe(sent);
        expect(order.customer_details.customer_phone).toMatch(/^[6-9][0-9]{9}$/);
        expect((await db.collection('users').doc(userId).get()).data()!['billingPhone']).toBe(sent);
      }
    );

    it('a stored billing number is used when none is given (no re-asking)', async () => {
      const userId = await seedUser({ billingPhone: '+91 98123 45671' });
      await checkout(userId);
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).customer_details.customer_phone).toBe(
        '9812345671'
      );
    });

    it('falls back to the profile phone when it is a real number', async () => {
      const userId = await seedUser({ phone: '9812345672' });
      await checkout(userId);
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).customer_details.customer_phone).toBe(
        '9812345672'
      );
    });

    it('an explicit number replaces the stored one', async () => {
      const userId = await seedUser({ billingPhone: '9812345671' });
      await checkout(userId, { customerPhone: '9812345673' });
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body).customer_details.customer_phone).toBe(
        '9812345673'
      );
      expect((await db.collection('users').doc(userId).get()).data()!['billingPhone']).toBe(
        '9812345673'
      );
    });

    it('a number that failed validation is never stored', async () => {
      const userId = await seedUser();
      await expect(checkout(userId, { customerPhone: '12345' })).rejects.toBeDefined();
      expect(
        (await db.collection('users').doc(userId).get()).data()!['billingPhone']
      ).toBeUndefined();
    });
  });

  describe('defence in depth: the order builder itself cannot invent a number', () => {
    const item = { kind: 'credit_pack' as const, credits: 500, priceINR: 499 };
    it.each([undefined, '', '12345', '9999999999', '9876543210', '+44 7911 123456'])(
      'createCashfreeOrder(%p) throws instead of sending a placeholder',
      async (phone) => {
        await expect(
          createCashfreeOrder({
            userId: 'u',
            userEmail: 'u@example.com',
            userPhone: phone as never,
            item,
          })
        ).rejects.toThrow(/valid customer mobile number is required/i);
        expect(fetchMock).not.toHaveBeenCalled();
      }
    );
    it('a valid number produces a well-formed order and the old placeholder can never appear', async () => {
      await createCashfreeOrder({
        userId: 'u',
        userEmail: 'u@example.com',
        userPhone: '+91 98123 45670',
        item,
      });
      const body = fetchMock.mock.calls[0]![1].body as string;
      expect(JSON.parse(body).customer_details.customer_phone).toBe('9812345670');
      expect(body).not.toContain('9999999999');
    });
  });
});

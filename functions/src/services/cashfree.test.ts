import crypto from 'crypto';
import { verifyCashfreeWebhookSignature, describeCashfreePurchase } from './cashfree';

describe('Cashfree Webhook Signature Verification', () => {
  const secretKey = 'test_secret_key_12345';
  const timestamp = '1700000000';
  const rawBody = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: {
      order: { order_id: 'order_123' },
      payment: { cf_payment_id: 'cf_pay_999' },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', secretKey)
    .update(timestamp + rawBody)
    .digest('base64');

  it('validates a correct signature', () => {
    const isValid = verifyCashfreeWebhookSignature(rawBody, validSignature, timestamp, secretKey);
    expect(isValid).toBe(true);
  });

  it('rejects an altered body', () => {
    const alteredBody = rawBody + ' ';
    const isValid = verifyCashfreeWebhookSignature(
      alteredBody,
      validSignature,
      timestamp,
      secretKey
    );
    expect(isValid).toBe(false);
  });

  it('rejects an invalid timestamp', () => {
    const isValid = verifyCashfreeWebhookSignature(
      rawBody,
      validSignature,
      '1700000001',
      secretKey
    );
    expect(isValid).toBe(false);
  });

  it('rejects an empty or missing signature', () => {
    expect(verifyCashfreeWebhookSignature(rawBody, '', timestamp, secretKey)).toBe(false);
  });

  it('rejects a signature shorter than expected without throwing', () => {
    const shorter = validSignature.slice(0, validSignature.length - 4);
    expect(() =>
      verifyCashfreeWebhookSignature(rawBody, shorter, timestamp, secretKey)
    ).not.toThrow();
    expect(verifyCashfreeWebhookSignature(rawBody, shorter, timestamp, secretKey)).toBe(false);
  });

  it('rejects a signature longer than expected without throwing', () => {
    const longer = validSignature + 'AAAA';
    expect(() =>
      verifyCashfreeWebhookSignature(rawBody, longer, timestamp, secretKey)
    ).not.toThrow();
    expect(verifyCashfreeWebhookSignature(rawBody, longer, timestamp, secretKey)).toBe(false);
  });

  it('rejects a wrong signature of the correct length', () => {
    const sameLength = 'A'.repeat(validSignature.length);
    expect(sameLength).not.toBe(validSignature);
    expect(verifyCashfreeWebhookSignature(rawBody, sameLength, timestamp, secretKey)).toBe(false);
  });
});

describe('Cashfree Purchase Description Helper', () => {
  it('describes subscription purchase', () => {
    const desc = describeCashfreePurchase('subscription', 'pro', 'monthly');
    expect(desc).toContain('Pro Plan');
    expect(desc).toContain('Cashfree');
  });

  it('describes credit pack purchase', () => {
    const desc = describeCashfreePurchase('credit_pack', undefined, undefined, 500);
    expect(desc).toContain('500 credit top-up pack');
    expect(desc).toContain('Cashfree');
  });
});

describe('Cashfree API version is pinned', () => {
  const realFetch = global.fetch;
  const saved = { ...process.env };
  const fetchMock = jest.fn();
  beforeEach(() => {
    process.env['CASHFREE_APP_ID'] = 'id';
    process.env['CASHFREE_SECRET_KEY'] = 'secret';
    process.env['CASHFREE_ENVIRONMENT'] = 'sandbox';
    delete process.env['CASHFREE_API_VERSION'];
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        order_id: 'o',
        payment_session_id: 's',
        order_status: 'ACTIVE',
        refund_id: 'r',
        refund_status: 'PENDING',
      }),
      text: async () => '',
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...saved };
  });

  it('the intended version is 2023-08-01', async () => {
    const { CASHFREE_API_VERSION } = await import('./cashfree');
    expect(CASHFREE_API_VERSION).toBe('2023-08-01');
  });

  it('every order and refund request sends exactly that x-api-version', async () => {
    const { createCashfreeOrder, getCashfreeOrderStatus, refundCashfreePayment } =
      await import('./cashfree');
    await createCashfreeOrder({
      userId: 'u',
      userEmail: 'u@example.com',
      userPhone: '9812345670',
      item: { kind: 'credit_pack', credits: 500, priceINR: 499 },
    } as never);
    await getCashfreeOrderStatus('o');
    await refundCashfreePayment('o', 10, 'x');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      expect(call[1].headers['x-api-version']).toBe('2023-08-01');
    }
  });

  it('restating the pinned version is fine; any other value is refused, never silently used', async () => {
    const { getCashfreeConfig } = await import('./cashfree');
    process.env['CASHFREE_API_VERSION'] = '2023-08-01';
    expect(getCashfreeConfig().apiVersion).toBe('2023-08-01');
    for (const other of ['2026-01-01', '2025-01-01', '2022-09-01']) {
      process.env['CASHFREE_API_VERSION'] = other;
      expect(() => getCashfreeConfig()).toThrow(/pinned version 2023-08-01/);
    }
  });
});

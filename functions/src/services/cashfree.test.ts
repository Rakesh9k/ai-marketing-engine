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
    const isValid = verifyCashfreeWebhookSignature(alteredBody, validSignature, timestamp, secretKey);
    expect(isValid).toBe(false);
  });

  it('rejects an invalid timestamp', () => {
    const isValid = verifyCashfreeWebhookSignature(rawBody, validSignature, '1700000001', secretKey);
    expect(isValid).toBe(false);
  });

  it('rejects an empty or missing signature', () => {
    expect(verifyCashfreeWebhookSignature(rawBody, '', timestamp, secretKey)).toBe(false);
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

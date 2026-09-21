/**
 * Phase 14 — proves createLogger().error() redacts common secret shapes
 * (API keys embedded in a URL query string via Gemini's `?key=...` auth
 * scheme, Bearer tokens, provider secret-key prefixes) out of the error
 * message/stack before they ever reach functions.logger, and that it
 * does NOT mangle an ordinary error with no secret in it.
 */
import * as functions from 'firebase-functions';
import { createLogger } from './logging';

describe('createLogger().error — secret redaction (Phase 14)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(functions.logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorSpy.mockRestore());

  it('redacts a Gemini-style API key embedded in a URL via ?key=', () => {
    const logger = createLogger({ businessId: 'biz_1' });
    const error = new Error(
      'request to https://generativelanguage.googleapis.com/v1/models?key=AIzaSyD_fakeFakeFakeFakeFakeFake123 failed'
    );
    logger.error('Text generation failed', error);

    const [, payload] = errorSpy.mock.calls[0]!;
    expect(payload.error.message).not.toMatch(/AIzaSyD_fakeFakeFakeFakeFakeFake123/);
    expect(payload.error.message).toMatch(/\[REDACTED\]/);
  });

  it('redacts an Authorization: Bearer token', () => {
    const logger = createLogger();
    const error = new Error('request failed, Authorization: Bearer sk-live-abcdef1234567890');
    logger.error('Provider call failed', error);

    const [, payload] = errorSpy.mock.calls[0]!;
    expect(payload.error.message).not.toMatch(/abcdef1234567890/);
  });

  it('redacts a Razorpay-style secret key', () => {
    const logger = createLogger();
    const error = new Error('auth failed for rzp_live_AbCdEfGhIjKlMn');
    logger.error('Payment call failed', error);

    const [, payload] = errorSpy.mock.calls[0]!;
    expect(payload.error.message).not.toMatch(/rzp_live_AbCdEfGhIjKlMn/);
  });

  it('leaves an ordinary, secret-free error message unchanged', () => {
    const logger = createLogger({ campaignId: 'camp_1' });
    const error = new Error('Business not found: biz_123');
    logger.error('Lookup failed', error);

    const [, payload] = errorSpy.mock.calls[0]!;
    expect(payload.error.message).toBe('Business not found: biz_123');
    expect(payload.businessId).toBeUndefined();
    expect(payload.campaignId).toBe('camp_1');
  });
});

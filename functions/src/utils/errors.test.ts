/**
 * Phase 14 Error Handling Audit — mapErrorToHttpsError previously returned
 * the raw `error.message` verbatim for any generic `Error` (the fallback
 * branch every AI-provider/pipeline exception eventually reaches). Some AI
 * provider SDKs (Gemini in particular) embed their own API key as a
 * `?key=...` query parameter inside a thrown network-error message — that
 * secret was already redacted before reaching Cloud Logging (logging.ts),
 * but was never redacted before being sent back to the CLIENT, which is a
 * real user-facing leak, not just a log-hygiene gap. These tests use only
 * deterministic, hand-constructed Error objects — no real AI provider call
 * is made and no Gemini credits are consumed.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import {
  mapErrorToHttpsError,
  AppError,
  ValidationError,
  InsufficientCreditsError,
  RateLimitError,
} from './errors';

describe('mapErrorToHttpsError — secret redaction (Phase 14)', () => {
  it('CRITICAL: redacts an API key embedded in a raw provider error message', () => {
    const raw = new Error(
      'request to https://generativelanguage.googleapis.com/v1/models/gemini-flash-latest:generateContent?key=AIzaSyB4faySp9fYnSjkGW0TFt4y_9eFzn28SNE failed, reason: connect ETIMEDOUT'
    );
    const result = mapErrorToHttpsError(raw);
    expect(result).toBeInstanceOf(HttpsError);
    expect(result.message).not.toContain('AIzaSyB4faySp9fYnSjkGW0TFt4y_9eFzn28SNE');
    expect(result.message).toContain('[REDACTED]');
    expect(result.message).toContain('ETIMEDOUT'); // non-secret diagnostic detail preserved
  });

  it('redacts a bearer token embedded in an error message', () => {
    const raw = new Error('Upstream call failed — Authorization: Bearer abcdef123456.secret.token');
    const result = mapErrorToHttpsError(raw);
    expect(result.message).not.toContain('abcdef123456.secret.token');
    expect(result.message).toContain('[REDACTED]');
  });

  it('leaves an ordinary, secret-free error message unchanged', () => {
    const raw = new Error('Campaign not found');
    const result = mapErrorToHttpsError(raw);
    expect(result.message).toBe('Campaign not found');
    expect(result.code).toBe('internal');
  });

  it('passes through an unknown non-Error value as a safe generic message', () => {
    const result = mapErrorToHttpsError('a plain string, not an Error instance');
    expect(result.code).toBe('internal');
    expect(result.message).toBe('An unexpected error occurred');
  });

  it("preserves an HttpsError's own code/details while still redacting its message", () => {
    const original = new HttpsError(
      'resource-exhausted',
      'Rate limit exceeded for key=AIzaFakeKeyForTest12345678',
      {
        retryAfterSeconds: 30,
      }
    );
    const result = mapErrorToHttpsError(original);
    expect(result.code).toBe('resource-exhausted');
    expect(result.details).toEqual({ retryAfterSeconds: 30 });
    expect(result.message).not.toContain('AIzaFakeKeyForTest12345678');
  });

  it('preserves AppError subclass code mapping and details', () => {
    const err = new ValidationError({ email: ['Invalid email'] });
    const result = mapErrorToHttpsError(err);
    expect(result.code).toBe('invalid-argument');
    expect(result.details).toEqual({ fieldErrors: { email: ['Invalid email'] } });
  });

  it('preserves InsufficientCreditsError -> resource-exhausted', () => {
    const err = new InsufficientCreditsError(140, 50);
    const result = mapErrorToHttpsError(err);
    expect(result.code).toBe('resource-exhausted');
    expect(result.message).toBe('Insufficient credits. Required: 140, Available: 50');
  });

  it('preserves RateLimitError -> resource-exhausted', () => {
    const err = new RateLimitError('generateCampaignStrategy');
    const result = mapErrorToHttpsError(err);
    expect(result.code).toBe('resource-exhausted');
  });

  it('maps a usageControl-shaped plain Error + .code to the right callable error code', () => {
    const err = Object.assign(
      new Error('A generation with this idempotency key is already in progress'),
      {
        code: 'DUPLICATE_REQUEST_IN_PROGRESS',
      }
    );
    const result = mapErrorToHttpsError(err);
    expect(result.code).toBe('already-exists');
  });

  it('never leaks a stack trace to the client', () => {
    const raw = new Error('Something failed');
    const result = mapErrorToHttpsError(raw);
    // HttpsError does not expose .stack as part of its serialized payload,
    // but guard explicitly against a future regression that might attach it.
    expect((result as unknown as { stack?: string }).stack).not.toBe(raw.stack);
    expect(
      JSON.stringify({ code: result.code, message: result.message, details: result.details })
    ).not.toMatch(/at Object\.<anonymous>|at Module\._compile/);
  });

  it('does not leak a generic AppError instance as anything other than its own class', () => {
    class WeirdCustomError extends AppError {
      constructor() {
        super('internal', 'Custom internal failure', 500);
      }
    }
    const result = mapErrorToHttpsError(new WeirdCustomError());
    expect(result.code).toBe('internal');
    expect(result.message).toBe('Custom internal failure');
  });
});

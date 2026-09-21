import { withTimeout, withRetry, isRetryableAIError, AITimeoutError } from './retry';

describe('withTimeout', () => {
  it('resolves normally when the promise settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100, 'test')).resolves.toBe('ok');
  });

  it('rejects with AITimeoutError when the promise never settles within the budget', async () => {
    const neverResolves = new Promise(() => {});
    await expect(withTimeout(neverResolves, 20, 'slow-call')).rejects.toBeInstanceOf(AITimeoutError);
  });

  it('propagates the original rejection when the promise rejects before the timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100, 'test')).rejects.toThrow('boom');
  });
});

describe('isRetryableAIError', () => {
  it('treats timeouts as retryable', () => {
    expect(isRetryableAIError(new AITimeoutError('x', 10))).toBe(true);
  });

  it('treats rate limit / 5xx / network errors as retryable', () => {
    expect(isRetryableAIError(new Error('429 Too Many Requests'))).toBe(true);
    expect(isRetryableAIError(new Error('503 Service Unavailable'))).toBe(true);
    expect(isRetryableAIError(new Error('ECONNRESET'))).toBe(true);
    expect(isRetryableAIError(new Error('network error'))).toBe(true);
  });

  it('does NOT retry authentication / API key / permission errors', () => {
    expect(isRetryableAIError(new Error('Invalid API key provided'))).toBe(false);
    expect(isRetryableAIError(new Error('401 Unauthorized'))).toBe(false);
    expect(isRetryableAIError(new Error('Permission denied'))).toBe(false);
  });

  it('does NOT retry schema validation failures (deterministic prompt/schema bugs)', () => {
    expect(isRetryableAIError(new Error('Schema validation failed: expected boolean'))).toBe(false);
  });

  it('does NOT retry unrecognized errors by default (avoids uncontrolled cost multiplication)', () => {
    expect(isRetryableAIError(new Error('something weird happened'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the result on the first success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable failure and succeeds within the attempt budget', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce('recovered');

    const onRetry = jest.fn();
    const result = await withRetry(fn, { baseDelayMs: 1, onRetry });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('never exceeds maxAttempts (bounded — no infinite retry loop)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('503 Service Unavailable'));

    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow(
      '503 Service Unavailable'
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-retryable error even once', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Invalid API key provided'));

    await expect(withRetry(fn, { maxAttempts: 5, baseDelayMs: 1 })).rejects.toThrow(
      'Invalid API key provided'
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('always throws after exhausting retries rather than swallowing the failure', async () => {
    const fn = jest.fn().mockRejectedValue(new AITimeoutError('slow', 10));
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toBeInstanceOf(
      AITimeoutError
    );
  });
});

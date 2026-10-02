import { normalizePublishError } from './errorNormalizer';

describe('errorNormalizer', () => {
  it('normalizes connection revoked error correctly', () => {
    const result = normalizePublishError('CONNECTION_REVOKED');
    expect(result.isRetryable).toBe(false);
    expect(result.actionType).toBe('reconnect');
    expect(result.userMessage).toContain('Social connection is inactive');
  });

  it('normalizes permission denied error correctly', () => {
    const result = normalizePublishError('PERMISSION_DENIED');
    expect(result.isRetryable).toBe(false);
    expect(result.actionType).toBe('reconnect');
  });

  it('normalizes invalid media error correctly', () => {
    const result = normalizePublishError('INVALID_MEDIA', 'Video aspect ratio not supported');
    expect(result.isRetryable).toBe(false);
    expect(result.actionType).toBe('open_campaign');
    expect(result.userMessage).toBe('Video aspect ratio not supported');
  });

  it('normalizes rate limited error as retryable', () => {
    const result = normalizePublishError('RATE_LIMITED');
    expect(result.isRetryable).toBe(true);
    expect(result.actionType).toBe('retry');
    expect(result.userMessage).toContain('rate-limited');
  });

  it('normalizes media processing timeout as retryable', () => {
    const result = normalizePublishError('PROCESSING_TIMEOUT');
    expect(result.isRetryable).toBe(true);
    expect(result.actionType).toBe('retry');
  });

  it('handles unknown error code gracefully', () => {
    const result = normalizePublishError('SOME_RANDOM_CODE' as any, 'Something failed');
    expect(result.isRetryable).toBe(true);
    expect(result.actionType).toBe('retry');
    expect(result.userMessage).toBe('Something failed');
  });
});

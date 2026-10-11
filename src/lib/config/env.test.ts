import { parsePublicEnv, parseServerEnv } from './env';

describe('Environment Configuration Validation (src/lib/config/env.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('successfully parses valid public environment configuration', () => {
    process.env['NEXT_PUBLIC_USE_EMULATORS'] = 'true';
    process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'] = 'sandbox';

    const env = parsePublicEnv();
    expect(env.NEXT_PUBLIC_USE_EMULATORS).toBe('true');
    expect(env.NEXT_PUBLIC_PADDLE_ENVIRONMENT).toBe('sandbox');
  });

  it('fails when invalid paddle environment is provided', () => {
    process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'] = 'invalid_env' as any;
    expect(() => parsePublicEnv()).toThrow(
      'Invalid client public environment variables configuration'
    );
  });

  it('successfully parses server environment variables', () => {
    process.env['UPSTASH_REDIS_REST_URL'] = 'https://my-redis.upstash.io';
    process.env['UPSTASH_REDIS_REST_TOKEN'] = 'secret_token';

    const serverEnv = parseServerEnv();
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://my-redis.upstash.io');
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBe('secret_token');
  });

  it('fails when malformed URL is supplied for Upstash Redis', () => {
    process.env['UPSTASH_REDIS_REST_URL'] = 'not-a-valid-url';
    expect(() => parseServerEnv()).toThrow('Invalid server environment variables configuration');
  });
});

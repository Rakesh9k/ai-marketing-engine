import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';
import {
  scrubString,
  scrubValue,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentryTransaction,
} from './sentryScrub';

// Fabricated, obviously-fake token-shaped values (none are real credentials).
const JWT =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6ImFiYzEyMyJ9.eyJ1aWQiOiJ1c2VyXzEyMyIsImVtYWlsIjoieEB5LmNvbSJ9.c2lnbmF0dXJlYnl0ZXNoZXJl';
const GOOGLE_KEY = 'AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKE12345';
const PADDLE_KEY = 'pdl_sdbx_apikey_01fakefakefakefake_AbCdEf1234_XyZ789';
const PADDLE_CLIENT = 'test_0123456789abcdef0123456789';
const CTM = 'ctm_01fakefakefakefakefakefake';

const event = (overrides: Partial<ErrorEvent> = {}): ErrorEvent =>
  ({ type: undefined, ...overrides }) as ErrorEvent;

const serialized = (value: unknown) => JSON.stringify(value);

describe('scrubString: URLs and query strings', () => {
  it.each([
    [
      'token',
      'https://app.mitra.in/x?token=abc123&page=2',
      'https://app.mitra.in/x?token=[REDACTED]&page=2',
    ],
    [
      'Firebase oobCode',
      '/reset-password?mode=resetPassword&oobCode=Zk39dj20X&lang=en',
      '/reset-password?mode=resetPassword&oobCode=[REDACTED]&lang=en',
    ],
    ['apiKey', '/v1/accounts?apiKey=AIzaFAKE', '/v1/accounts?apiKey=[REDACTED]'],
    [
      'OAuth code + state',
      '/meta/callback?code=AQD123&state=nonce9',
      '/meta/callback?code=[REDACTED]&state=[REDACTED]',
    ],
    [
      'signed storage URL',
      'https://storage.googleapis.com/b/o.png?X-Goog-Signature=deadbeef&X-Goog-Credential=svc%2F2026',
      'https://storage.googleapis.com/b/o.png?X-Goog-Signature=[REDACTED]&X-Goog-Credential=[REDACTED]',
    ],
    [
      'hash fragment',
      'https://x.in/cb#access_token=abc&token_type=bearer',
      'https://x.in/cb#access_token=[REDACTED]&token_type=[REDACTED]',
    ],
    [
      'case-insensitive name',
      '/x?TOKEN=abc&Email=a%40b.in',
      '/x?TOKEN=[REDACTED]&Email=[REDACTED]',
    ],
  ])('redacts %s', (_label, input, expected) => {
    expect(scrubString(input)).toBe(expected);
  });

  it('keeps the path, host and non-sensitive parameters untouched', () => {
    const url = 'https://www.brain-wise.com/campaigns/camp_42?tab=assets&sort=recent&page=3';
    expect(scrubString(url)).toBe(url);
  });

  it('redacts every sensitive parameter when several occur', () => {
    const out = scrubString('/x?token=a&key=b&signature=c&page=1');
    expect(out).toBe('/x?token=[REDACTED]&key=[REDACTED]&signature=[REDACTED]&page=1');
  });
});

describe('scrubString: token-like and personal values in free text', () => {
  it.each([
    ['JWT / Firebase ID token', `fetch failed for ${JWT} on retry`],
    ['Bearer header', 'Authorization: Bearer abcdefghijklmnop1234'],
    ['Google / Firebase API key', `key was ${GOOGLE_KEY}`],
    ['Paddle API key', `Paddle rejected ${PADDLE_KEY}`],
    ['Paddle client token', `client token ${PADDLE_CLIENT} invalid`],
    ['OpenAI-style key', 'using sk-abcdefghijklmnopqrstuvwx'],
    ['Razorpay key', 'rzp_live_ABCDEFGHIJ1234'],
  ])('removes %s', (_label, input) => {
    const out = scrubString(input);
    expect(out).toContain('[REDACTED]');
    for (const secret of [
      JWT,
      GOOGLE_KEY,
      PADDLE_KEY,
      PADDLE_CLIENT,
      'abcdefghijklmnop1234',
      'sk-abcdefghijklmnopqrstuvwx',
      'rzp_live_ABCDEFGHIJ1234',
    ]) {
      expect(out).not.toContain(secret);
    }
  });

  it('keeps the surrounding text so the error stays diagnosable', () => {
    expect(scrubString(`fetch failed for ${JWT} on retry`)).toBe(
      'fetch failed for [REDACTED] on retry'
    );
  });

  it('masks e-mail addresses, including plus-addressing and sub-domains', () => {
    expect(scrubString('user owner+mitra@mail.paradise.co.in not found')).toBe(
      'user [EMAIL] not found'
    );
  });

  it.each([
    ['international', 'WhatsApp +91 98765 43210 failed', 'WhatsApp [PHONE] failed'],
    ['international compact', 'to +919876543210', 'to [PHONE]'],
    ['bare Indian mobile', 'phone 9876543210 invalid', 'phone [PHONE] invalid'],
  ])('masks %s phone numbers', (_label, input, expected) => {
    expect(scrubString(input)).toBe(expected);
  });

  it('does not mistake timestamps, ids or prices for phone numbers', () => {
    const text = 'ts 1790000000000 at 2026-10-03T06:30:00Z camp_4291037568 price 1699 credits 6000';
    expect(scrubString(text)).toBe(text);
  });

  it('masks Paddle customer ids but keeps subscription and transaction ids', () => {
    const out = scrubString(
      `customer ${CTM} sub_01abcdefghijklmnopqrstuv txn_01abcdefghijklmnopqrstuv`
    );
    expect(out).not.toContain(CTM);
    expect(out).toContain('ctm_[REDACTED]');
    expect(out).toContain('sub_01abcdefghijklmnopqrstuv');
    expect(out).toContain('txn_01abcdefghijklmnopqrstuv');
  });
});

describe('scrubValue: nested structures', () => {
  it('redacts by key at any depth, including inside arrays', () => {
    const out = scrubValue({
      level1: {
        level2: [{ level3: { authorization: 'Bearer x', idToken: 'abc', keep: 'visible' } }],
      },
      password: 'hunter2',
    });
    expect(out).toEqual({
      level1: {
        level2: [
          { level3: { authorization: '[REDACTED]', idToken: '[REDACTED]', keep: 'visible' } },
        ],
      },
      password: '[REDACTED]',
    });
  });

  it.each([
    'authorization',
    'Authorization',
    'cookie',
    'Set-Cookie',
    'idToken',
    'accessToken',
    'refresh_token',
    'appCheckToken',
    'clientSecret',
    'webhookSecret',
    'password',
    'newPassword',
    'signature',
    'apiKey',
    'api_key',
    'privateKey',
    'sessionId',
    'oobCode',
    'email',
    'userEmail',
    'phone',
    'phoneNumber',
    'whatsapp',
    'whatsappNumber',
    'address',
    'ip_address',
    'X-Goog-Signature',
  ])('treats "%s" as a sensitive key', (key) => {
    expect(scrubValue({ [key]: 'value-that-must-not-leak' })).toEqual({ [key]: '[REDACTED]' });
  });

  it('keeps useful diagnostics that merely look similar', () => {
    const input = {
      inputTokens: 812,
      outputTokens: 240,
      totalTokens: 1052,
      tokensUsed: 5,
      creditsUsed: 140,
      planId: 'pro',
      campaignId: 'camp_42',
      businessId: 'biz_7',
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
      status: 'failed',
      code: 'AI_TIMEOUT',
      stage: 'generating_copy',
      subscriptionId: 'sub_01abcdefghijklmnopqrstuv',
    };
    expect(scrubValue(input)).toEqual(input);
  });

  it('does not touch null/undefined values under sensitive keys', () => {
    expect(scrubValue({ token: null, email: undefined })).toEqual({
      token: null,
      email: undefined,
    });
  });

  it('scrubs secrets inside string values of harmless keys', () => {
    expect(scrubValue({ note: `retrying with ${JWT}`, url: '/x?token=abc' })).toEqual({
      note: 'retrying with [REDACTED]',
      url: '/x?token=[REDACTED]',
    });
  });

  it('survives circular references', () => {
    const a: Record<string, unknown> = { name: 'a', token: 'secret' };
    a['self'] = a;
    const out = scrubValue(a) as Record<string, unknown>;
    expect(out['token']).toBe('[REDACTED]');
    expect(out['self']).toBe('[Circular]');
  });

  it('truncates absurdly deep structures instead of overflowing the stack', () => {
    let deep: Record<string, unknown> = { leaf: 'x' };
    for (let i = 0; i < 5000; i++) deep = { next: deep };
    expect(() => scrubValue(deep)).not.toThrow();
    expect(serialized(scrubValue(deep))).toContain('[Truncated]');
  });

  it('does not mutate its input', () => {
    const input = { token: 'abc', nested: { email: 'a@b.in' } };
    const copy = JSON.parse(JSON.stringify(input));
    scrubValue(input);
    expect(input).toEqual(copy);
  });

  it('scrubs Error messages and keeps the name', () => {
    const err = new TypeError(`bad token ${JWT}`);
    const out = scrubValue({ err }).err;
    expect(out).toBeInstanceOf(Error);
    expect(out.name).toBe('TypeError');
    expect(out.message).not.toContain(JWT);
  });

  it('leaves Dates and primitives alone', () => {
    const d = new Date('2026-10-03T00:00:00Z');
    expect(scrubValue({ d, n: 3, b: true }).d).toBe(d);
    expect(scrubValue(42)).toBe(42);
  });
});

describe('scrubSentryEvent', () => {
  it('drops cookies and all request headers but keeps method and a scrubbed URL', () => {
    const out = scrubSentryEvent(
      event({
        request: {
          method: 'POST',
          url: `https://www.brain-wise.com/reset-password?oobCode=SECRETCODE&mode=resetPassword`,
          cookies: { session: 'abc' },
          headers: { Authorization: `Bearer ${JWT}`, 'User-Agent': 'x' },
        },
      })
    )!;
    expect(out.request?.method).toBe('POST');
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toBeUndefined();
    expect(out.request?.url).toBe(
      'https://www.brain-wise.com/reset-password?oobCode=[REDACTED]&mode=resetPassword'
    );
  });

  it('scrubs string and object query_string forms', () => {
    const a = scrubSentryEvent(event({ request: { query_string: 'oobCode=abc&tab=x' } }))!;
    expect(a.request?.query_string).toBe('oobCode=[REDACTED]&tab=x');
    const b = scrubSentryEvent(event({ request: { query_string: { token: 'abc', tab: 'x' } } }))!;
    expect(b.request?.query_string).toEqual({ token: '[REDACTED]', tab: 'x' });
  });

  it('scrubs a submitted form body (customer contact details, passwords)', () => {
    const out = scrubSentryEvent(
      event({
        request: {
          data: {
            email: 'owner@paradise.in',
            password: 'Pa55word!',
            phone: '+919876543210',
            businessName: 'Paradise',
            city: 'Hyderabad',
          },
        },
      })
    )!;
    expect(out.request?.data).toEqual({
      email: '[REDACTED]',
      password: '[REDACTED]',
      phone: '[REDACTED]',
      businessName: 'Paradise',
      city: 'Hyderabad',
    });
  });

  it('reduces user context to the pseudonymous id', () => {
    const out = scrubSentryEvent(
      event({ user: { id: 'uid_123', email: 'a@b.in', username: 'ravi', ip_address: '1.2.3.4' } })
    )!;
    expect(out.user).toEqual({ id: 'uid_123' });
  });

  it('masks secrets in exception messages but keeps type and stack frames', () => {
    const out = scrubSentryEvent(
      event({
        exception: {
          values: [
            {
              type: 'FirebaseError',
              value: `auth failed for owner@paradise.in using ${GOOGLE_KEY}`,
              stacktrace: {
                frames: [
                  {
                    filename: 'app:///_next/static/chunks/app.js?token=abc',
                    function: 'signIn',
                    lineno: 42,
                    vars: { idToken: JWT, attempt: 2 },
                  },
                ],
              },
            },
          ],
        },
      })
    )!;
    const ex = out.exception!.values![0]!;
    expect(ex.type).toBe('FirebaseError');
    expect(ex.value).toBe('auth failed for [EMAIL] using [REDACTED]');
    const frame = ex.stacktrace!.frames![0]!;
    expect(frame.function).toBe('signIn');
    expect(frame.lineno).toBe(42);
    expect(frame.filename).toBe('app:///_next/static/chunks/app.js?token=[REDACTED]');
    expect(frame.vars).toEqual({ idToken: '[REDACTED]', attempt: 2 });
  });

  it('scrubs message, logentry, tags, contexts and extra', () => {
    const out = scrubSentryEvent(
      event({
        message: `retry ${PADDLE_KEY}`,
        logentry: { message: 'user %s failed', params: ['a@b.in'] },
        tags: { route: '/billing', customer: CTM },
        contexts: { paddle: { customerId: CTM, environment: 'sandbox', apiKey: PADDLE_KEY } },
        extra: { body: { refreshToken: 'r', planId: 'pro' } },
      })
    )!;
    const all = serialized(out);
    for (const secret of [PADDLE_KEY, CTM, 'a@b.in', '"r"']) expect(all).not.toContain(secret);
    expect(out.tags?.['route']).toBe('/billing');
    expect(out.contexts?.['paddle']).toEqual({
      customerId: 'ctm_[REDACTED]',
      environment: 'sandbox',
      apiKey: '[REDACTED]',
    });
    expect((out.extra as Record<string, Record<string, unknown>>)['body']).toEqual({
      refreshToken: '[REDACTED]',
      planId: 'pro',
    });
  });

  it('scrubs breadcrumb messages and nested data (navigation and fetch URLs)', () => {
    const out = scrubSentryEvent(
      event({
        breadcrumbs: [
          { category: 'fetch', data: { url: '/api/x?token=abc', method: 'GET', status_code: 500 } },
          { category: 'navigation', data: { from: '/login', to: '/reset-password?oobCode=abc' } },
          { category: 'console', message: `Bearer ${'a'.repeat(24)} rejected` },
        ],
      })
    )!;
    expect(out.breadcrumbs?.[0]?.data).toEqual({
      url: '/api/x?token=[REDACTED]',
      method: 'GET',
      status_code: 500,
    });
    expect(out.breadcrumbs?.[1]?.data).toEqual({
      from: '/login',
      to: '/reset-password?oobCode=[REDACTED]',
    });
    expect(out.breadcrumbs?.[2]?.message).toBe('Bearer [REDACTED] rejected');
  });

  it('preserves non-sensitive event fields', () => {
    const input = event({
      level: 'error',
      environment: 'production',
      release: 'r1',
      transaction: '/campaigns/[id]',
      tags: { feature: 'campaign' },
    });
    const out = scrubSentryEvent(input)!;
    expect(out.level).toBe('error');
    expect(out.environment).toBe('production');
    expect(out.release).toBe('r1');
    expect(out.transaction).toBe('/campaigns/[id]');
  });

  it('handles an event with none of the optional sections', () => {
    expect(scrubSentryEvent(event())).toEqual(event());
  });

  it('fails closed: returns null instead of sending an unscrubbed event if scrubbing throws', () => {
    const hostile = event();
    Object.defineProperty(hostile, 'request', {
      get() {
        throw new Error('boom');
      },
    });
    expect(scrubSentryEvent(hostile)).toBeNull();
  });
});

describe('scrubSentryTransaction (performance events)', () => {
  it('scrubs the request URL, span descriptions and span data', () => {
    const out = scrubSentryTransaction({
      type: 'transaction',
      transaction: '/reset-password',
      request: { url: 'https://x.in/reset-password?oobCode=abc', headers: { cookie: 'a=b' } },
      spans: [
        {
          span_id: 's1',
          trace_id: 't1',
          start_timestamp: 1,
          description: 'GET /api/me?token=abc',
          data: { 'http.url': 'https://x.in/a?apiKey=abc', 'http.status_code': 200 },
        },
      ],
    } as never) as unknown as {
      request: { url: string; headers?: unknown };
      spans: Array<{ description: string; data: Record<string, unknown> }>;
    };
    expect(out.request.url).toBe('https://x.in/reset-password?oobCode=[REDACTED]');
    expect(out.request.headers).toBeUndefined();
    expect(out.spans[0]?.description).toBe('GET /api/me?token=[REDACTED]');
    expect(out.spans[0]?.data).toEqual({
      'http.url': 'https://x.in/a?apiKey=[REDACTED]',
      'http.status_code': 200,
    });
  });
});

describe('scrubSentryBreadcrumb (capture-time hook)', () => {
  it('scrubs a crumb as it is captured and keeps its shape', () => {
    const crumb: Breadcrumb = {
      category: 'xhr',
      type: 'http',
      message: 'POST /x?key=abc',
      data: { url: '/x?key=abc', body: { password: 'p' } },
    };
    expect(scrubSentryBreadcrumb(crumb)).toEqual({
      category: 'xhr',
      type: 'http',
      message: 'POST /x?key=[REDACTED]',
      data: { url: '/x?key=[REDACTED]', body: { password: '[REDACTED]' } },
    });
  });
});

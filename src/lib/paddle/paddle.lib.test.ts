import * as fs from 'fs';
import * as path from 'path';
import {
  PaddleConfigError,
  countryFromHeaders,
  resolvePaddleClientConfig,
  sanitizeCountryCode,
  tryGetPaddleClientConfig,
} from './config';
import {
  CREDIT_PACK_SIZES,
  allPriceIds,
  buildPaddleCatalog,
  getPackPriceId,
  getTierPriceId,
  intervalOf,
} from './catalog';
import { PLANS } from '@/lib/config/pricing';

describe('resolvePaddleClientConfig — explicit environment, no silent defaults', () => {
  it('throws when the environment is missing (never defaults to sandbox or production)', () => {
    expect(() => resolvePaddleClientConfig({ token: 'test_abc' })).toThrow(PaddleConfigError);
    expect(() => resolvePaddleClientConfig({ environment: '', token: 'test_abc' })).toThrow(
      /no default/
    );
    expect(() => resolvePaddleClientConfig({ environment: '  ', token: 'test_abc' })).toThrow(
      PaddleConfigError
    );
  });

  it('rejects any environment other than sandbox/production', () => {
    for (const bad of ['live', 'prod', 'test', 'Sandbox', 'staging']) {
      expect(() => resolvePaddleClientConfig({ environment: bad, token: 'test_abc' })).toThrow(
        PaddleConfigError
      );
    }
  });

  it('throws when the client token is missing', () => {
    expect(() => resolvePaddleClientConfig({ environment: 'sandbox' })).toThrow(/CLIENT_TOKEN/);
    expect(() => resolvePaddleClientConfig({ environment: 'sandbox', token: ' ' })).toThrow(
      PaddleConfigError
    );
  });

  it('requires a test_ token for sandbox and a live_ token for production', () => {
    expect(resolvePaddleClientConfig({ environment: 'sandbox', token: 'test_abc' })).toEqual({
      environment: 'sandbox',
      token: 'test_abc',
    });
    expect(resolvePaddleClientConfig({ environment: 'production', token: 'live_abc' })).toEqual({
      environment: 'production',
      token: 'live_abc',
    });
    expect(() => resolvePaddleClientConfig({ environment: 'sandbox', token: 'live_abc' })).toThrow(
      /does not match/
    );
    expect(() =>
      resolvePaddleClientConfig({ environment: 'production', token: 'test_abc' })
    ).toThrow(/does not match/);
  });

  it('refuses a server API key in the client token slot', () => {
    expect(() =>
      resolvePaddleClientConfig({ environment: 'sandbox', token: 'pdl_sdbx_apikey_xyz' })
    ).toThrow(/API key/);
    expect(() =>
      resolvePaddleClientConfig({ environment: 'production', token: 'pdl_live_apikey_xyz' })
    ).toThrow(/API key/);
  });

  it('tryGetPaddleClientConfig reports misconfiguration instead of throwing', () => {
    const saved = { ...process.env };
    delete process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'];
    delete process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'];
    try {
      const result = tryGetPaddleClientConfig();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/PADDLE_ENVIRONMENT/);
    } finally {
      process.env = saved;
    }
  });
});

const hdrs = (init: Record<string, string> = {}) => ({
  get: (name: string) => init[name.toLowerCase()] ?? null,
});

describe('country detection — never guess', () => {
  it('passes through a real two-letter country code', () => {
    expect(sanitizeCountryCode('IN')).toBe('IN');
    expect(sanitizeCountryCode('US')).toBe('US');
    expect(sanitizeCountryCode('gb')).toBe('GB');
  });

  it.each([
    undefined,
    null,
    '',
    ' ',
    'UNKNOWN',
    'OTHERS',
    'XX',
    'T1',
    'ZZ',
    'I',
    'IND',
    '12',
    'I1',
  ])('returns undefined (so the country is omitted) for %p', (value) => {
    expect(sanitizeCountryCode(value as string | null | undefined)).toBeUndefined();
  });

  it('reads x-vercel-ip-country from request headers', () => {
    expect(countryFromHeaders(hdrs({ 'x-vercel-ip-country': 'IN' }))).toBe('IN');
  });

  it('with no header there is no country at all — not IN, not US, not a sentinel', () => {
    expect(countryFromHeaders(hdrs())).toBeUndefined();
    expect(countryFromHeaders(hdrs({ 'x-vercel-ip-country': 'UNKNOWN' }))).toBeUndefined();
  });
});

describe('Paddle catalog (price IDs only — no amounts)', () => {
  const env = {
    STARTER_MONTHLY: 'pri_sm',
    STARTER_YEARLY: 'pri_sy',
    BUSINESS_MONTHLY: 'pri_bm',
    BUSINESS_YEARLY: 'pri_by',
    PRO_MONTHLY: 'pri_pm',
    PRO_YEARLY: 'pri_py',
    AGENCY_MONTHLY: 'pri_am',
    AGENCY_YEARLY: 'pri_ay',
    PACK_500: 'pri_k500',
    PACK_1200: 'pri_k1200',
    PACK_3000: 'pri_k3000',
  };
  const catalog = buildPaddleCatalog(env);

  it('selects the exact price ID for each plan and billing interval', () => {
    const expected: Record<string, [string, string]> = {
      starter: ['pri_sm', 'pri_sy'],
      business: ['pri_bm', 'pri_by'],
      pro: ['pri_pm', 'pri_py'],
      agency: ['pri_am', 'pri_ay'],
    };
    for (const [plan, [month, year]] of Object.entries(expected)) {
      expect(getTierPriceId(catalog, plan as 'starter', 'month')).toBe(month);
      expect(getTierPriceId(catalog, plan as 'starter', 'year')).toBe(year);
    }
    expect(intervalOf('monthly')).toBe('month');
    expect(intervalOf('yearly')).toBe('year');
  });

  it('Free never has a Paddle price (no checkout for Free)', () => {
    expect(getTierPriceId(catalog, 'free', 'month')).toBeUndefined();
    expect(getTierPriceId(catalog, 'free', 'year')).toBeUndefined();
  });

  it('covers every paid plan in the pricing config, including Pro', () => {
    const paid = PLANS.filter((p) => p.id !== 'free').map((p) => p.id);
    expect(paid).toEqual(expect.arrayContaining(['starter', 'business', 'pro', 'agency']));
    for (const plan of paid) {
      expect(getTierPriceId(catalog, plan, 'month')).toBeDefined();
      expect(getTierPriceId(catalog, plan, 'year')).toBeDefined();
    }
  });

  it('maps credit packs by size to their own price IDs', () => {
    expect(CREDIT_PACK_SIZES).toEqual([500, 1200, 3000]);
    expect(getPackPriceId(catalog, 500)).toBe('pri_k500');
    expect(getPackPriceId(catalog, 1200)).toBe('pri_k1200');
    expect(getPackPriceId(catalog, 3000)).toBe('pri_k3000');
    expect(getPackPriceId(catalog, 777)).toBeUndefined();
  });

  it('every price ID is distinct and PricePreview is asked about all of them', () => {
    const ids = allPriceIds(catalog);
    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
  });

  it('drops malformed or missing IDs instead of passing them to Paddle', () => {
    const partial = buildPaddleCatalog({
      STARTER_MONTHLY: 'not-a-price',
      PRO_YEARLY: '  pri_ok  ',
    });
    expect(getTierPriceId(partial, 'starter', 'month')).toBeUndefined();
    expect(getTierPriceId(partial, 'pro', 'year')).toBe('pri_ok');
    expect(allPriceIds(partial)).toEqual(['pri_ok']);
  });
});

describe('client code never contains server secrets', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
    return out;
  }

  it('no frontend source references the Paddle API key / webhook secret or embeds a key', () => {
    const files = walk(path.join(__dirname, '..', '..'));
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text).not.toMatch(/PADDLE_API_KEY/);
      expect(text).not.toMatch(/PADDLE_WEBHOOK_SECRET/);
      expect(text).not.toMatch(/pdl_(sdbx|live)_apikey/);
      expect(text).not.toMatch(/NEXT_PUBLIC_PADDLE_API/);
    }
  });
});

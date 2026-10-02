/**
 * Paddle client configuration — pure, explicit, fail-loud.
 *
 * This is a billing system: the Paddle environment is NEVER defaulted. A missing or
 * inconsistent value throws, so production code can never silently talk to sandbox (or
 * the reverse). The client-side token is public by design (Paddle.js needs it); the
 * server API key is never referenced from client code.
 */

export type PaddleEnvironment = 'sandbox' | 'production';

export class PaddleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaddleConfigError';
  }
}

export interface PaddleClientConfig {
  environment: PaddleEnvironment;
  token: string;
}

const TOKEN_PREFIX: Record<PaddleEnvironment, string> = {
  sandbox: 'test_',
  production: 'live_',
};

/**
 * Validates raw values and returns a usable config, or throws PaddleConfigError.
 * Kept pure (values passed in) so it is unit-testable; `getPaddleClientConfig` below
 * feeds it from the build-time environment.
 */
export function resolvePaddleClientConfig(raw: {
  environment?: string;
  token?: string;
}): PaddleClientConfig {
  const environment = raw.environment?.trim();
  const token = raw.token?.trim();

  if (!environment) {
    throw new PaddleConfigError(
      'NEXT_PUBLIC_PADDLE_ENVIRONMENT is not set. It must be explicitly "sandbox" or "production" — there is no default.'
    );
  }
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new PaddleConfigError(
      `NEXT_PUBLIC_PADDLE_ENVIRONMENT must be "sandbox" or "production", got "${environment}".`
    );
  }
  if (!token) {
    throw new PaddleConfigError('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set.');
  }
  // Refuse a server API key outright: it must never reach a browser bundle.
  if (token.startsWith('pdl_')) {
    throw new PaddleConfigError(
      'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN looks like a Paddle API key (pdl_…). Use the client-side token, never the API key.'
    );
  }
  const expected = TOKEN_PREFIX[environment];
  if (!token.startsWith(expected)) {
    throw new PaddleConfigError(
      `Paddle client token does not match the "${environment}" environment (expected a token starting with "${expected}").`
    );
  }

  return { environment, token };
}

/**
 * Reads the build-time public env. The `process.env.NEXT_PUBLIC_*` references must stay
 * literal so Next.js can inline them.
 */
export function getPaddleClientConfig(): PaddleClientConfig {
  return resolvePaddleClientConfig({
    environment: process.env['NEXT_PUBLIC_PADDLE_ENVIRONMENT'],
    token: process.env['NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'],
  });
}

/** Non-throwing probe for UI: returns the config or the human-readable reason it is unusable. */
export function tryGetPaddleClientConfig():
  { ok: true; config: PaddleClientConfig } | { ok: false; reason: string } {
  try {
    return { ok: true, config: getPaddleClientConfig() };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Paddle is not configured',
    };
  }
}

/**
 * Country for Paddle PricePreview, from the CDN's geo header (x-vercel-ip-country).
 *
 * Returns a value ONLY for a plausible ISO-3166 alpha-2 code. Anything else — absent
 * header, "UNKNOWN", "OTHERS", "XX", "T1", anything not two letters — returns undefined so the
 * caller OMITS the country and Paddle auto-detects from the visitor's IP. A guessed
 * country is never sent.
 */
const NON_COUNTRY_CODES = new Set([
  'XX',
  'T1',
  'ZZ',
  'AA',
  'QM',
  'QN',
  'QO',
  'QP',
  'QQ',
  'QR',
  'QS',
  'QT',
  'QU',
  'QV',
  'QW',
  'QX',
  'QY',
  'QZ',
]);

export function sanitizeCountryCode(value: string | null | undefined): string | undefined {
  const code = value?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return undefined;
  if (NON_COUNTRY_CODES.has(code)) return undefined;
  return code;
}

/** Reads the geo header from a Headers-like object. */
export function countryFromHeaders(headers: {
  get(name: string): string | null;
}): string | undefined {
  return sanitizeCountryCode(headers.get('x-vercel-ip-country'));
}

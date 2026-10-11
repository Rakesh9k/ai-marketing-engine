import { redactSecrets } from './logging';

/**
 * The pattern rules only recognise key *shapes* (AIza…, sk-…, ?key=…). The production Gemini key is a
 * different shape, so a bare occurrence in an error or log line would have slipped through. The
 * configured secret values themselves are now redacted whatever their format.
 */
// Built from parts so no scanner mistakes this synthetic value for a credential.
const SYNTHETIC = ['AQ', 'Ab8RN6', 'synthetic', 'not', 'a', 'real', 'key', '0123456789'].join('.');

describe('redactSecrets: configured secret values', () => {
  const saved = { ...process.env };
  afterEach(() => {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  });

  it('removes a configured API key even though it matches none of the known key shapes', () => {
    process.env['GEMINI_API_KEY'] = SYNTHETIC;
    const out = redactSecrets(
      `upstream said 403 for header x-goog-api-key: ${SYNTHETIC} (project 123)`
    );
    expect(out).not.toContain(SYNTHETIC);
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('project 123'); // the rest of the message is kept
  });

  it('removes every occurrence, and covers secrets, tokens and passwords as well as API keys', () => {
    process.env['PADDLE_WEBHOOK_SECRET'] = `${SYNTHETIC}.webhook`;
    process.env['SOME_SERVICE_TOKEN'] = `${SYNTHETIC}.token`;
    const out = redactSecrets(
      `${SYNTHETIC}.webhook then ${SYNTHETIC}.webhook again and ${SYNTHETIC}.token`
    );
    expect(out).not.toContain(SYNTHETIC);
    expect(out.match(/\[REDACTED\]/g)).toHaveLength(3);
  });

  it('does not touch ordinary configuration, or values too short to be a credential', () => {
    process.env['PADDLE_ENVIRONMENT'] = 'production-environment';
    process.env['TINY_API_KEY'] = 'abc';
    const text = 'PADDLE_ENVIRONMENT is production-environment; abc is fine';
    expect(redactSecrets(text)).toBe(text);
  });

  it('still applies the pattern rules', () => {
    expect(redactSecrets('GET /v1/x?key=abcdef123456&alt=json')).toBe(
      'GET /v1/x?key=[REDACTED]&alt=json'
    );
  });
});

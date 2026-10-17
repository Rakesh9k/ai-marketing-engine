/**
 * Pins the browser security policy to the approved payment architecture (Cashfree is the active gateway,
 * redirect checkout). Reads next.config.ts as text because the config is wrapped by the Sentry plugin.
 */
import { readFileSync } from 'fs';
import { describe, it, expect } from '@jest/globals';

const source = readFileSync('next.config.ts', 'utf8');
const csp = (source.match(/"(default-src[^"]*)"/) ?? [])[1] ?? '';
const directive = (name: string) =>
  (csp.split(';').find((d) => d.trim().startsWith(name + ' ')) ?? '').trim();

describe('Content-Security-Policy matches the Cashfree payment architecture', () => {
  it('allows the Cashfree SDK script and API/frame origins', () => {
    expect(directive('script-src')).toContain('https://sdk.cashfree.com');
    expect(directive('script-src')).toContain('https://apis.google.com');
    expect(directive('connect-src')).toContain('https://*.cashfree.com');
    expect(directive('connect-src')).toContain('https://*.cloudfunctions.net');
    expect(directive('connect-src')).toContain('https://www.google.com');
    expect(directive('frame-src')).toContain('https://*.cashfree.com');
    expect(directive('frame-src')).toContain('https://www.google.com');
  });

  it('keeps payment origins limited to the Cashfree allowlist', () => {
    expect(directive('script-src')).toContain('https://sdk.cashfree.com');
    expect(directive('connect-src')).toContain('https://*.cashfree.com');
    expect(directive('frame-src')).toContain('https://*.cashfree.com');
  });

  it('keeps the clickjacking and base-uri protections', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('Permissions-Policy does not whitelist a payment provider origin', () => {
    expect(source).toMatch(/payment=\(self\)/);
    expect(source).not.toMatch(/payment=\(self "https/);
  });

  it('sets Cross-Origin-Opener-Policy to same-origin-allow-popups for OAuth popups', () => {
    expect(source).toContain('same-origin-allow-popups');
  });
});

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
    expect(directive('connect-src')).toContain('https://*.cashfree.com');
    expect(directive('frame-src')).toContain('https://*.cashfree.com');
  });

  it('no longer trusts Paddle or Razorpay scripts, APIs or frames', () => {
    expect(csp).not.toMatch(/paddle/i);
    expect(csp).not.toMatch(/razorpay/i);
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
});

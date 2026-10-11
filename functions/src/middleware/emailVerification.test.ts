import { requireVerifiedEmail } from './emailVerification';

describe('requireVerifiedEmail', () => {
  it('allows a password user whose email is verified', () => {
    expect(() =>
      requireVerifiedEmail({ email_verified: true, firebase: { sign_in_provider: 'password' } })
    ).not.toThrow();
  });

  it('rejects a password user whose email is not verified', () => {
    expect(() =>
      requireVerifiedEmail({ email_verified: false, firebase: { sign_in_provider: 'password' } })
    ).toThrow(/verify your email/i);
  });

  it('allows Google users immediately, even if the claim is absent', () => {
    expect(() =>
      requireVerifiedEmail({ firebase: { sign_in_provider: 'google.com' } })
    ).not.toThrow();
  });

  it('fails closed on an empty or missing token', () => {
    expect(() => requireVerifiedEmail({})).toThrow();
    expect(() => requireVerifiedEmail(undefined)).toThrow();
  });

  it('carries a machine-readable code for the client', () => {
    try {
      requireVerifiedEmail({ firebase: { sign_in_provider: 'password' } });
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as { code: string }).code).toBe('failed-precondition');
      expect((e as { details: { code: string } }).details.code).toBe('EMAIL_NOT_VERIFIED');
    }
  });
});

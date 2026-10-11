const getByUserIdMock = jest.fn();
jest.mock('@/services/database', () => ({
  businessService: { getByUserId: (...args: unknown[]) => getByUserIdMock(...args) },
}));

import {
  decidePostAuthDestination,
  requiresEmailVerification,
  resolvePostAuthDestination,
  sanitizeRedirect,
} from './postAuthRouting';

const passwordUser = (emailVerified: boolean) =>
  ({ uid: 'u1', emailVerified, providerData: [{ providerId: 'password' }] }) as any;
const googleUser = {
  uid: 'u2',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
} as any;

describe('sanitizeRedirect', () => {
  it.each([
    ['/campaigns/new', '/campaigns/new'],
    ['/billing?plan=starter', '/billing?plan=starter'],
  ])('keeps the same-origin path %s', (input, expected) => {
    expect(sanitizeRedirect(input)).toBe(expected);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'dashboard',
    '/login',
    '/signup?x=1',
    '/verify-email',
    '/path\nwith-newline',
    '',
    null,
    undefined,
  ])('rejects %p (open-redirect / loop protection)', (input) => {
    expect(sanitizeRedirect(input as any)).toBeNull();
  });
});

describe('requiresEmailVerification', () => {
  it('is true only for an unverified password account', () => {
    expect(requiresEmailVerification(passwordUser(false))).toBe(true);
    expect(requiresEmailVerification(passwordUser(true))).toBe(false);
    expect(requiresEmailVerification(googleUser)).toBe(false);
    expect(requiresEmailVerification(null)).toBe(false);
  });
});

describe('decidePostAuthDestination', () => {
  it('sends a user with a business to the requested page, else the dashboard', () => {
    expect(decidePostAuthDestination({ hasBusiness: true, needsEmailVerification: false })).toBe(
      '/dashboard'
    );
    expect(
      decidePostAuthDestination({
        hasBusiness: true,
        needsEmailVerification: false,
        redirect: '/campaigns/new',
      })
    ).toBe('/campaigns/new');
  });

  it('never locks an existing business owner out because their email is unverified', () => {
    expect(decidePostAuthDestination({ hasBusiness: true, needsEmailVerification: true })).toBe(
      '/dashboard'
    );
  });

  it('sends a new verified user to onboarding, ignoring a requested deep link', () => {
    expect(
      decidePostAuthDestination({
        hasBusiness: false,
        needsEmailVerification: false,
        redirect: '/campaigns/new',
      })
    ).toBe('/onboarding');
  });

  it('sends a new unverified password user to verify-email first', () => {
    expect(decidePostAuthDestination({ hasBusiness: false, needsEmailVerification: true })).toBe(
      '/verify-email'
    );
  });

  it('falls back to the dashboard when the business lookup failed', () => {
    expect(decidePostAuthDestination({ hasBusiness: null, needsEmailVerification: true })).toBe(
      '/dashboard'
    );
  });

  it('ignores an unsafe redirect', () => {
    expect(
      decidePostAuthDestination({
        hasBusiness: true,
        needsEmailVerification: false,
        redirect: 'https://evil.example',
      })
    ).toBe('/dashboard');
  });
});

describe('resolvePostAuthDestination', () => {
  beforeEach(() => jest.clearAllMocks());

  it('treats an archived business as no business', async () => {
    getByUserIdMock.mockResolvedValue([{ status: 'archived', category: 'restaurant' }]);
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/onboarding');
  });

  it('routes a Google user with no business straight to onboarding (no verification step)', async () => {
    getByUserIdMock.mockResolvedValue([]);
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/onboarding');
  });

  it('routes an unverified email user with no business to verify-email', async () => {
    getByUserIdMock.mockResolvedValue([]);
    await expect(resolvePostAuthDestination(passwordUser(false))).resolves.toBe('/verify-email');
  });

  it('routes a user with an active business to the dashboard', async () => {
    getByUserIdMock.mockResolvedValue([{ status: 'active', category: 'salon' }]);
    await expect(resolvePostAuthDestination(passwordUser(false))).resolves.toBe('/dashboard');
  });

  it('does not force onboarding when the lookup fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    getByUserIdMock.mockRejectedValue(new Error('offline'));
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/dashboard');
    spy.mockRestore();
  });
});

describe('conversational onboarding flag', () => {
  const FLAG = 'NEXT_PUBLIC_ONBOARDING_V2';
  const original = process.env[FLAG];
  afterEach(() => {
    if (original === undefined) delete process.env[FLAG];
    else process.env[FLAG] = original;
  });

  it('is off by default: new owners keep getting the original wizard', async () => {
    delete process.env[FLAG];
    getByUserIdMock.mockResolvedValue([]);
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/onboarding');
  });

  it('when on, sends a new verified owner to the conversation', async () => {
    process.env[FLAG] = 'true';
    getByUserIdMock.mockResolvedValue([]);
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/onboarding/v2');
    expect(
      decidePostAuthDestination({
        hasBusiness: false,
        needsEmailVerification: false,
        conversational: true,
      })
    ).toBe('/onboarding/v2');
  });

  it('never changes the other outcomes: verification first, existing owners to the dashboard', async () => {
    process.env[FLAG] = 'true';
    getByUserIdMock.mockResolvedValue([]);
    await expect(resolvePostAuthDestination(passwordUser(false))).resolves.toBe('/verify-email');
    getByUserIdMock.mockResolvedValue([{ status: 'active', category: 'general' }]);
    await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/dashboard');
  });

  it('only the exact string "true" turns it on', async () => {
    for (const v of ['1', 'TRUE', 'yes', 'false', '']) {
      process.env[FLAG] = v;
      getByUserIdMock.mockResolvedValue([]);
      await expect(resolvePostAuthDestination(googleUser)).resolves.toBe('/onboarding');
    }
  });
});

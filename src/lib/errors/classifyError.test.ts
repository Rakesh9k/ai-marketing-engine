import { classifyError, describeError } from './classifyError';

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

describe('classifyError', () => {
  beforeEach(() => setOnline(true));
  afterAll(() => setOnline(true));

  describe('offline (only with positive evidence)', () => {
    it('is offline when the browser reports no connection, whatever the error is', () => {
      setOnline(false);
      expect(classifyError(new Error('anything'))).toBe('offline');
      expect(classifyError({ code: 'functions/internal' })).toBe('offline');
    });

    it.each([
      ['Firebase Auth network failure', { code: 'auth/network-request-failed', message: 'x' }],
      ['fetch TypeError', Object.assign(new TypeError('Failed to fetch'), {})],
      [
        'Firestore client offline',
        { code: 'unavailable', message: 'Failed to get document because the client is offline.' },
      ],
      ['Safari fetch failure', new TypeError('Load failed')],
    ])('detects %s', (_label, error) => {
      expect(classifyError(error)).toBe('offline');
    });

    it('does NOT call a server-side "unavailable" offline while the browser is online', () => {
      expect(
        classifyError({ code: 'functions/unavailable', message: 'The service is unavailable.' })
      ).toBe('server');
    });
  });

  it.each([
    ['functions/unauthenticated', 'auth'],
    ['functions/permission-denied', 'auth'],
    ['auth/invalid-credential', 'auth'],
    ['auth/requires-recent-login', 'auth'],
    ['functions/invalid-argument', 'validation'],
    ['functions/failed-precondition', 'validation'],
    ['functions/not-found', 'validation'],
    ['functions/resource-exhausted', 'rate_limit'],
    ['auth/too-many-requests', 'rate_limit'],
    ['functions/internal', 'server'],
    ['functions/deadline-exceeded', 'server'],
    ['functions/unavailable', 'server'],
  ])('maps %s to %s', (code, kind) => {
    expect(classifyError({ code, message: 'm' })).toBe(kind);
  });

  it.each([
    [{ status: 401 }, 'auth'],
    [{ status: 403 }, 'auth'],
    [{ status: 400 }, 'validation'],
    [{ status: 422 }, 'validation'],
    [{ status: 429 }, 'rate_limit'],
    [{ status: 500 }, 'server'],
    [{ status: 503 }, 'server'],
  ])('maps HTTP %j to %s', (error, kind) => {
    expect(classifyError(error)).toBe(kind);
  });

  it('returns unknown for unrecognised, empty or non-object errors', () => {
    expect(classifyError(new Error('boom'))).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
    expect(classifyError(null)).toBe('unknown');
    expect(classifyError(42)).toBe('unknown');
    expect(classifyError({})).toBe('unknown');
  });

  it('does not treat a generic failure as offline', () => {
    const kinds = ['functions/internal', 'functions/invalid-argument', 'auth/wrong-password'].map(
      (code) => classifyError({ code })
    );
    expect(kinds).not.toContain('offline');
  });
});

describe('describeError copy', () => {
  beforeEach(() => setOnline(true));

  it('names the interrupted action, that the user is offline, and what to do', () => {
    setOnline(false);
    const copy = describeError(new Error('x'), 'start this campaign', { workKept: true });
    expect(copy.kind).toBe('offline');
    expect(copy.retryable).toBe(true);
    expect(copy.message).toContain('offline');
    expect(copy.message).toContain('start this campaign');
    expect(copy.message).toContain('Your details are still here');
    expect(copy.message).toContain('Reconnect and try again');
  });

  it('only promises preserved work when the caller says it is preserved', () => {
    setOnline(false);
    expect(describeError(new Error('x'), 'save').message).not.toContain('still here');
  });

  it('gives each category distinct copy, and never blames the connection for server errors', () => {
    const kinds = {
      server: describeError({ code: 'functions/internal' }, 'save'),
      auth: describeError({ code: 'functions/unauthenticated' }, 'save'),
      rate: describeError({ code: 'functions/resource-exhausted' }, 'save'),
      validation: describeError({ code: 'functions/invalid-argument' }, 'save'),
      unknown: describeError(new Error('boom'), 'save'),
    };
    expect(new Set(Object.values(kinds).map((c) => c.message)).size).toBe(5);
    expect(kinds.server.message).toContain('Our servers had a problem');
    expect(kinds.server.message).not.toMatch(/offline/i);
    expect(kinds.auth.retryable).toBe(false);
    expect(kinds.auth.message).toContain('sign in again');
    expect(kinds.rate.message).toContain('Wait a minute');
    expect(kinds.validation.retryable).toBe(false);
    expect(kinds.unknown.message).not.toMatch(/something went wrong/i);
  });
});

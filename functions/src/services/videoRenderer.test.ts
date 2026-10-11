/**
 * behavior: a deployed environment with no REEL_RENDERER_URL must fail loudly instead of
 * producing a fake reel; the mock renderer is reachable only from the emulator or tests.
 */
const ORIGINAL_ENV = { ...process.env };

function loadWithEnv(env: Record<string, string | undefined>) {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: 'test-project' };
  delete process.env['REEL_RENDERER_URL'];
  delete process.env['FUNCTIONS_EMULATOR'];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./videoRenderer') as typeof import('./videoRenderer');
}

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getVideoRenderer', () => {
  it('throws in a deployed environment with no REEL_RENDERER_URL (never a mock)', () => {
    const { getVideoRenderer } = loadWithEnv({ NODE_ENV: 'production', JEST_WORKER_ID: undefined });
    expect(() => getVideoRenderer()).toThrow(/REEL_RENDERER_URL is not configured/);
  });

  it('uses the real Cloud Run renderer whenever a URL is configured', () => {
    const { getVideoRenderer, DevMockVideoRenderer } = loadWithEnv({
      NODE_ENV: 'production',
      REEL_RENDERER_URL: 'https://renderer.example.com',
    });
    expect(getVideoRenderer()).not.toBeInstanceOf(DevMockVideoRenderer);
  });

  it('allows the mock only in the emulator', () => {
    const { getVideoRenderer, DevMockVideoRenderer } = loadWithEnv({
      NODE_ENV: 'development',
      FUNCTIONS_EMULATOR: 'true',
    });
    expect(getVideoRenderer()).toBeInstanceOf(DevMockVideoRenderer);
  });
});

describe('CloudRunVideoRenderer timeouts', () => {
  it('passes an abort signal so a hung renderer fails (and gets refunded) instead of hanging', async () => {
    jest.resetModules();
    jest.doMock('google-auth-library', () => ({
      GoogleAuth: class {
        getIdTokenClient() {
          return Promise.resolve({
            getRequestHeaders: () => Promise.resolve({ authorization: 'Bearer t' }),
          });
        }
      },
    }));
    const fetchMock = jest.fn().mockRejectedValue(
      Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'TimeoutError',
      })
    );
    const original = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CloudRunVideoRenderer, RENDER_TIMEOUT_MS } =
        require('./videoRenderer') as typeof import('./videoRenderer');
      const renderer = new CloudRunVideoRenderer('https://renderer.example.com');
      await expect(renderer.renderReel({} as never)).rejects.toThrow(/timeout/i);
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(RENDER_TIMEOUT_MS).toBeLessThan(540_000); // below generateReel's own function timeout
    } finally {
      global.fetch = original;
      jest.dontMock('google-auth-library');
    }
  });
});

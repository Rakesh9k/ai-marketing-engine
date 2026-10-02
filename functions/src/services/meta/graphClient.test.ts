import { MetaGraphClient, MetaGraphError } from './graphClient';

describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new MetaGraphClient();
    process.env['META_APP_ID'] = 'test-app-id';
    process.env['META_APP_SECRET'] = 'test-app-secret';
    process.env['META_GRAPH_API_VERSION'] = 'v20.0';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env['META_APP_ID'];
    delete process.env['META_APP_SECRET'];
  });

  it('exchanges code for token successfully', async () => {
    const mockTokenResp = {
      access_token: 'short-lived-token-123',
      token_type: 'bearer',
      expires_in: 3600,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTokenResp),
    } as any);

    const result = await client.exchangeCodeForToken('auth-code', 'https://app.com/callback');
    expect(result.access_token).toBe('short-lived-token-123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('oauth/access_token'),
      expect.anything()
    );
  });

  it('throws MetaGraphError on code exchange failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        error: { message: 'Invalid authorization code', code: 100 },
      }),
    } as any);

    await expect(
      client.exchangeCodeForToken('bad-code', 'https://app.com/callback')
    ).rejects.toThrow(MetaGraphError);
  });

  it('fetches user pages correctly', async () => {
    const mockPagesResp = {
      data: [
        {
          id: 'page-101',
          name: 'Hyderabad Biryani House',
          access_token: 'page-access-token-1',
          instagram_business_account: { id: 'ig-999' },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockPagesResp),
    } as any);

    const pages = await client.getUserPages('user-access-token');
    expect(pages).toHaveLength(1);
    expect(pages[0]!.id).toBe('page-101');
    expect(pages[0]!.instagram_business_account?.id).toBe('ig-999');
  });

  it('fetches Instagram account details', async () => {
    const mockIgResp = {
      id: 'ig-999',
      username: 'hydbiryani',
      name: 'Hyderabad Biryani House',
      account_type: 'BUSINESS',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockIgResp),
    } as any);

    const ig = await client.getInstagramAccount('ig-999', 'page-token');
    expect(ig).not.toBeNull();
    expect(ig?.username).toBe('hydbiryani');
    expect(ig?.account_type).toBe('BUSINESS');
  });
});

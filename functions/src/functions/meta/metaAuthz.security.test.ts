import { v4 as uuidv4 } from 'uuid';
import * as firestore from '../../services/firestore';
import { initiateMetaOAuth } from './initiateMetaOAuth';
import { getPendingMetaPages } from './getPendingMetaPages';
import { selectMetaPage } from './selectMetaPage';
import { listSocialConnections } from './listSocialConnections';
import { disconnectMetaConnection } from './disconnectMetaConnection';

jest.mock('../../middleware/auth', () => ({
  verifyBusinessAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../middleware/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/analyticsService', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
}));

function callableRequest(data: unknown, uid?: string) {
  return { data, auth: uid ? { uid, token: {} as any } : undefined } as any;
}

describe('Meta Security & Authorization Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['META_APP_ID'] = 'test-app-id';
    process.env['META_APP_SECRET'] = 'test-app-secret';
    process.env['META_TOKEN_ENCRYPTION_KEY'] = 'test-enc-key-32-chars-long-secret!';
  });

  afterEach(() => {
    delete process.env['META_APP_ID'];
    delete process.env['META_APP_SECRET'];
    delete process.env['META_TOKEN_ENCRYPTION_KEY'];
  });

  it('rejects unauthenticated calls across all Meta callables', async () => {
    await expect((initiateMetaOAuth as any).run(callableRequest({}))).rejects.toThrow(
      /authentication/i
    );
    await expect(
      (getPendingMetaPages as any).run(callableRequest({ stateId: 's1' }))
    ).rejects.toThrow(/authentication/i);
    await expect(
      (selectMetaPage as any).run(callableRequest({ stateId: 's1', selectedPageId: 'p1' }))
    ).rejects.toThrow(/authentication/i);
    await expect((listSocialConnections as any).run(callableRequest({}))).rejects.toThrow(
      /authentication/i
    );
    await expect(
      (disconnectMetaConnection as any).run(callableRequest({ connectionId: 'c1' }))
    ).rejects.toThrow(/authentication/i);
  });

  it('SECURITY: User B cannot retrieve candidate pages belonging to User A session', async () => {
    const stateId = uuidv4();
    const mockSession = {
      stateId,
      userId: 'user-A',
      pages: [{ pageId: 'p1', pageName: 'User A Page' }],
      userAccessToken: 'u-secret-token',
      pageAccessTokens: { p1: 'p-secret-token' },
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };

    jest.spyOn(firestore, 'getPendingPageSelectionSession').mockResolvedValue(mockSession as any);

    const request = callableRequest({ stateId }, 'user-B');
    await expect((getPendingMetaPages as any).run(request)).rejects.toThrow(/not authorized/i);
  });

  it('SECURITY: User B cannot finalize page selection for User A session', async () => {
    const stateId = uuidv4();
    const mockSession = {
      stateId,
      userId: 'user-A',
      pages: [{ pageId: 'p1', pageName: 'User A Page' }],
      userAccessToken: 'u-secret-token',
      pageAccessTokens: { p1: 'p-secret-token' },
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };

    jest.spyOn(firestore, 'getPendingPageSelectionSession').mockResolvedValue(mockSession as any);

    const request = callableRequest({ stateId, selectedPageId: 'p1' }, 'user-B');
    await expect((selectMetaPage as any).run(request)).rejects.toThrow(/not authorized/i);
  });

  it('SECURITY: User B cannot disconnect User A connection', async () => {
    const mockConn = {
      connectionId: 'meta_p1',
      userId: 'user-A',
      status: 'active',
    };

    jest.spyOn(firestore, 'getSocialConnectionDoc').mockResolvedValue(mockConn as any);

    const request = callableRequest({ connectionId: 'meta_p1' }, 'user-B');
    await expect((disconnectMetaConnection as any).run(request)).rejects.toThrow(/not authorized/i);
  });

  it('SECURITY: Return payloads from listSocialConnections never contain access tokens or credentials', async () => {
    const mockConns = [
      {
        connectionId: 'meta_p1',
        userId: 'user-A',
        provider: 'meta',
        status: 'active',
        facebookPage: { id: 'p1', name: 'Hyderabad Biryani' },
        instagram: { id: 'ig1', username: 'hydbiryani' },
        permissions: ['pages_show_list'],
        tokenReference: 'meta_p1',
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    jest.spyOn(firestore, 'listSocialConnectionsByUser').mockResolvedValue(mockConns as any);

    const request = callableRequest({}, 'user-A');
    const result = await (listSocialConnections as any).run(request);

    expect(result.connections).toHaveLength(1);
    const conn = result.connections[0];

    expect(conn.userAccessToken).toBeUndefined();
    expect(conn.pageAccessToken).toBeUndefined();
    expect(conn.accessToken).toBeUndefined();
    expect(conn.appSecret).toBeUndefined();
    expect(conn.token).toBeUndefined();
  });
});
